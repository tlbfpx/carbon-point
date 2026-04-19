"""Debug: verify init script runs and localStorage state"""
from playwright.sync_api import sync_playwright
import json, urllib.request


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # Add a listener to capture console messages BEFORE navigating
    console_logs = []
    page.on("console", lambda msg: console_logs.append(msg.text))

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

    # Inject auth
    page.add_init_script(f"""
        window.__auth_injected = true;
        window.__auth_data = {json.dumps(auth_store_data)};
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{"state": {json.dumps(auth_store_data)}, "version": 0}}));
        console.log('INIT SCRIPT: Auth set, localStorage:', window.localStorage.getItem('carbon-dashboard-auth')?.substring(0, 50));
    """)

    # Also intercept requests to check localStorage before React
    page.on("request", lambda req: None)

    page.goto("http://localhost:8081/dashboard/platform/enterprises", wait_until="networkidle")
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")
    print(f"Console logs: {console_logs}")

    # Check __auth_injected
    injected = page.evaluate("window.__auth_injected")
    print(f"__auth_injected: {injected}")

    # Check localStorage
    ls = page.evaluate("window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage: {ls[:300] if ls else 'NULL'}...")

    text = page.locator("body").inner_text()
    print(f"\nBody (first 400):\n{text[:400]}")

    browser.close()
