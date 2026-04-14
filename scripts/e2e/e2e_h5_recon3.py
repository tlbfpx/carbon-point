#!/usr/bin/env python3
"""Try root URL and check for JS errors."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page_errors = []
    def on_page_error(err):
        page_errors.append(str(err))
    page.on("pageerror", on_page_error)

    print("=== Trying root URL ===")
    page.goto("http://localhost:8081/")
    page.wait_for_timeout(8000)

    print(f"Title: {page.title()}")
    print(f"URL: {page.url}")
    html = page.content()
    print(f"HTML length: {len(html)}")

    print(f"\n=== Console Logs ({len(console_logs)}) ===")
    for log in console_logs:
        print(f"  {log}")

    print(f"\n=== Page Errors ({len(page_errors)}) ===")
    for err in page_errors:
        print(f"  {err}")

    # Check if root div has content
    root_div = page.locator("#root")
    inner = root_div.inner_html()
    print(f"\n#root innerHTML length: {len(inner)}")
    print(f"#root innerHTML: {inner[:500]}")

    page.screenshot(path="/tmp/h5_root.png", full_page=True)
    print("\nScreenshot saved to /tmp/h5_root.png")

    browser.close()
