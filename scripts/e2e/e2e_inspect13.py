"""Debug: try evaluate-based auth injection after page load"""
from playwright.sync_api import sync_playwright
import json


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Get tokens
    import urllib.request
    req = urllib.request.Request(
        "http://localhost:9090/platform/auth/login",
        data=json.dumps({"username": "admin", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    login_data = json.loads(resp.read())
    token = login_data["data"]["accessToken"]
    refresh_token = login_data["data"]["refreshToken"]
    admin_info = login_data["data"]["admin"]

    auth_user = {
        "userId": str(admin_info["id"]),
        "username": admin_info["username"],
        "roles": [admin_info["role"]],
        "permissions": ["*"],
        "isPlatformAdmin": True,
    }
    auth_store_data = {
        "accessToken": token,
        "refreshToken": refresh_token,
        "user": auth_user,
        "isAuthenticated": True,
    }

    # Navigate first
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(2000)
    print(f"URL before inject: {page.url}")

    # Try: Set localStorage with the Zustand persist structure
    # In Zustand 4.x, persist uses localStorage directly (no wrap)
    page.evaluate(f"""() => {{
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({json.dumps(auth_store_data)}));
        console.log('Set localStorage');
    }}""")

    # Check what Zustand is actually reading
    page.evaluate("""() => {
        const stored = window.localStorage.getItem('carbon-dashboard-auth');
        console.log('Stored value:', stored ? stored.substring(0, 200) : 'null');
        try {
            const parsed = JSON.parse(stored);
            console.log('Parsed keys:', Object.keys(parsed));
            console.log('isAuthenticated:', parsed.isAuthenticated);
        } catch(e) {
            console.log('Parse error:', e.message);
        }
    }""")

    # Now navigate via hash
    page.goto("http://localhost:8081/dashboard/#/platform/dashboard", wait_until="networkidle")
    page.wait_for_timeout(2000)
    print(f"\nURL after hash nav: {page.url}")

    page_text = page.locator("body").inner_text()
    print(f"Page text (first 300): {page_text[:300]}")

    if "登录" not in page_text or "企业数据管理平台" not in page_text:
        print("\nSUCCESS: NOT on login page!")
    else:
        print("\nStill on login page")

        # Try: Force re-render by triggering a store update
        # In Zustand, the persist rehydration happens on store creation
        # So we need to reload the page
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(3000)
        print(f"URL after reload: {page.url}")
        page_text = page.locator("body").inner_text()
        print(f"Page text after reload (first 300): {page_text[:300]}")

    # Also check: is the issue that the page is NOT an SPA and navigates via full page load?
    # Let's check what happens when we click a hash link within the app
    # First navigate to dashboard root
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.evaluate(f"""() => {{
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({json.dumps(auth_store_data)}));
    }}""")

    # Navigate to a different hash route
    page.evaluate("() => window.location.hash = '#/platform/enterprises'")
    page.wait_for_timeout(2000)
    print(f"\nURL after hash change: {page.url}")
    page_text = page.locator("body").inner_text()
    print(f"Page text (first 200): {page_text[:200]}")

    browser.close()
