from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
# from runner import process
from .setup import generate_driver
from .utils import form_url, get_req_data
from threading import Thread
import queue
import time
import json
import signal

START_TIME = time.time()

INCLUDE_ALL_PAGES = False 
INCLUDE_MAIL_TO = False 
stop_threads = False

data_store = {}

def run(site_repo, output_queue, batch, t):
    chrome_headless = generate_driver()
    o_df_index = list(site_repo.keys())
    o_df_value = list(site_repo.values())
    global stop_threads
    try:
        for index, value in zip(o_df_index, o_df_value):
            if stop_threads:
                output_queue.put(
                    f"data: {json.dumps({'type': 'info', 'message': 'Thread stopping requested', 'id': f'{str(index)}', 'batch': str(batch), 'thread': str(t)})}\n\n"
                )
                break

            primary_email = ""
            secondary_email = ""
            facebook_url = ""
            contact_us_url = ""
            try:
                primary_email, secondary_email, facebook_url, contact_us_url = get_req_data(
                    chrome_headless, form_url(value), include_all_pages=INCLUDE_ALL_PAGES, include_mail_to=INCLUDE_MAIL_TO)
            except Exception as e:
                output_queue.put(
                    f"data: {json.dumps({'type': 'error', 'message': str(e), 'id': f'{str(index)}', 'batch': str(batch), 'thread': str(t)})}\n\n"
                )
            formatted_data = {
                "type": "success",
                "data": {
                    "primary_email": primary_email,
                    "secondary_email": secondary_email,
                    "facebook_url": facebook_url,
                    "contact_us_url": contact_us_url,
                    "website": form_url(value)
                }
            }
            output_queue.put(
                f"data: {json.dumps({'type': 'success', 'data': formatted_data, 'id': f'{str(index)}', 'batch': str(batch), 'thread': str(t)})}\n\n"
            )
    except Exception as e:
        output_queue.put(
            f"data: {json.dumps({'type': 'error', 'message': str(e), 'id': f'{str(index)}', 'batch': str(batch), 'thread': str(t)})}\n\n"
        )
    finally:
        output_queue.put(
            f"data: {json.dumps({'batch': str(batch), 'type': 'stop', 'thread': str(t)})}\n\n")
        chrome_headless.quit()


def process(data):
    # o_df = read_form_source_excel("./File 54.xlsx")
    global stop_threads
    site_repo = data["urls"]
    batch = data["batch"]
    threads = []
    output_queue = queue.Queue()

    for i, t in enumerate(site_repo.keys()):
        thread = Thread(target=run,
                        args=(site_repo[t], output_queue, batch, t))
        threads.append(thread)
        thread.start()

    # Yielding the output of each thread
    while any(thread.is_alive()
              for thread in threads) or not output_queue.empty():
        if stop_threads:
            print("Stop thread is true >>>>!")
            break
        try:
            yield output_queue.get(timeout=0)

        except queue.Empty:
            continue

    for thread in threads:
        thread.join()

    yield  f"data: {json.dumps({'type': 'command', 'message': 'completed', 'batch': batch})}\n\n"

if __name__ == "__main__":
    data = {
        "batch": 0,
        "urls": {
            "thread1": {
                "1": "peachmarketplace.com",
                "3": "peachmedical.com",
                "5": "peachmode.com",
                "7": "peachmcintyre.com",
                "9": "peachmeleggings.com",
            },
            "thread2": {
                "2": "peachmcintyre.com",
                "4": "peachmeleggings.com",
                "6": "peachmarketplace.com",
                "8": "peachmedical.com",
            }
        }
    }
    print("STARTED at", START_TIME)
    for output in process(data):
        print(output)
    print("ENDED at", time.time())
    print("TOTAL TIME TAKEN", time.time() - START_TIME)


stream_routers = APIRouter(prefix="/stream_data", tags=["stream"])


def load_request(request_id: str):
    return data_store[request_id]

@stream_routers.post("/set_request")
async def set_request(data: dict):
    if data["request_id"] not in data_store:
        data_store[data["request_id"]] = data
        # print('data_store >>', data_store)
    return JSONResponse({"type": "success", "message": "Request ID set successfully"})

@stream_routers.get("/get_request/{request_id}")
async def get_request(request_id: str):
    # print("data store>>", data_store)
    global stop_threads
    try:
        data = load_request(request_id)
        print('data >>',data)
        pro_data = process(data["data"])
        # del data_store[request_id]
        stop_threads = False
        return StreamingResponse(pro_data, media_type="text/event-stream")
    except Exception as e:
        print("exception >", e)
        return JSONResponse({"type": "failed", "message": f"Invalid request ID [The request has been expired] {e}"}, status_code=404)

# Signal handler function to stop threads
def signal_handler(sig, frame):
    global stop_threads
    print(f"Received signal: {sig}. Stopping threads...")
    stop_threads = True

# Register signal handlers for SIGINT and SIGTERM
signal.signal(signal.SIGINT, signal_handler)  # Handling Ctrl+C
signal.signal(signal.SIGTERM, signal_handler)  # Handling termination

@stream_routers.get("/stop_threads")
async def stop_threads():
    global stop_threads
    stop_threads = True  # Signal threads to stop
    return {"message": "Threads stopping initiated!"}

@stream_routers.get("/ping")
async def ping():
    return {"message": "end_point available"}