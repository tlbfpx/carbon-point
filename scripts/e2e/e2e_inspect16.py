"""Debug: test Zustand-wrapped format properly"""
from playwright.sync_api import sync_playwright
import json


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

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

    # Zustand 4.x persist wraps as {state: {...}, version: N}
    zustand_wrapped = {"state": auth_store_data, "version": 0}

    # Inject via add_init_script with CORRECT Zustand format
    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({json.dumps(zustand_wrapped)}));
        console.log('Injected Zustand-wrapped format');
    """)

    # Navigate to dashboard
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")
    page_text = page.locator("body").inner_text()
    print(f"Page text (first 300): {page_text[:300]}")

    # Check localStorage
    ls = page.evaluate("() => window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"\nlocalStorage (first 200): {ls[:200] if ls else 'null'}")

    # Check if we're on dashboard or login
    if "/login" in page.url:
        print("Still on login page!")

        # Try hash navigation
        page.goto("http://localhost:8081/dashboard/#/platform/dashboard", wait_until="networkidle")
        page.wait_for_timeout(2000)
        print(f"\nHash nav URL: {page.url}")
        page_text = page.locator("body").inner_text()
        print(f"Hash nav text (first 300): {page_text[:300]}")

    # Check for dashboard-specific elements (not the login page)
    has_login_form = page.locator('input[placeholder*="手机"]').count() > 0
    has_sider = page.locator("[class*='ant-layout-sider']").count() > 0
    has_menu = page.locator("[class*='ant-menu']").count() > 0

    print(f"\nHas login form input: {has_login_form}")
    print(f"Has sider: {has_sider}")
    print(f"Has menu: {has_menu}")

    if not has_login_form:
        print("\nSUCCESS: No login form - dashboard is shown!")
    else:
        print("\nFAIL: Still showing login form")

    # Take screenshot
    page.screenshot(path="/tmp/e2e_auth_test.png", full_page=True)
    print("\nScreenshot saved")

    browser.close()
