"""Debug: call login API from within browser context"""
from playwright.sync_api import sync_playwright
import json


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Navigate to dashboard (no pre-injection)
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(2000)

    print(f"URL: {page.url}")

    # Call the login API from within the page
    result = page.evaluate("""async () => {
        try {
            const resp = await fetch('http://localhost:9090/platform/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: 'admin', password: 'admin123'})
            });
            const data = await resp.json();
            return { ok: resp.ok, code: data.code, hasToken: !!data.data?.accessToken };
        } catch(e) {
            return { error: e.message };
        }
    }""")

    print(f"Login from browser: {result}")

    # Check localStorage
    ls = page.evaluate("() => window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage: {ls[:100] if ls else 'null'}")

    # Try calling Zustand store API directly - need to find the store
    # In Zustand 4.x, stores are not exposed on window by default
    # But we can try to find them via the React DevTools or by accessing React internals

    # Alternative: manually set Zustand's persist storage before store creation
    # We can override localStorage.setItem to capture what Zustand writes
    page.evaluate("""() => {
        // Override localStorage to see what Zustand stores
        const origSetItem = window.localStorage.setItem.bind(window.localStorage);
        window.localStorage.setItem = function(key, value) {
            console.log('localStorage.setItem:', key, value ? value.substring(0, 100) : null);
            return origSetItem(key, value);
        };
        const origGetItem = window.localStorage.getItem.bind(window.localStorage);
        window.localStorage.getItem = function(key) {
            const val = origGetItem(key);
            console.log('localStorage.getItem:', key, val ? val.substring(0, 100) : null);
            return val;
        };
    }""")

    # Reload and watch the logs
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(3000)

    print(f"\nURL after reload: {page.url}")
    print(f"Page text: {page.locator('body').inner_text()[:200]}")

    # Check console logs from the page
    console_logs = []
    page.on("console", lambda msg: console_logs.append(msg.text))
    page.wait_for_timeout(1000)
    for log in console_logs[-20:]:
        print(f"  LOG: {log}")

    browser.close()
