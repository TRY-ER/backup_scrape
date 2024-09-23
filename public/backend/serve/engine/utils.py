import requests
from bs4 import BeautifulSoup
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium import webdriver
from urllib.parse import urljoin, urlparse
import re
import time
from selenium.common.exceptions import StaleElementReferenceException
import os
import os
from .key_words import path_keywords
from .setup import generate_driver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException, NoSuchElementException, ElementClickInterceptedException, WebDriverException

MAX_RETRIES = 2
DISABLE_TIME_LOG = True
MAX_WAIT_TIME = 30 
MAX_WAIT_TIME_NESTED = 20 


def measure_time(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()  # Record the start time
        result = func(*args, **kwargs)  # Call the function
        end_time = time.time()  # Record the end time
        execution_time = end_time - start_time  # Calculate the execution time
        if not DISABLE_TIME_LOG:
            print(
                f"Function '{func.__name__}' executed in {execution_time:.4f} seconds"
            )
        return result  # Return the result of the function

    return wrapper


@measure_time
def find_facebook_urls(html_content):
    # Compile a regex pattern for matching Facebook URLs
    facebook_url_pattern = re.compile(
        r'https?://(?:www\.)?facebook\.com/[^\s"]+')

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Extract all href attributes from <a> tags
    links = soup.find_all('a', href=True)
    facebook_urls = []

    for link in links:
        href = link['href']
        if facebook_url_pattern.match(href):
            facebook_urls.append(href)

    return facebook_urls


def get_contactus_url(paths):
    for path in paths:
        if "contact" in path.lower() and "@" not in path.lower():
            return path
    return None


@measure_time
def form_url(url: str):
    if url.startswith("http"):
        return url.strip()
    else:
        return "http://" + url.strip()


# @measure_time
def clean_full_urls(url):
    url = url.replace("http://", "")
    url = url.replace("https://", "")
    url = url.replace("www.", "")
    return url


@measure_time
def get_all_paths(base_url, paths):
    # the driver has to be loaded with the URL prior
    all_paths = []
    for link in paths:
        full_url = urljoin(base_url, link)
        # print('full url>>', full_url)
        # print('link >>', link)
        if clean_full_urls(base_url) in full_url:
            all_paths.append(full_url)
    return list(set(all_paths))


@measure_time
def extract_emails_from_text(text):
    # Updated regex pattern to find email addresses with optional spaces around '@'
    email_pattern = r'[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'

    # Find all emails in the text
    emails = re.findall(email_pattern, text)

    # Clean up the emails by removing spaces and converting to lowercase
    cleaned_emails = [email.replace(' ', '').lower() for email in emails]

    # Remove duplicates and filter out emails that are inside <a> tags
    filtered_emails = list(set(cleaned_emails))
    main_emails = []

    for email in filtered_emails:
        # File extensions that should be ignored
        file_extensions = [
            '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.JPG', '.heic'
        ]
        # Append emails that don't end with unwanted extensions
        if not any(email.endswith(ext) for ext in file_extensions):
            main_emails.append(email)

    return main_emails


@measure_time
def find_tt_links(driver, return_paths=False):
    body_element = driver.find_element(By.TAG_NAME, "body")
    body_text = body_element.get_attribute("innerHTML")

    mail_to_emails = []

    # print("body text >>", body_text)

    # Regular expression to match href values
    href_pattern = r'href=["\'](.*?)["\']'

    email_href_pattern = r'href=["\'](mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})).*?["\']'

    # Find all matches for the pattern in the html_content
    email_hrefs = re.findall(email_href_pattern, body_text)

    hrefs = re.findall(href_pattern, body_text)

    # print("hrefs >>", hrefs)

    for href in email_hrefs:
        email_re = href[0]
        email = email_re.replace("mailto:", "")
        mail_to_emails.append(email.split("?")[0])

    no_comments_text = re.sub(r"<!--.*?-->", "", body_text, flags=re.DOTALL)

    facebook_urls = find_facebook_urls(no_comments_text)
    html_without_scripts_and_styles = re.sub(
        r'(?is)<(script|style).*?>.*?</\1>', '', no_comments_text)

    # print("no comment text >>", no_comments_text)
    visible_text_content_mod = re.findall(r'>\s*([^<]+?)\s*<',
                                          html_without_scripts_and_styles)
    # visible_text_content = re.findall(r">([^<]+)<", no_comments_text)
    # print("visible_text_content", visible_text_content)
    # Filter and clean extracted visible content
    # visible_text_content = [text.strip() for text in visible_text_content if text.strip()]
    visible_text_content = body_element.text.strip()
    # visible_text_content = driver.execute_script(
    #     "return arguments[0].textContent;", body_element)
    # visible_text_content = driver.execute_script(
    #     """
    # var element = arguments[0];
    # var text = "";
    # function traverse(node) {
    #     if (node.nodeType === Node.TEXT_NODE) {
    #         text += node.textContent.trim() + " ";
    #     }
    #     if (node.nodeType === Node.ELEMENT_NODE) {
    #         for (var i = 0; i < node.childNodes.length; i++) {
    #             traverse(node.childNodes[i]);
    #         }
    #     }
    # }
    # traverse(element);
    # return text.trim();
    # """, body_element)
    # print("visible text content >>", visible_text_content)
    # print("visible text content mod >>", visible_text_content_mod)

    if return_paths:
        return visible_text_content, facebook_urls, hrefs, list(set(mail_to_emails))
    return visible_text_content, facebook_urls, list(set(mail_to_emails))


@measure_time
def filter_addresses(paths, include_all_pages = False):
    triger_strs = path_keywords
    matched = []
    unmatched = []
    if include_all_pages:
        return paths, unmatched
    for path in paths:
        if any(trigger in path.lower() for trigger in triger_strs):
            matched.append(path)
        else:
            unmatched.append(path)
    return matched, unmatched


@measure_time
def iter_sub_paths(url, driver, prev_emails: list, paths, include_all_pages, include_mail_to):
    res_emails = prev_emails
    res_emails_repr = [email + f" [{url}]" for email in prev_emails]
    all_paths = get_all_paths(base_url=url, paths=paths)
    # print("all paths >>", all_paths)
    matched, unmatched = filter_addresses(all_paths, include_all_pages)
    # print("matched>>", matched)
    facebook_urls = []
    for path in matched:

        driver.get(form_url(path))
        WebDriverWait(driver, MAX_WAIT_TIME_NESTED).until(lambda driver: driver.execute_script(
            "return document.readyState") == "complete")
        # time.sleep(2)
        scroll_to_bottom(driver)
        nest_text, facebook_urls, mail_to_emails = find_tt_links(driver=driver)
        # print("url", path)
        # print("nest_text", nest_text)
        emails = extract_emails_from_text(nest_text)
        if include_mail_to:
            for mail in mail_to_emails:
                if mail not in emails:
                    emails.append(mail)
        if len(emails) > 0:
            for email in emails:
                if email not in res_emails:
                    res_emails.append(email)
                    res_emails_repr.append(email + f" [{path}]")
                if len(res_emails) >= 2:
                    return res_emails, res_emails_repr, facebook_urls
        if len(emails) >= 2:
            break
    return res_emails, res_emails_repr, facebook_urls


@measure_time
def get_url(driver, url):
    driver.get(url)


def scroll_to_bottom(driver):
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        # Scroll to the bottom
        driver.execute_script(
            "window.scrollTo(0, document.body.scrollHeight);")
        # Wait to load the page
        time.sleep(0.5)  # Adjust this time as needed for content to load

        # Calculate new scroll height and compare with last scroll height
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            # If the height hasn't changed, assume all content has loaded
            break
        last_height = new_height


@measure_time
def get_req_data(chrome_headless, url, include_all_pages = False, include_mail_to = False):
    facebook_url = ""
    contact_us_url = ""
    email_repr = []
    primary_email, secondary_email = "", ""
    # chrome_headless.get(url)
    try:
        get_url(chrome_headless, url)
        time.sleep(3)
        WebDriverWait(chrome_headless,
                      MAX_WAIT_TIME).until(lambda driver: chrome_headless.execute_script(
                          "return document.readyState") == "complete")
        scroll_to_bottom(chrome_headless)
        time.sleep(1)
        for attempt in range(MAX_RETRIES):
            try:
                master_text, facebook_urls, paths, mail_to_emails  = find_tt_links(
                    driver=chrome_headless, return_paths=True)
                # print("master text >>", master_text)
                # print("paths >>", paths)
                base_emails = extract_emails_from_text(master_text)
                if include_mail_to: 
                    for mail in mail_to_emails:
                        if mail not in base_emails:
                            base_emails.append(mail)
                # print('base emails >>', base_emails)
                contact_us_url = get_contactus_url(paths) if get_contactus_url(
                    paths) else ""
                contact_us_url = urljoin(
                    url, contact_us_url) if contact_us_url != "" else ""
                email_repr = [email + f" [{url}]" for email in base_emails]
                # print("base emails>>", base_emails)
                if len(email_repr) < 2:
                    nest_emails, nest_emails_repr, nest_facebook_urls = iter_sub_paths(
                        url, chrome_headless, base_emails, paths, include_all_pages, include_mail_to)
                    # print('nest emails >>', nest_emails)
                    for email in nest_emails_repr:
                        if email not in email_repr:
                            email_repr.append(email)
                    # facebook_urls.extend(nest_facebook_urls)
                for i, email in enumerate(email_repr):
                    if i == 0:
                        primary_email = email
                    elif i == 1:
                        secondary_email = email
                    else:
                        break
                facebook_url = facebook_urls[0] if len(
                    facebook_urls) > 0 else ""
                break
            except StaleElementReferenceException:
                if attempt < MAX_RETRIES - 1:
                    continue
                else:
                    break
            except Exception as e:
                print(f"Error for {url} in main component >>", e)

    except TimeoutException:
        primary_email, secondary_email, facebook_url, contact_us_url = "timeout", "timeout", "timeout", "timeout"

    except WebDriverException:
        primary_email, secondary_email, facebook_url, contact_us_url = "check address", "check address", "check address", "check address"

    return primary_email, secondary_email, facebook_url, contact_us_url


def merge_csv(file_path):
    import pandas as pd
    df = pd.DataFrame()
    for file in os.listdir(file_path):
        if file.endswith(".csv"):
            df = pd.concat([df, pd.read_csv(os.path.join(file_path, file))])
    df.to_csv("combined.csv", index=False)


if __name__ == "__main__":
    # driver = webdriver.Chrome()
    website = "https://www.peachmedical.com"
    driver = generate_driver()
    values = get_req_data(driver, website)
    # print("data>>" , values)
