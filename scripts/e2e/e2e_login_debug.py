#!/usr/bin/env python3
"""Debug login form submission."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})

    api_calls = []
    def on_request(req):
        api_calls.append(f">> {req.method} {req.url}")
    def on_response(resp):
        try:
            body = resp.text()[:200]
        except:
            body = ""
        api_calls.append(f"<< {resp.status} {resp.url}: {body}")
    page.on("request", on_request)
    page.on("response", on_response)

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:8081/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    print(f"URL: {page.url}")

    # Fill form
    page.locator('input[type="text"]').fill("13800138001")
    page.locator('input[type="password"]').fill("admin123")

    # Try clicking the button
    page.locator("button").click()
    page.wait_for_timeout(5000)

    print(f"URL after click: {page.url}")

    # Check for toast/message
    # Try to find any visible text
    body = page.locator("body").inner_text()
    print(f"Body text: {body[:300]}")

    print(f"\nAPI calls:")
    for c in api_calls:
        print(f"  {c}")

    print(f"\nConsole logs:")
    for log in console_logs:
        print(f"  {log}")

    # Try with Enter key
    page.locator('input[type="text"]').fill("")
    page.locator('input[type="text"]').fill("13800138001")
    page.keyboard.press("Enter")
    page.wait_for_timeout(3000)

    print(f"\nURL after Enter: {page.url}")
    body = page.locator("body").inner_text()
    print(f"Body after Enter: {body[:300]}")

    for c in api_calls:
        print(f"  {c}")

    page.screenshot(path="/tmp/login_debug.png")
    browser.close()
