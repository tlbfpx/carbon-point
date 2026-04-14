"""Debug: test localStorage override approach - fixed encoding"""
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

    auth_state = {
        "accessToken": token,
        "refreshToken": refresh_token,
        "user": {
            "userId": str(admin_info["id"]),
            "username": admin_info["username"],
            "roles": [admin_info["role"]],
            "permissions": ["*"],
            "isPlatformAdmin": True,
        },
        "isAuthenticated": True,
    }

    auth_json = json.dumps({"state": auth_state, "version": 0})

    page.add_init_script("""
        const AUTH_KEY = 'carbon-dashboard-auth';
        const AUTH_VALUE = __AUTH_JSON__;

        // Override getItem to return our auth for Zustand
        const _origGet = window.localStorage.getItem.bind(window.localStorage);
        window.localStorage.getItem = function(key) {
            if (key === AUTH_KEY) {
                console.log('OVERRIDE getItem for ' + key + ': returning injected auth');
                return AUTH_VALUE;
            }
            return _origGet.call(this, key);
        };

        // Override setItem to prevent Zustand from overwriting
        const _origSet = window.localStorage.setItem.bind(window.localStorage);
        window.localStorage.setItem = function(key, value) {
            if (key === AUTH_KEY) {
                console.log('BLOCKED setItem for ' + key);
                return;
            }
            _origSet.call(this, key, value);
        };

        // Set actual value too
        _origSet.call(window.localStorage, AUTH_KEY, AUTH_VALUE);
    """.replace("__AUTH_JSON__", json.dumps(auth_json)))

    page.goto("http://localhost:8081/dashboard/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")
    ls = page.evaluate("window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage (first 200): {ls[:200] if ls else 'NULL'}...")

    text = page.locator("body").inner_text()
    print(f"\nBody (first 600):\n{text[:600]}")

    h2s = [el.inner_text() for el in page.locator("h2").all()]
    print(f"\nh2 elements: {h2s}")
    print(f"Tables: {page.locator('[class*=\"ant-table\"]').count()}")

    page.screenshot(path="/tmp/e2e_debug21.png", full_page=True)
    browser.close()
