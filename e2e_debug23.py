"""Debug: use React Router history to navigate"""
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

    auth_state = {
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
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_state)}, "version": 0}}));
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # Toggle to platform
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(2000)

    print(f"URL after toggle: {page.url}")

    # Check what history is available
    history_info = page.evaluate("""
        () => {
            const h = window.history;
            return {
                length: h.length,
                state: h.state,
                scrollRestoration: h.scrollRestoration,
                methods: ['pushState', 'replaceState', 'back', 'forward', 'go'].filter(m => typeof h[m] === 'function'),
                // Check __reactRouter
                routerVersion: window.__reactRouterVersion,
            };
        }
    """)
    print(f"\nHistory info: {history_info}")

    # Try using React Router's navigate via history
    result = page.evaluate("""
        () => {
            // React Router v6 exposes a navigate function on window
            if (typeof window.__reactRouter !== 'undefined') {
                return 'Found __reactRouter: ' + typeof window.__reactRouter;
            }

            // Try to find navigate in the React fiber tree
            const root = document.getElementById('root');
            const reactKey = Object.keys(root || {}).find(k => k.startsWith('__reactContainer'));
            if (!reactKey) return 'no react container';

            let fiber = root[reactKey];
            let depth = 0;
            let found = [];
            while (fiber && depth < 50) {
                const sn = fiber.stateNode;
                if (sn) {
                    if (typeof sn.navigate === 'function') {
                        found.push('navigate fn found at depth ' + depth);
                    }
                    if (sn.history) {
                        found.push('history found at depth ' + depth + ': ' + typeof sn.history.push);
                    }
                    if (typeof sn.navigator === 'object') {
                        found.push('navigator at depth ' + depth);
                    }
                }
                fiber = fiber.return;
                depth++;
            }

            return found.length > 0 ? found.join('; ') : 'nothing found in ' + depth + ' steps';
        }
    """)
    print(f"\nFiber search: {result}")

    # Try to navigate using history.pushState
    page.evaluate("""
        window.history.pushState(null, '', '/dashboard/platform/enterprises');
        window.dispatchEvent(new PopStateEvent('popstate'));
    """)
    page.wait_for_timeout(2000)
    print(f"\nURL after pushState: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Body (first 400): {text[:400]}")

    h2s = [el.inner_text() for el in page.locator("h2").all()]
    print(f"h2 elements: {h2s}")

    page.screenshot(path="/tmp/e2e_debug23.png", full_page=True)
    browser.close()
