"""Debug: find React root and state via React internals"""
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

    # Check current state
    print(f"URL: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Body (first 300): {text[:300]}")

    # Find React roots
    result = page.evaluate("""
        () => {
            const results = {};

            // Method 1: Find all React root containers
            const roots = [];
            for (const [key, value] of Object.entries(window)) {
                if (key.startsWith('__reactContainer') ||
                    key.startsWith('_reactRootContainer') ||
                    key.includes('react') && typeof value === 'object' && value !== null) {
                    roots.push({k: key, t: typeof value});
                }
            }
            results['roots'] = roots.slice(0, 5);

            // Method 2: Check document for react roots
            const rootEl = document.getElementById('root');
            if (rootEl) {
                const reactKeys = Object.keys(rootEl).filter(k => k.includes('react') || k.includes('fiber') || k.includes('Fiber'));
                results['rootReactKeys'] = reactKeys;
                if (reactKeys.length > 0) {
                    const fiber = rootEl[reactKeys[0]];
                    if (fiber && fiber.memoizedState) {
                        results['memoType'] = fiber.memoizedState?.element?.type?.name || 'no name';
                    }
                }
            }

            // Method 3: Check for __reactFiber$ pattern
            const fiberEl = document.querySelector('[data-reactroot]');
            if (fiberEl) {
                const fiberKeys = Object.keys(fiberEl).filter(k => k.includes('react') || k.includes('fiber') || k.includes('Fiber'));
                results['fiberElKeys'] = fiberKeys;
            }

            // Method 4: window properties
            const winKeys = Object.keys(window).filter(k => k.includes('react') || k.includes('React'));
            results['winReactKeys'] = winKeys.slice(0, 10);

            // Method 5: Check if we can find the BrowserRouter's state via history
            const allKeys = Object.keys(window);
            const historyKeys = allKeys.filter(k => k.toLowerCase().includes('history') || k.toLowerCase().includes('navigate'));
            results['historyKeys'] = historyKeys.slice(0, 10);

            return JSON.stringify(results, null, 2);
        }
    """)
    print(f"\nReact internals:\n{result}")

    browser.close()
