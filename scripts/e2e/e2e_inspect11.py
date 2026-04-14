"""Debug: check Zustand store state and persist format"""
from playwright.sync_api import sync_playwright
import json


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()

    # First: inject auth WITHOUT using add_init_script, set it via evaluate AFTER page loads
    page.goto("http://localhost:8081/dashboard/", wait_until="networkidle")
    page.wait_for_timeout(2000)

    print(f"URL after first load: {page.url}")

    # Get localStorage BEFORE injecting
    ls_before = page.evaluate("() => window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage before inject: {ls_before[:200] if ls_before else 'null'}")

    # Check if Zustand store exists
    has_zustand = page.evaluate("() => typeof window.__zustand_store__ !== 'undefined'")
    print(f"Zustand store on window: {has_zustand}")

    # Check Zustand stores - try to find it
    stores = page.evaluate("""() => {
        // Try to access zustand stores
        const keys = Object.keys(window).filter(k => k.includes('zustand') || k.includes('store'));
        return keys;
    }""")
    print(f"Window keys with 'zustand'/'store': {stores}")

    # Now inject auth via evaluate and check if it triggers re-render
    import urllib.request
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

    auth_user = {
        "userId": str(admin_info["id"]),
        "username": admin_info["username"],
        "roles": [admin_info["role"]],
        "permissions": ["*"],
        "isPlatformAdmin": True,
    }
    auth_store_data = {
        "accessToken": token,
        "refreshToken": refresh_token,
        "user": auth_user,
        "isAuthenticated": True,
    }

    # Inject with Zustand wrap format
    zustand_wrapped = {"state": auth_store_data, "version": 0}
    page.evaluate(f"""() => {{
        window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({json.dumps(zustand_wrapped)}));
        console.log('Injected zustand-wrapped format');
    }}""")

    # Also try setting via direct localStorage.setItem with raw format
    page.evaluate(f"""() => {{
        window.localStorage.setItem('carbon-dashboard-auth-raw', JSON.stringify({json.dumps(auth_store_data)}));
        console.log('Injected raw format');
    }}""")

    ls_after = page.evaluate("() => window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"\nlocalStorage after inject (wrapped): {ls_after[:200] if ls_after else 'null'}")

    ls_raw = page.evaluate("() => window.localStorage.getItem('carbon-dashboard-auth-raw')")
    print(f"localStorage raw: {ls_raw[:200] if ls_raw else 'null'}")

    # Now reload and check
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(2000)

    print(f"\nURL after reload: {page.url}")
    ls_reload = page.evaluate("() => window.localStorage.getItem('carbon-dashboard-auth')")
    print(f"localStorage after reload (wrapped): {ls_reload[:200] if ls_reload else 'null'}")

    # Check what Zustand reads
    page_text = page.locator("body").inner_text()
    print(f"\nPage text after reload (first 300): {page_text[:300]}")

    # Check login form
    login_form = page.locator('form')
    print(f"Forms found: {login_form.count()}")

    # Check URL - is it still on /login?
    if "/login" in page.url:
        print("Still on login page - persist is NOT working")

        # Try direct navigation to dashboard hash route
        page.goto("http://localhost:8081/dashboard/#/platform/dashboard", wait_until="networkidle")
        page.wait_for_timeout(2000)
        print(f"\nURL after hash nav: {page.url}")
        page_text2 = page.locator("body").inner_text()
        print(f"Page text (first 300): {page_text2[:300]}")

    else:
        print("Successfully bypassed login - on dashboard!")

    browser.close()
