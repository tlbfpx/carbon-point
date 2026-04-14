#!/usr/bin/env python3
"""Test Dashboard login with Playwright."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page_errors = []
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    api_calls = []
    def on_request(req):
        api_calls.append(f">> {req.method} {req.url}")
    def on_response(resp):
        if resp.status >= 400:
            api_calls.append(f"<< {resp.status} {resp.url}")
    page.on("request", on_request)
    page.on("response", on_response)

    print("=== Dashboard Login Test ===")
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")

    html_len = len(page.content())
    print(f"HTML length: {html_len}")

    # Check if React rendered
    body_text = page.locator("body").inner_text()
    print(f"Body text: {body_text[:300]}")

    # Count elements
    print(f"  buttons: {page.locator('button').count()}")
    print(f"  inputs: {page.locator('input').count()}")
    print(f"  divs: {page.locator('div').count()}")

    # Check for login form
    inputs = page.locator("input").all()
    if inputs:
        for i, inp in enumerate(inputs):
            ph = inp.get_attribute("placeholder") or ""
            print(f"  Input {i}: placeholder={ph}")

    buttons = page.locator("button").all()
    for b in buttons:
        txt = b.inner_text().strip()
        if txt:
            print(f"  Button: [{txt}]")

    page.screenshot(path="/tmp/dashboard_test.png", full_page=True)

    # Try to login
    if inputs:
        try:
            inputs[0].fill("admin")
            inputs[1].fill("admin123")
            print("\nFilled login form")

            for b in buttons:
                txt = b.inner_text().strip()
                if "登录" in txt or "登录" in txt:
                    b.click()
                    print("Clicked login")
                    break

            page.wait_for_timeout(5000)
            page.screenshot(path="/tmp/dashboard_after_login.png", full_page=True)
            print(f"URL after login: {page.url}")
            body_text = page.locator("body").inner_text()
            print(f"Body text after login: {body_text[:300]}")
        except Exception as e:
            print(f"Login attempt failed: {e}")

    print(f"\nConsole errors: {len(page_errors)}")
    for err in page_errors[:5]:
        print(f"  {err}")

    print(f"\nAPI calls ({len(api_calls)}):")
    for c in api_calls[:20]:
        print(f"  {c}")

    browser.close()
