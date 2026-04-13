"""Debug enterprise management page"""
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

    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_store_data)}, "version": 0}}));
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(5000)

    # Click toggle
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(3000)

    print(f"After toggle: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Text (first 200): {text[:200]}")

    # Navigate to enterprise management
    page.goto("http://localhost:8081/dashboard/#/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(5000)

    print(f"\nEnterprise: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Text (first 500):\n{text[:500]}")

    # All buttons
    buttons = page.locator("button").all()
    print(f"\nButtons: {len(buttons)}")
    for btn in buttons:
        try:
            text = btn.inner_text().strip()
            cls = btn.evaluate("el => el.className.substring(0, 50)")
            if text:
                print(f"  '{text}' cls={cls[:40]}")
        except:
            pass

    # Try to find "开通企业" with various methods
    for sel in ["开通企业", "创建", "新增", "添加", "开通"]:
        count = page.locator(f'button:has-text("{sel}")').count()
        print(f"  '{sel}': {count}")

    # Table rows
    rows = page.locator("[class*='ant-table-row']").count()
    print(f"\nTable rows: {rows}")

    # Check if table loading
    loading = page.locator("[class*='ant-spin'], [class*='loading']").count()
    print(f"Loading indicators: {loading}")

    # Take screenshot
    page.screenshot(path="/tmp/e2e_enterprise_debug2.png", full_page=True)
    browser.close()
