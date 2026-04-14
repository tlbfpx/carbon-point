#!/usr/bin/env python3
"""Debug Dashboard form submission."""
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
            body = resp.text()[:200]
        except:
            body = "(no body)"
        api_all.append(f"<< {resp.status} {resp.url}: {body}")

    page.on("request", on_request)
    page.on("response", on_response)

    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto("http://localhost:8081/dashboard/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # Check #root content
    root_html = page.locator("#root").inner_html()
    print(f"#root HTML length: {len(root_html)}")
    print(f"#root HTML preview: {root_html[:300]}")

    # Try direct API call
    print("\n=== Trying direct API call ===")
    page.evaluate("""
        fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({phone: '13800138001', password: 'admin123'})
        }).then(r => r.json()).then(d => console.log('API result:', JSON.stringify(d)))
    """)
    page.wait_for_timeout(5000)

    print(f"\nConsole logs from page:")
    for log in console_logs:
        print(f"  {log}")

    print(f"\nAPI calls:")
    for c in api_all:
        print(f"  {c}")

    browser.close()
