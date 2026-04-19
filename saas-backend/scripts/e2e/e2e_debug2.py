"""Debug remaining UI issues"""
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

    # Use Zustand-wrapped format
    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_store_data)}, "version": 0}}));
    """)

    # Navigate to dashboard
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Check: all buttons
    buttons = page.locator("button").all()
    print(f"Total buttons: {len(buttons)}")
    for btn in buttons:
        try:
            text = btn.inner_text().strip()
            cls = btn.evaluate("el => el.className.substring(0, 50)")
            disabled = btn.evaluate("el => el.disabled")
            if text:
                print(f"  '{text}' class={cls[:30]} disabled={disabled}")
        except:
            pass

    # Navigate to enterprise management
    page.goto("http://localhost:8081/dashboard/#/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(3000)
    page.screenshot(path="/tmp/e2e_enterprise_debug.png", full_page=True)

    # Get ALL buttons on enterprise page
    buttons2 = page.locator("button").all()
    print(f"\nEnterprise page buttons: {len(buttons2)}")
    for btn in buttons2:
        try:
            text = btn.inner_text().strip()
            cls = btn.evaluate("el => el.className.substring(0, 50)")
            disabled = btn.evaluate("el => el.disabled")
            if text:
                print(f"  '{text}' class={cls[:30]} disabled={disabled}")
        except:
            pass

    # Get table rows
    rows = page.locator("[class*='ant-table-row']").all()
    print(f"\nTable rows: {len(rows)}")
    for row in rows:
        try:
            cells = row.locator("td").all()
            row_text = " | ".join([c.inner_text() for c in cells])
            print(f"  {row_text[:100]}")
        except:
            pass

    # Navigate to system management
    page.goto("http://localhost:8081/dashboard/#/platform/system", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # Check for tabs
    tabs = page.locator("[class*='ant-tabs-tab']").all()
    print(f"\nTabs: {len(tabs)}")
    for tab in tabs:
        try:
            text = tab.inner_text()
            print(f"  Tab: '{text}'")
        except:
            pass

    # Check for 操作日志 tab specifically
    tabs_all = page.locator("[class*='ant-tabs-tab']").count()
    print(f"\nTotal tabs found: {tabs_all}")

    # Try different selectors
    for sel in ["[class*='tab']", "[class*='ant-tabs']", "div[role='tab']"]:
        count = page.locator(sel).count()
        if count > 0:
            print(f"  Selector '{sel}': {count}")
            for el in page.locator(sel).all()[:10]:
                try:
                    text = el.inner_text()
                    if text.strip():
                        print(f"    '{text.strip()[:50]}'")
                except:
                    pass

    page.screenshot(path="/tmp/e2e_system_debug.png", full_page=True)
    browser.close()
