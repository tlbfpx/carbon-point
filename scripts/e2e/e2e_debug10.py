"""Debug: check page error details"""
from playwright.sync_api import sync_playwright
import json, urllib.request


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append({"type": msg.type, "text": msg.text}))
    page.on("pageerror", lambda err: console_msgs.append({"type": "pageerror", "text": str(err), "stack": getattr(err, 'stack', None)}))

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

    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")
    html = page.content()
    print(f"HTML length: {len(html)}")

    print(f"\nConsole messages ({len(console_msgs)}):")
    for msg in console_msgs:
        t = msg.get("type", "unknown")
        txt = msg.get("text", "")
        stack = msg.get("stack", "")
        print(f"\n  [{t}] {txt[:200]}")
        if stack:
            print(f"  Stack: {stack[:300]}")

    page.screenshot(path="/tmp/e2e_debug10.png", full_page=True)
    browser.close()
