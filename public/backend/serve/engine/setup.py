from selenium import webdriver
from selenium.webdriver.common.by import By


def generate_driver():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("log-level=3")
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-infobars")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-notifications")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36")
    prefs = {
        "profile.default_content_setting_values.notifications": 2,  # 1: Allow, 2: Block
        "profile.default_content_setting_values.popups": 2,          # 1: Allow, 2: Block
        "profile.managed_default_content_settings.images": 2
    }
    options.add_experimental_option("prefs", prefs)
    options.page_load_strategy = 'eager'
    driver = webdriver.Chrome(options=options)
    # Intercept and block media requests
    driver.execute_cdp_cmd("Network.setBlockedURLs", {"urls": ["*.mp3", "*.mp4"]})
    driver.execute_cdp_cmd("Network.enable", {})
    # driver.set_page_load_timeout(30)
    # driver = webdriver.PhantomJS(executable_path="./phantomjs/bin/phantomjs.exe")
    return driver
