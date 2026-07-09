"""
Keeps the Amazon session alive so review scraping never silently breaks.
Runs on a schedule (systemd timer). Loads the saved session, touches Amazon to
refresh the cookies, and re-persists the storage_state (Amazon rotates
session-token on each request, so re-saving extends the session's life).

If the session has expired, it logs SESSION_EXPIRED. The scraper degrades
gracefully in that case (product data still works; review text just goes empty
until the session is re-captured), so nothing on production ever breaks.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, "amazon_state.json")

if not os.path.exists(STATE):
    print("keepalive: no session file, skipping")
    sys.exit(0)

try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print(f"keepalive: playwright unavailable ({e})")
    sys.exit(0)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

logged = False
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        ctx = b.new_context(storage_state=STATE, locale="en-US", user_agent=UA)
        page = ctx.new_page()
        page.goto("https://www.amazon.com/", wait_until="domcontentloaded", timeout=30000)
        lbl = page.query_selector("#nav-link-accountList")
        txt = ((lbl.inner_text() if lbl else "") or "").lower()
        logged = "sign in" not in txt and ("hello" in txt or "account" in txt)
        # a little authenticated activity keeps the session warm
        try:
            page.goto("https://www.amazon.com/gp/css/homepage.html", wait_until="domcontentloaded", timeout=30000)
        except Exception:
            pass
        # re-persist refreshed cookies
        ctx.storage_state(path=STATE)
        b.close()
except Exception as e:
    print(f"keepalive: error {e}")
    sys.exit(0)

print("keepalive: logged_in" if logged else "keepalive: SESSION_EXPIRED (re-capture with login)")
