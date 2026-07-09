"""
One-time Amazon login to unlock review scraping.

Run this on a machine WITH a screen (your Mac), log into Amazon in the window
that opens, then press Enter here. It saves amazon_state.json (your session
cookies). Upload that file to the VM's scraper-service/ folder and reviews work.

    pip install playwright && playwright install chromium
    python login.py                 # opens a browser, log in, press Enter
    # -> creates amazon_state.json

The session lasts weeks. Re-run only when reviews start coming back empty.
"""

from playwright.sync_api import sync_playwright

OUT = "amazon_state.json"

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False)
    ctx = browser.new_context(locale="en-US")
    page = ctx.new_page()
    page.goto("https://www.amazon.com/ap/signin", wait_until="domcontentloaded")
    print("\n>>> Log into Amazon in the browser window (email, password, any OTP).")
    input(">>> When you see you are logged in, come back here and press Enter...")
    ctx.storage_state(path=OUT)
    print(f"\nSaved session to {OUT}. Upload it to the VM: scraper-service/{OUT}")
    browser.close()
