"""Debug: check sidebar DOM structure and click behavior"""
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

    # Click toggle
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(3000)

    # Check URL
    print(f"URL: {page.url}")

    # Find all ant-menu items
    menu_items = page.locator("[class*='ant-menu-item']").all()
    print(f"\nMenu items ({len(menu_items)}):")
    for item in menu_items:
        try:
            text = item.inner_text()
            cls = item.get_attribute("class") or ""
            print(f"  text='{text.strip()}' class={cls[:60]}")
        except:
            pass

    # Try clicking with evaluate
    print("\nTrying evaluate click...")
    menu_item = page.locator("[class*='ant-menu-item']").filter(has_text="企业管理").first
    print(f"Found menu item: {menu_item.count()}")

    # Check if visible
    try:
        visible = menu_item.is_visible()
        print(f"Is visible: {visible}")

        # Get bounding box
        box = menu_item.bounding_box()
        print(f"Bounding box: {box}")

        # Click using evaluate
        menu_item.evaluate("el => el.click()")
        page.wait_for_timeout(5000)
        print(f"URL after click: {page.url}")
        text = page.locator("body").inner_text()
        print(f"Body text (first 500):\n{text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

    # Check URL hash
    print(f"\nFinal URL hash: {page.url.split('#')[-1] if '#' in page.url else 'no hash'}")

    page.screenshot(path="/tmp/e2e_debug7.png", full_page=True)
    browser.close()
