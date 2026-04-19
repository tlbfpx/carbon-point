"""Investigate dashboard auth mechanism"""
from playwright.sync_api import sync_playwright
import json


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Login via API first
    import urllib.request
    req = urllib.request.Request(
        "http://localhost:9090/platform/auth/login",
        data=json.dumps({"username": "admin", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    login_data = json.loads(resp.read())
    token = login_data["data"]["accessToken"]
    print(f"Token: {token[:30]}...")

    # Try multiple approaches to set auth
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)
    print(f"URL after load: {page.url}")
    print(f"Title: {page.title()}")

    # Approach 1: Set cookie
    context.add_cookies([{
        "name": "platform_access_token",
        "value": token,
        "domain": "localhost",
        "path": "/"
    }])

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)
    print(f"\nAfter cookie - URL: {page.url}")

    # Check localStorage/sessionStorage
    ls = page.evaluate("() => JSON.stringify(localStorage)")
    print(f"localStorage: {ls[:200]}")

    ss = page.evaluate("() => JSON.stringify(sessionStorage)")
    print(f"sessionStorage: {ss[:200]}")

    # Check cookies
    cookies = context.cookies()
    print(f"\nCookies:")
    for c in cookies:
        print(f"  {c['name']}={c['value'][:30]}...")

    # Try to inject token and navigate
    page.evaluate(f"""
        localStorage.setItem('access_token', '{token}');
        localStorage.setItem('token', '{token}');
        localStorage.setItem('platform_token', '{token}');
    """)

    # Try specific routes
    routes = [
        "#/dashboard",
        "#/platform",
        "#/admin",
        "#/home",
        "#/overview",
        "#/enterprise",
    ]
    for route in routes:
        page.goto(f"http://localhost:8081/dashboard/{route}", wait_until="networkidle")
        page.wait_for_timeout(2000)
        print(f"\n{route} -> {page.url}")
        text = page.locator("body").inner_text()
        print(f"  Text (first 100): {text[:100]}")

    browser.close()
