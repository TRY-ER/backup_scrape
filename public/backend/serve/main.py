from fastapi import FastAPI, APIRouter
from engine import stream_routers
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys

# Some Important Global Variable
DEV_MODE = False

# Create the app instance
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Including routers
# app.include_router(job_router)
# app.include_router(control_router)
app.include_router(stream_routers)

# Running the server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
