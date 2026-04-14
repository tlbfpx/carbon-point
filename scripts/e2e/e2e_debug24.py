"""Debug: try injecting auth via window.__AUTH before app loads"""
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

    page.add_init_script(f"""
        // Inject auth into window BEFORE any app JS runs
        window.__PRELOADED_AUTH__ = {json.dumps(auth_state)};

        // Override Zustand's persist to read from window.__PRELOADED_AUTH__
        const _origGet = window.localStorage.getItem.bind(window.localStorage);
        const _origSet = window.localStorage.setItem.bind(window.localStorage);

        window.localStorage.getItem = function(key) {{
            if (key === 'carbon-dashboard-auth') {{
                return JSON.stringify({{state: window.__PRELOADED_AUTH__, version: 0}});
            }}
            return _origGet.call(this, key);
        }};

        window.localStorage.setItem = function(key, value) {{
            if (key === 'carbon-dashboard-auth') {{
                // Store in window instead of localStorage
                window.__PRELOADED_AUTH__ = JSON.parse(value).state;
                return;
            }}
            _origSet.call(this, key, value);
        }};

        window.localStorage.removeItem = function(key) {{
            if (key === 'carbon-dashboard-auth') {{
                // Don't remove auth
                return;
            }}
            window.localStorage.removeItem.call(this, key);
        }};
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # Toggle to platform
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(2000)

    print(f"URL after toggle: {page.url}")

    # Check if Zustand has the auth
    zustand_auth = page.evaluate("window.__PRELOADED_AUTH__?.isAuthenticated")
    print(f"Zustand auth (via window): {zustand_auth}")

    # Now navigate using pushState + popstate
    page.evaluate("""
        window.history.pushState(null, '', '/dashboard/platform/enterprises');
        window.dispatchEvent(new PopStateEvent('popstate'));
    """)
    page.wait_for_timeout(3000)

    print(f"URL after nav: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Body (first 600):\n{text[:600]}")

    h2s = [el.inner_text() for el in page.locator("h2").all()]
    print(f"\nh2 elements: {h2s}")
    print(f"Tables: {page.locator('[class*=\"ant-table\"]').count()}")

    page.screenshot(path="/tmp/e2e_debug24.png", full_page=True)
    browser.close()
