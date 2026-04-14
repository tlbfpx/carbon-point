"""Debug: inject auth via Zustand createStore and page context"""
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
    refresh_token = login_data["data"]["refreshToken"]
    admin_info = login_data["data"]["admin"]

    auth_user = {
        "userId": str(admin_info["id"]),
        "username": admin_info["username"],
        "roles": [admin_info["role"]],
        "permissions": ["*"],
        "isPlatformAdmin": True,
    }

    # Try: intercept Zustand's persist write by using a MutationObserver
    # or by replacing the localStorage setter
    page.add_init_script(f"""
        // Store the original setItem
        const _originalSetItem = window.localStorage.setItem.bind(window.localStorage);
        window.__authStoreData = {json.dumps({
            "accessToken": token,
            "refreshToken": refresh_token,
            "user": auth_user,
            "isAuthenticated": True,
        })};

        // Replace setItem to inject auth
        window.localStorage.setItem = function(key, value) {{
            if (key === 'carbon-dashboard-auth') {{
                // This is the Zustand persist key - inject our auth
                const wrapped = JSON.stringify({{
                    state: window.__authStoreData,
                    version: 0
                }});
                _originalSetItem.call(this, key, wrapped);
                console.log('INJECTED AUTH via setItem override');
            }} else {{
                _originalSetItem.call(this, key, value);
            }}
        }};
    """)

    page.goto("http://localhost:8081/dashboard/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")

    ls = page.evaluate("window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage (first 200): {ls[:200] if ls else 'NULL'}...")

    text = page.locator("body").inner_text()
    print(f"\nBody (first 400):\n{text[:400]}")

    h2s = [el.inner_text() for el in page.locator("h2").all()]
    print(f"\nh2 elements: {h2s}")
    print(f"Tables: {page.locator('[class*=\"ant-table\"]').count()}")

    page.screenshot(path="/tmp/e2e_debug18.png", full_page=True)
    browser.close()
