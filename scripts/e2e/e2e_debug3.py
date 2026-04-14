"""Debug: check what's on the page after navigation"""
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
    page.wait_for_timeout(3000)

    print(f"URL: {page.url}")
    page_text = page.locator("body").inner_text()
    print(f"Page text (first 500):\n{page_text[:500]}")

    # Check the toggle button
    toggle_btn = page.locator('button:has-text("切换"), button:has-text("平台管理员")')
    print(f"\nToggle button count: {toggle_btn.count()}")
    if toggle_btn.count() > 0:
        print(f"Toggle text: '{toggle_btn.first.inner_text()}'")
        # Click it
        toggle_btn.first.click()
        page.wait_for_timeout(2000)
        print(f"URL after click: {page.url}")
        page_text2 = page.locator("body").inner_text()
        print(f"Page text after click (first 500):\n{page_text2[:500]}")

    # Now navigate to enterprise management
    page.goto("http://localhost:8081/dashboard/#/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(3000)
    print(f"\nURL: {page.url}")
    page_text3 = page.locator("body").inner_text()
    print(f"Enterprise page text (first 500):\n{page_text3[:500]}")

    # Get ALL text content including hidden
    all_elements = page.locator("h1, h2, h3, h4, [class*='menu'], [class*='nav'], [class*='sidebar'], [class*='sider']").all()
    print(f"\nStructural elements: {len(all_elements)}")
    for el in all_elements[:20]:
        try:
            text = el.inner_text()
            cls = el.evaluate("el => el.className.substring(0, 40)")
            if text.strip():
                print(f"  [{cls}] '{text.strip()[:50]}'")
        except:
            pass

    browser.close()
