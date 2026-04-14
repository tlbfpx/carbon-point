"""Debug: test direct goto with fresh context"""
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

    # Inject auth before page load
    page.add_init_script(f"""
        window.localStorage.removeItem('carbon-dashboard-auth');
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_store_data)}, "version": 0}}));
        console.log('Auth injected, key:', window.localStorage.key(0));
    """)

    # Direct goto to enterprise page
    page.goto("http://localhost:8081/dashboard/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")

    # Check localStorage
    ls = page.evaluate("window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage: {ls[:200] if ls else 'NULL'}...")

    text = page.locator("body").inner_text()
    print(f"\nBody (first 600):\n{text[:600]}")

    h2s = [el.inner_text() for el in page.locator("h2").all()]
    print(f"\nh2 elements: {h2s}")
    print(f"Tables: {page.locator('[class*=\"ant-table\"]').count()}")
    print(f"Spinners: {page.locator('[class*=\"ant-spin\"]').count()}")

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

    page.screenshot(path="/tmp/e2e_debug16.png", full_page=True)
    browser.close()
