"""Debug: inspect enterprise page buttons and system admin tabs"""
from playwright.sync_api import sync_playwright
import json, urllib.request


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

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
    page.wait_for_timeout(5000)

    # Toggle to platform
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(3000)

    # === Enterprise Management ===
    route_map = {
        "平台看板": "/platform/dashboard",
        "企业管理": "/platform/enterprises",
        "系统管理": "/platform/system",
        "平台配置": "/platform/config",
    }

    def nav_to(menu_text):
        route = route_map.get(menu_text)
        if route:
            page.evaluate(f"window.history.pushState(null, '', '/dashboard{route}')")
            page.evaluate("window.dispatchEvent(new Event('popstate'))")
            page.wait_for_timeout(4000)
        return page.locator("body").inner_text()

    print("=== Enterprise Management ===")
    page_text = nav_to("企业管理")
    print(f"Text (first 1000):\n{page_text[:1000]}")

    page.screenshot(path="/tmp/e2e_debug13_enterprise.png", full_page=True)

    # All buttons
    buttons = page.locator("button").all()
    print(f"\nButtons ({len(buttons)}):")
    for btn in buttons:
        try:
            t = btn.inner_text().strip()
            if t:
                print(f"  '{t}'")
        except:
            pass

    # ant-table
    print(f"\nTables: {page.locator('[class*=\"ant-table\"]').count()}")
    print(f"Table rows: {page.locator('[class*=\"ant-table-row\"]').count()}")
    print(f"Spinners: {page.locator('[class*=\"ant-spin\"]').count()}")

    # === System Management ===
    print("\n\n=== System Management ===")
    page_text2 = nav_to("系统管理")
    print(f"Text (first 1000):\n{page_text2[:1000]}")

    page.screenshot(path="/tmp/e2e_debug13_system.png", full_page=True)

    # Tabs
    tabs = page.locator("[class*=\"ant-tabs-tab\"]").all()
    print(f"\nTabs ({len(tabs)}):")
    for tab in tabs:
        try:
            print(f"  '{tab.inner_text()}'")
        except:
            pass

    # Try clicking 操作日志 tab
    log_tab = page.locator("[class*=\"ant-tabs-tab\"]:has-text(\"操作日志\"), div[role=\"tab\"]:has-text(\"操作日志\")")
    print(f"\nLog tab count: {log_tab.count()}")
    if log_tab.count() > 0:
        log_tab.first.click()
        page.wait_for_timeout(3000)
        print("Clicked log tab")
        page.screenshot(path="/tmp/e2e_debug13_logs.png", full_page=True)
        text = page.locator("body").inner_text()
        print(f"After click (first 500):\n{text[:500]}")

    browser.close()
