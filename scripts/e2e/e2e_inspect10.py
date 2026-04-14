"""Debug why dashboard shows login page"""
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

    auth_json = json.dumps(auth_store_data)
    print(f"Auth JSON length: {len(auth_json)}")

    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({auth_json}));
        console.log('localStorage set by init script');
        console.log('Value:', window.localStorage.getItem('carbon-dashboard-auth')?.substring(0, 100));
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")

    # Check localStorage after load
    ls_value = page.evaluate("() => window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage value (first 100): {ls_value[:100] if ls_value else 'null'}")

    # Check if the auth store is initialized
    page_text = page.locator("body").inner_text()
    print(f"Page text (first 300): {page_text[:300]}")

    # Check for login form
    login_form = page.locator('form[name="login"]')
    print(f"Login form found: {login_form.count() > 0}")

    # Check for any dashboard elements
    sider = page.locator("[class*='sider']")
    print(f"Sider found: {sider.count() > 0}")

    browser.close()
