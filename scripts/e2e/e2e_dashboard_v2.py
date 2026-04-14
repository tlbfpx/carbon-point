#!/usr/bin/env python3
"""Check Dashboard login page structure."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    # Capture network requests/responses
    failed_requests = []
    def on_response(response):
        if response.status >= 400:
            failed_requests.append(f"{response.status} {response.url}")
    page.on("response", on_response)

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    print("=== Dashboard URL with trailing slash ===")
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")
    html = page.content()
    print(f"HTML length: {len(html)}")
    print(f"\nHTML snippet:\n{html[:1000]}")

    print(f"\nFailed requests ({len(failed_requests)}):")
    for r in failed_requests[:10]:
        print(f"  {r}")

    print(f"\nConsole logs:")
    for log in console_logs[:10]:
        print(f"  {log}")

    page.screenshot(path="/tmp/dashboard_debug.png", full_page=True)
    browser.close()
