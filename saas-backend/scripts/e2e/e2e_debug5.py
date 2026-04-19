"""Debug: check console errors and component rendering"""
from playwright.sync_api import sync_playwright
import json


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}") if msg.type in ["error", "warn"] else None)
    page.on("pageerror", lambda err: console_msgs.append(f"[PAGEERROR] {err}"))

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

    page.goto("http://localhost:8081/dashboard/#/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Page text:\n{text[:500]}")

    # Print console errors
    print(f"\nConsole messages ({len(console_msgs)}):")
    for msg in console_msgs:
        print(f"  {msg}")

    # Check if the component is mounted
    has_h2 = page.locator("h2").count()
    print(f"\nh2 elements: {has_h2}")

    # Check for 企业管理 heading
    h2_texts = [el.inner_text() for el in page.locator("h2").all()]
    print(f"h2 texts: {h2_texts}")

    # Check for ant-table
    table_count = page.locator("[class*='ant-table']").count()
    print(f"Ant table elements: {table_count}")

    # Check for any visible div content in the main area
    content_divs = page.locator("[class*='ant-layout-content']").all()
    print(f"\nContent divs: {len(content_divs)}")
    for div in content_divs:
        try:
            text = div.inner_text()
            if text.strip():
                print(f"  Content: '{text.strip()[:100]}'")
        except:
            pass

    page.screenshot(path="/tmp/e2e_debug5.png", full_page=True)
    browser.close()
