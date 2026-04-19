#!/usr/bin/env python3
"""Debug login API call."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})

    api_calls = []
    def on_request(request):
        if "/api/" in request.url or "/auth" in request.url or "/login" in request.url or "/oauth" in request.url:
            api_calls.append(f">> {request.method} {request.url}")
    def on_response(response):
        if "/api/" in response.url or "/auth" in response.url or "/login" in response.url or "/oauth" in response.url:
            api_calls.append(f"<< {response.status} {response.url}")
    page.on("request", on_request)
    page.on("response", on_response)

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:8081/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    inputs = page.locator("input").all()
    print(f"Found {len(inputs)} inputs")
    for i, inp in enumerate(inputs):
        ph = inp.get_attribute("placeholder") or ""
        print(f"  Input {i}: placeholder={ph}")

    if len(inputs) >= 2:
        inputs[0].fill("13800000001")
        inputs[1].fill("admin123")

    buttons = page.locator("button").all()
    for b in buttons:
        txt = b.inner_text().strip()
        if "登录" in txt:
            b.click()
            break

    page.wait_for_timeout(5000)

    print("\nAPI calls:")
    for c in api_calls:
        print(f"  {c}")

    print(f"\nURL: {page.url}")
    body_text = page.locator("body").inner_text()
    print(f"\nPage text: {body_text[:500]}")

    print(f"\nConsole logs:")
    for log in console_logs:
        print(f"  {log}")

    page.screenshot(path="/tmp/h5_login_debug.png")
    browser.close()
