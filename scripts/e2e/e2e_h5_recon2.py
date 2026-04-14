#!/usr/bin/env python3
"""Deep reconnaissance - check for React rendering, network requests, etc."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 375, "height": 812})

    # Capture ALL console messages
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    # Capture network errors
    network_errors = []
    def on_response(response):
        if response.status >= 400:
            network_errors.append(f"{response.status} {response.url}")
    page.on("response", on_response)

    print("=== Navigating to H5 ===")
    resp = page.goto("http://localhost:8081/h5/")
    print(f"Initial response: {resp.status}")

    # Wait for React to mount - try multiple strategies
    page.wait_for_timeout(5000)

    print(f"\nTitle: {page.title()}")
    print(f"URL after load: {page.url}")

    # Full HTML content
    html = page.content()
    print(f"\nHTML length: {len(html)} chars")
    print(f"\nHTML snippet (first 2000 chars):\n{html[:2000]}")

    # Check for any elements
    print(f"\n=== Element counts ===")
    print(f"  buttons: {page.locator('button').count()}")
    print(f"  links: {page.locator('a').count()}")
    print(f"  inputs: {page.locator('input').count()}")
    print(f"  divs: {page.locator('div').count()}")
    print(f"  spans: {page.locator('span').count()}")
    print(f"  imgs: {page.locator('img').count()}")

    # Try waiting for specific things
    print(f"\n=== Waiting for networkidle ===")
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
        print("Reached networkidle")
    except Exception as e:
        print(f"networkidle timeout: {e}")

    page.wait_for_timeout(2000)

    print(f"\nHTML length after networkidle: {len(page.content())}")
    body_text = page.locator("body").inner_text()
    print(f"\nBody text (first 1000 chars):\n{body_text[:1000]}")

    # All console logs
    print(f"\n=== Console Logs ({len(console_logs)}) ===")
    for log in console_logs:
        print(f"  {log}")

    print(f"\n=== Network Errors ({len(network_errors)}) ===")
    for err in network_errors:
        print(f"  {err}")

    # Screenshot
    page.screenshot(path="/tmp/h5_after_wait.png", full_page=True)
    print("\nScreenshot saved to /tmp/h5_after_wait.png")

    browser.close()
