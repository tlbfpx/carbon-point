"""Debug: verify toggle button and platform routes work"""
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

    # Inject auth via add_init_script
    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({json.dumps(auth_store_data)}));
    """)

    # Navigate to dashboard and try hash route directly
    page.goto("http://localhost:8081/dashboard/#/platform/dashboard", wait_until="networkidle")
    page.wait_for_timeout(2000)

    print(f"URL: {page.url}")

    # Take screenshot
    page.screenshot(path="/tmp/e2e_platform_dashboard.png", full_page=True)

    # Check what's visible
    page_text = page.locator("body").inner_text()
    print(f"\nPage text (first 500):\n{page_text[:500]}")

    # Check for platform menu items
    platform_keywords = ["平台看板", "企业管理", "系统管理", "平台配置", "平台管理员"]
    enterprise_keywords = ["企业数据管理平台", "企业看板"]

    has_platform = any(kw in page_text for kw in platform_keywords)
    has_enterprise = any(kw in page_text for kw in enterprise_keywords)

    print(f"\nHas platform keywords: {has_platform}")
    print(f"Has enterprise keywords: {has_enterprise}")

    # Check if toggle button exists
    toggle_btn = page.locator('button:has-text("切换"), button:has-text("平台管理员")')
    print(f"\nToggle button count: {toggle_btn.count()}")

    # Try clicking the toggle button
    if toggle_btn.count() > 0:
        print(f"Toggle button text: '{toggle_btn.first.inner_text()}'")
        # Check current view
        sider = page.locator("[class*='ant-menu']")
        menu_text = sider.inner_text() if sider.count() > 0 else ""
        print(f"Current menu items: {menu_text[:100]}")

        toggle_btn.first.click()
        page.wait_for_timeout(1000)

        menu_text_after = sider.inner_text() if sider.count() > 0 else ""
        print(f"Menu after toggle: {menu_text_after[:100]}")
        page.screenshot(path="/tmp/e2e_after_toggle.png", full_page=True)

    # Now navigate to each platform route
    routes = [
        ("/platform/dashboard", ["平台看板", "企业管理", "数据看板", "企业"]),
        ("/platform/enterprises", ["企业管理", "企业", "创建", "新增"]),
        ("/platform/system", ["系统管理", "管理员", "日志"]),
        ("/platform/config", ["平台配置", "配置", "功能"]),
    ]

    for route, expected_keywords in routes:
        page.goto(f"http://localhost:8081/dashboard/#{route}", wait_until="networkidle")
        page.wait_for_timeout(2000)
        text = page.locator("body").inner_text()
        has_kw = any(kw in text for kw in expected_keywords)
        print(f"\nRoute {route}: keywords found = {has_kw}")
        print(f"  Text (first 200): {text[:200]}")
        page.screenshot(path=f"/tmp/e2e_{route.replace('/', '_')}.png")

    browser.close()
