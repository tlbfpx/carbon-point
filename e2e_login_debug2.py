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

    page.goto("http://localhost:8081/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    print(f"URL: {page.url}")

    # Find inputs by placeholder
    inputs = page.locator("input").all()
    print(f"Found {len(inputs)} inputs")
    for i, inp in enumerate(inputs):
        ph = inp.get_attribute("placeholder") or ""
        typ = inp.get_attribute("type") or "text"
        print(f"  {i}: placeholder={ph}, type={typ}")

    # Fill by placeholder
    page.locator('input[placeholder="请输入手机号"]').fill("13800138001")
    page.locator('input[placeholder="请输入密码"]').fill("admin123")

    print("Filled form")

    # Try clicking the button
    page.locator("button").click()
    page.wait_for_timeout(5000)

    print(f"URL after click: {page.url}")

    body = page.locator("body").inner_text()
    print(f"Body text: {body[:300]}")

    print(f"\nAPI calls:")
    for c in api_calls:
        print(f"  {c}")

    page.screenshot(path="/tmp/login_debug2.png")
    browser.close()
