"""Debug: try route interception to inject auth"""
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

    # Intercept API calls to inject auth header
    def handle_route(route):
        # Add auth header to platform API requests
        if '/platform/' in route.request.url and '/auth/' not in route.request.url:
            route.continue_(headers={**dict(route.request.headers), 'Authorization': f'Bearer {token}'})
        else:
            route.continue_()

    context.route("**", handle_route)

    # Also inject localStorage before page load
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

    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({json.dumps(auth_store_data)}));
    """)

    # Navigate to dashboard
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")
    page_text = page.locator("body").inner_text()
    print(f"Page text (first 300): {page_text[:300]}")

    if "/login" not in page.url:
        print("NOT on login page!")
    else:
        print("Still on login page")

        # Try: call React Router navigation from within the page
        result = page.evaluate("""() => {
            // Try to access React Router history
            // The hash router should be accessible
            const hash = window.location.hash;
            return { hash, href: window.location.href };
        }""")
        print(f"Hash info: {result}")

        # Force set hash and navigate
        page.evaluate("""() => {
            window.location.hash = '#/platform/dashboard';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
        }""")
        page.wait_for_timeout(2000)
        print(f"URL after hash set: {page.url}")
        page_text = page.locator("body").inner_text()
        print(f"Page text (first 300): {page_text[:300]}")

        # Check if we can see dashboard elements
        dashboard_elements = page.locator("[class*='ant-layout']")
        print(f"Layout elements: {dashboard_elements.count()}")

        sider = page.locator("[class*='ant-sider']")
        print(f"Sider elements: {sider.count()}")

        menu_items = page.locator("[class*='ant-menu'] li")
        print(f"Menu items: {menu_items.count()}")

        # Take screenshot
        page.screenshot(path="/tmp/e2e_debug.png", full_page=True)
        print("\nScreenshot saved to /tmp/e2e_debug.png")

    browser.close()
