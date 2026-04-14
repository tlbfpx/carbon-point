#!/usr/bin/env python3
"""Test Dashboard login with all API intercepts."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    api_all = []
    def on_request(req):
        api_all.append(f">> {req.method} {req.url}")
    def on_response(resp):
        body = ""
        try:
            body = resp.text()[:300]
        except:
            body = "(no body)"
        api_all.append(f"<< {resp.status} {resp.url}: {body}")
    page.on("request", on_request)
    page.on("response", on_response)

    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")

    # Fill form
    page.locator('input[type="text"]').fill("admin")
    page.locator('input[type="password"]').fill("admin123")

    # Try clicking button
    buttons = page.locator("button").all()
    for b in buttons:
        txt = b.inner_text().strip().replace(" ", "")
        print(f"  Button: [{txt}]")

    # Click first button
    if buttons:
        buttons[0].click()
        page.wait_for_timeout(5000)

    print(f"\nURL after click: {page.url}")
    print(f"\nAll API calls:")
    for c in api_all:
        print(f"  {c}")

    # Also try submitting via Enter
    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.locator('input[type="text"]').fill("admin")
    page.locator('input[type="password"]').fill("admin123")
    page.keyboard.press("Enter")
    page.wait_for_timeout(5000)

    print(f"\nURL after Enter: {page.url}")
    for c in api_all:
        print(f"  {c}")

    page.screenshot(path="/tmp/dashboard_login2.png", full_page=True)
    browser.close()
