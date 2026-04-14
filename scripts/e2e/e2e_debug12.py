"""Debug: check what enterprise page shows"""
from playwright.sync_api import sync_playwright
import json, urllib.request


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Login
    req = urllib.request.Request(
        "http://localhost:9090/platform/auth/login",
        data=json.dumps({"username": "admin", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    login_data = json.loads(resp.read())
    token = login_data["data"]["accessToken"]
    admin_info = login_data["data"]["admin"]

    auth_store_data = {
        "accessToken": token,
        "refreshToken": login_data["data"]["refreshToken"],
        "user": {
            "userId": str(admin_info["id"]),
            "username": admin_info["username"],
            "roles": [admin_info["role"]],
            "permissions": ["*"],
            "isPlatformAdmin": True,
        },
        "isAuthenticated": True,
    }

    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_store_data)}, "version": 0}}));
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # Toggle
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")

    # nav_to
    item = page.locator('[class*="ant-menu-item"]:has-text("企业管理")').first
    item.wait_for(timeout=5000)
    item.click()
    page.wait_for_timeout(5000)

    print(f"URL after nav: {page.url}")

    # Full body text
    text = page.locator("body").inner_text()
    print(f"\nBody text ({len(text)} chars):\n{text}")

    # All buttons
    print(f"\n\n=== Buttons ===")
    for btn in page.locator("button").all():
        try:
            print(f"  '{btn.inner_text().strip()}'")
        except:
            pass

    # All div content
    print(f"\n=== Content area ===")
    for el in page.locator("h1, h2, h3, h4, p").all():
        try:
            t = el.inner_text().strip()
            if t:
                print(f"  {el.evaluate('el => el.tagName')}: '{t}'")
        except:
            pass

    # ant-table
    print(f"\n=== Tables ===")
    print(f"ant-table: {page.locator('[class*="ant-table"]').count()}")
    print(f"ant-spin: {page.locator('[class*="ant-spin"]').count()}")
    print(f"Table rows: {page.locator('[class*="ant-table-row"]').count()}")

    page.screenshot(path="/tmp/e2e_debug12.png", full_page=True)
    browser.close()
