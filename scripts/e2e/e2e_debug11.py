"""Debug: get full error details"""
from playwright.sync_api import sync_playwright
import json, urllib.request


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    errors = []
    def handle_console(msg):
        if msg.type == "error":
            errors.append({"type": "console_error", "text": msg.text, "location": msg.location})
        elif msg.type == "warning":
            errors.append({"type": "console_warn", "text": msg.text})
    page.on("console", handle_console)
    page.on("pageerror", lambda err: errors.append({"type": "pageerror", "text": str(err), "stack": err.stack}))

    # Login
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

    # Try to get the error before JS runs
    page.add_init_script("""
        window.__errors = [];
        window.addEventListener('error', function(e) {
            window.__errors.push({msg: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno});
        });
    """)

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)

    # Check window.__errors
    try:
        js_errors = page.evaluate("window.__errors || []")
        print(f"JS errors caught: {len(js_errors)}")
        for e in js_errors:
            print(f"  {e}")
    except Exception as e:
        print(f"Error checking __errors: {e}")

    # Check localStorage
    try:
        ls = page.evaluate("JSON.stringify(window.localStorage)")
        print(f"\nlocalStorage: {ls[:200]}")
    except Exception as e:
        print(f"Error checking localStorage: {e}")

    # Full error list
    print(f"\nAll errors ({len(errors)}):")
    for err in errors:
        print(f"  [{err['type']}] {err.get('text', '')[:200]}")
        if err.get('stack'):
            print(f"  Stack: {err['stack'][:300]}")
        if err.get('location'):
            print(f"  Location: {err['location']}")

    page.screenshot(path="/tmp/e2e_debug11.png", full_page=True)
    browser.close()
