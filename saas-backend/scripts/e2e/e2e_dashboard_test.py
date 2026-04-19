#!/usr/bin/env python3
"""Check Dashboard login and find test accounts."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    api_calls = []
    def on_request(request):
        if "/api/" in request.url:
            api_calls.append(f">> {request.method} {request.url}")
    def on_response(response):
        if "/api/" in response.url:
            body = response.text() if response.status < 500 else "500 ERROR"
            api_calls.append(f"<< {response.status} {response.url}: {body[:300]}")
    page.on("request", on_request)
    page.on("response", on_response)

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    print("=== Dashboard Login ===")
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")

    inputs = page.locator("input").all()
    print(f"\nInputs: {len(inputs)}")
    for inp in inputs:
        ph = inp.get_attribute("placeholder") or ""
        print(f"  placeholder={ph}")

    buttons = page.locator("button").all()
    print(f"\nButtons: {len(buttons)}")
    for b in buttons:
        txt = b.inner_text().strip()
        if txt:
            print(f"  [{txt}]")

    page.screenshot(path="/tmp/dashboard_login.png")

    print(f"\nAPI calls ({len(api_calls)}):")
    for c in api_calls[:20]:
        print(f"  {c}")

    print(f"\nConsole logs:")
    for log in console_logs[:10]:
        print(f"  {log}")

    browser.close()
