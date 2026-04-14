#!/usr/bin/env python3
"""Test Dashboard login - detailed API tracing."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    api_all = []
    def on_request(req):
        api_all.append(f">> {req.method} {req.url}")
    def on_response(resp):
        body = resp.text()[:200] if resp.status < 500 else "ERROR"
        api_all.append(f"<< {resp.status} {resp.url}: {body}")
    page.on("request", on_request)
    page.on("response", on_response)

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # Fill login form
    inputs = page.locator("input").all()
    for i, inp in enumerate(inputs):
        ph = inp.get_attribute("placeholder") or ""
        print(f"  Input {i}: placeholder={ph}, type={inp.get_attribute('type')}")

    inputs[0].fill("admin")
    inputs[1].fill("admin123")

    # Click login
    page.locator("button").click()
    page.wait_for_timeout(5000)

    print(f"\nURL: {page.url}")
    print(f"\nAll API calls:")
    for c in api_all:
        print(f"  {c}")

    print(f"\nConsole logs:")
    for log in console_logs:
        print(f"  {log}")

    page.screenshot(path="/tmp/dashboard_detail.png", full_page=True)
    browser.close()
