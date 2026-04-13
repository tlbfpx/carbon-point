"""Debug: enterprise page with proper nav flow"""
from playwright.sync_api import sync_playwright
import json, urllib.request


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warn"] else None)

    # Login
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

    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_store_data)}, "version": 0}}));
    """)

    # Navigate to dashboard and toggle to platform view
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # Click toggle to switch to platform view
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.wait_for(timeout=5000)
    toggle_btn.click()
    page.wait_for_timeout(3000)

    print(f"URL after toggle: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Sidebar text (first 300): {text[:300]}")

    # Now click sidebar 企业管理
    def nav_to(menu_text):
        item = page.locator(f'[class*="ant-menu-item"]:has-text("{menu_text}")').first
        item.wait_for(timeout=5000)
        item.click()
        page.wait_for_timeout(5000)
        return page.locator("body").inner_text()

    page_text = nav_to("企业管理")
    print(f"\nEnterprise page text (first 800):\n{page_text[:800]}")

    page.screenshot(path="/tmp/e2e_debug6_enterprise.png", full_page=True)

    # All buttons
    buttons = page.locator("button").all()
    print(f"\nAll buttons ({len(buttons)}):")
    for btn in buttons:
        try:
            text = btn.inner_text().strip()
            if text:
                print(f"  '{text}'")
        except:
            pass

    # Check table
    table_count = page.locator("[class*='ant-table']").count()
    print(f"\nAnt tables: {table_count}")

    rows = page.locator("[class*='ant-table-row']").count()
    print(f"Table rows: {rows}")

    # Check for create-related buttons more broadly
    for kw in ["开通", "创建", "新增", "添加", "启用", "停用"]:
        count = page.locator(f'button:has-text("{kw}")').count()
        print(f"  '{kw}': {count}")

    # Now system admin
    page_text2 = nav_to("系统管理")
    print(f"\n\nSystem admin text (first 500):\n{page_text2[:500]}")
    page.screenshot(path="/tmp/e2e_debug6_system.png", full_page=True)

    # Tabs
    tabs = page.locator("[class*='ant-tabs-tab']").all()
    print(f"\nTabs: {len(tabs)}")
    for tab in tabs:
        try:
            print(f"  '{tab.inner_text()}'")
        except:
            pass

    # Check for 操作日志 with various selectors
    for sel in [
        "[class*='ant-tabs-tab']:has-text('操作日志')",
        "[role='tab']",
        "[class*='tab']"
    ]:
        count = page.locator(sel).count()
        print(f"  Selector '{sel}': {count}")

    # Print console messages
    print(f"\nConsole messages ({len(console_msgs)}):")
    for msg in console_msgs[:10]:
        print(f"  {msg}")

    browser.close()
