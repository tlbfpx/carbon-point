"""Debug: try toggling + JS navigation approach"""
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

    page.add_init_script(f"""
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_store_data)}, "version": 0}}));
    """)

    # 1. Load dashboard and toggle to platform view
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)
    print(f"After initial load: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Body (first 300): {text[:300]}")

    # Toggle
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(2000)
    print(f"After toggle: {page.url}")

    # 2. Now navigate using page.evaluate
    # First, check if we can find and update the App component state
    result = page.evaluate("""
        () => {
            // Find the root React element
            const root = document.getElementById('root');
            if (!root) return 'no root';

            // Try to find the App component's fiber
            const keys = Object.keys(root);
            const fiberKey = keys.find(k => k.startsWith('__reactFiber'));
            if (!fiberKey) return 'no fiber: ' + keys.join(', ');

            const fiber = root[fiberKey];
            if (!fiber) return 'no fiber';

            // Walk up to find App component with isPlatformAdmin state
            let current = fiber;
            let depth = 0;
            while (current && depth < 20) {
                const stateNode = current.stateNode;
                if (stateNode && typeof stateNode === 'object' && 'isPlatformAdmin' in stateNode) {
                    return 'FOUND App state! isPlatformAdmin=' + stateNode.isPlatformAdmin;
                }
                current = current.return;
                depth++;
            }
            return 'not found after ' + depth + ' steps';
        }
    """)
    print(f"\nReact fiber check: {result}")

    # Try using React Router's navigate
    result2 = page.evaluate("""
        () => {
            // Check if React Router is available
            const root = document.getElementById('root');
            const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber'));
            if (!fiberKey) return 'no fiber';

            // Find the BrowserRouter's state/navigate
            let current = root[fiberKey];
            let depth = 0;
            while (current && depth < 30) {
                const stateNode = current.stateNode;
                if (stateNode && typeof stateNode === 'object') {
                    // Check for navigate function or history object
                    if (typeof stateNode.navigate === 'function') {
                        return 'FOUND navigate!';
                    }
                    if (stateNode.history && typeof stateNode.history.push === 'function') {
                        return 'FOUND history push!';
                    }
                }
                current = current.return;
                depth++;
            }
            return 'navigate not found in ' + depth + ' steps';
        }
    """)
    print(f"Router check: {result2}")

    # Now try to set isPlatformAdmin via React internals
    result3 = page.evaluate("""
        () => {
            const root = document.getElementById('root');
            const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber'));
            if (!fiberKey) return 'no fiber';

            let current = root[fiberKey];
            let depth = 0;
            let found = false;
            while (current && depth < 30) {
                const stateNode = current.stateNode;
                if (stateNode && typeof stateNode === 'object' && 'isPlatformAdmin' in stateNode) {
                    stateNode.isPlatformAdmin = true;
                    found = true;
                    // Try to trigger re-render
                    const setState = current.memoizedState;
                    if (setState && setState.memoizedState) {
                        return 'Found and updated!';
                    }
                    return 'Found and updated (simple)';
                }
                current = current.return;
                depth++;
            }
            return 'Not found: ' + depth;
        }
    """)
    print(f"isPlatformAdmin update: {result3}")

    # Check if state changed
    text2 = page.locator("body").inner_text()
    print(f"\nBody after update (first 300): {text2[:300]}")
    print(f"URL: {page.url}")

    browser.close()
