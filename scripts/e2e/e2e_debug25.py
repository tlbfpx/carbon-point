"""Debug: find Zustand store and inject auth directly"""
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

    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps({
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
        })}, "version": 0}}));
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # Toggle to platform
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(2000)

    print(f"URL after toggle: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Body (first 300): {text[:300]}")

    # Find Zustand store
    zustand_result = page.evaluate("""
        () => {
            // Try to find Zustand store via window
            for (const key of Object.keys(window)) {
                if (typeof window[key] === 'object' && window[key] !== null) {
                    const obj = window[key];
                    if (obj.getState && obj.setState && obj.subscribe) {
                        // This looks like a Zustand store
                        const state = obj.getState();
                        return {
                            key: key,
                            hasIsAuthenticated: 'isAuthenticated' in state,
                            isAuthenticated: state.isAuthenticated,
                        };
                    }
                }
            }
            return 'no store found';
        }
    """)
    print(f"\nZustand search: {zustand_result}")

    # Try to find all objects in window with getState/setState
    all_stores = page.evaluate("""
        () => {
            const stores = [];
            for (const key of Object.keys(window)) {
                try {
                    const val = window[key];
                    if (val && typeof val === 'object' && val !== null) {
                        if (typeof val.getState === 'function' &&
                            typeof val.setState === 'function' &&
                            typeof val.subscribe === 'function') {
                            const state = val.getState();
                            stores.push({key, stateKeys: Object.keys(state).join(',')});
                        }
                    }
                } catch(e) {}
            }
            return stores;
        }
    """)
    print(f"All stores: {all_stores}")

    browser.close()
