"""Debug: find React Router navigate function"""
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

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(3000)

    # Toggle to platform
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(2000)

    # Find React Router navigate
    result = page.evaluate("""
        () => {
            // Find all React fiber roots
            const roots = [];
            const walkFiber = (fiber, depth = 0) => {
                if (depth > 30) return;
                const node = fiber.stateNode;
                if (node) {
                    // Check for Router context (has navigate/history/location)
                    if (node.navigate) {
                        roots.push({type: 'navigate', key: Object.keys(node).join(',')});
                    }
                    if (node.history) {
                        roots.push({type: 'history', keys: Object.keys(node.history).join(',')});
                    }
                    if (node.navigator) {
                        roots.push({type: 'navigator', key: Object.keys(node.navigator).join(',')});
                    }
                }
                if (fiber.return) walkFiber(fiber.return, depth + 1);
                if (fiber.child) walkFiber(fiber.child, depth + 1);
            };

            // Find all roots
            document.querySelectorAll('#root [data-reactroot]').forEach(el => {
                Object.keys(el).forEach(k => {
                    if (k.startsWith('__reactFiber') || k.startsWith('_reactRoot')) {
                        walkFiber(el[k]);
                    }
                });
            });

            // Try window level
            if (window.__reactRouter) {
                roots.push({type: 'window.__reactRouter'});
            }

            // Try to find useNavigate hooks by searching for 'navigate' in window
            for (const key of Object.keys(window)) {
                if (typeof window[key] === 'function' && key.toLowerCase().includes('navigate')) {
                    roots.push({type: 'window.' + key});
                }
            }

            return JSON.stringify(roots);
        }
    """)
    print(f"React internals: {result}")

    # Try using React Router v6's useNavigate via data-reactroot
    result2 = page.evaluate("""
        () => {
            // Try to find the router state via React DevTools globals
            // React 18 stores router state in the fiber
            const root = document.getElementById('root');
            const reactKey = Object.keys(root || {}).find(k => k.includes('react') || k.includes('Fiber'));
            if (!reactKey) return 'no react key';

            // Check for BrowserRouter's state
            let fiber = root[reactKey];
            let found = [];
            let steps = 0;
            while (fiber && steps < 50) {
                const sn = fiber.stateNode;
                if (sn) {
                    if (typeof sn.navigate === 'function') {
                        found.push('navigate: ' + sn.navigate.toString().substring(0, 50));
                    }
                    if (sn.history) {
                        found.push('history: push=' + typeof sn.history.push);
                    }
                }
                fiber = fiber.return;
                steps++;
            }

            // Try the Routes component
            fiber = root[reactKey];
            steps = 0;
            while (fiber && steps < 50) {
                const memo = fiber.memoizedState;
                if (memo && memo.element && memo.element.type && memo.element.type.name === 'Routes') {
                    found.push('Found Routes! path=' + (memo.element.props.path || 'none'));
                }
                fiber = fiber.return;
                steps++;
            }

            return found.length > 0 ? found.join('; ') : 'nothing found in ' + steps + ' steps';
        }
    """)
    print(f"Router search: {result2}")

    browser.close()
