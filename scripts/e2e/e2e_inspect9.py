"""Debug the toggle button"""
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
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({json.dumps(auth_store_data)}));
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Find all buttons
    buttons = page.locator("button").all()
    print(f"Total buttons: {len(buttons)}")
    for i, btn in enumerate(buttons):
        try:
            text = btn.inner_text()
            attrs = btn.evaluate("""el => ({
                type: el.type,
                className: el.className.substring(0, 100),
                disabled: el.disabled
            })""")
            print(f"  [{i}] text='{text.strip()}' attrs={attrs}")
        except:
            print(f"  [{i}] Error getting button info")

    # Try to find the toggle button with various selectors
    selectors = [
        "button:has-text('切换')",
        "button:text-is('切换:平台管理员')",
        "a:has-text('切换')",
        "[class*='switch']",
        "[class*='toggle']",
        "[class*='link']",
    ]
    for sel in selectors:
        count = page.locator(sel).count()
        print(f"  Selector '{sel}': {count}")

    # Get all text in header area
    header = page.locator("[class*='header']")
    if header.count() > 0:
        print(f"\nHeader text: {header.first.inner_text()}")

    # Check for any text containing "切换"
    all_text = page.locator("body").inner_text()
    if "切换" in all_text:
        idx = all_text.index("切换")
        print(f"\nFound '切换' at index {idx}: ...{all_text[max(0,idx-20):idx+30]}...")
    else:
        print("\n'切换' not found in page text")

    browser.close()
