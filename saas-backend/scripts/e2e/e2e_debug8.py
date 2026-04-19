"""Debug: check page rendering after navigation fix"""
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

    # Check initial state
    print(f"URL: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Body text (first 300): {text[:300]}")

    # All buttons
    buttons = page.locator("button").all()
    print(f"\nButtons ({len(buttons)}):")
    for btn in buttons:
        try:
            print(f"  '{btn.inner_text().strip()}'")
        except:
            pass

    # Try toggle button
    toggle_btns = page.locator("button:has-text('切换')").all()
    print(f"\nToggle buttons: {len(toggle_btns)}")
    for btn in toggle_btns:
        try:
            print(f"  text='{btn.inner_text()}'")
        except:
            pass

    # Click toggle
    if toggle_btns:
        toggle_btns[0].click()
        page.wait_for_timeout(3000)

        print(f"\nAfter toggle: {page.url}")
        text = page.locator("body").inner_text()
        print(f"Body (first 300): {text[:300]}")

        # Try clicking 企业管理
        menu_item = page.locator("[class*='ant-menu-item']").filter(has_text="企业管理").first
        if menu_item.count() > 0:
            print(f"\nClicking 企业管理...")
            menu_item.click()
            page.wait_for_timeout(5000)
            print(f"URL: {page.url}")
            text = page.locator("body").inner_text()
            print(f"Body (first 500):\n{text[:500]}")

            # Buttons
            buttons = page.locator("button").all()
            print(f"\nButtons ({len(buttons)}):")
            for btn in buttons:
                try:
                    t = btn.inner_text().strip()
                    if t:
                        print(f"  '{t}'")
                except:
                    pass

            # Table
            table_count = page.locator("[class*='ant-table']").count()
            print(f"\nTables: {table_count}")

    page.screenshot(path="/tmp/e2e_debug8.png", full_page=True)
    browser.close()
