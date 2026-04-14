"""Debug: test pushState navigation approach"""
from playwright.sync_api import sync_playwright
import json, urllib.request, time


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
    page.wait_for_timeout(5000)

    # Toggle to platform
    toggle_btn = page.locator('button:has-text("切换")').first
    toggle_btn.click()
    page.wait_for_timeout(3000)

    # Check URL
    print(f"URL after toggle: {page.url}")

    # Try navigate to /platform/enterprises using navigate directly
    page.evaluate("window.__navigate = (path) => { window.history.pushState(null, '', '/dashboard' + path); window.dispatchEvent(new PopStateEvent('popstate')); }")
    page.evaluate("window.__navigate('/platform/enterprises')")
    page.wait_for_timeout(3000)

    print(f"URL after nav: {page.url}")
    text = page.locator("body").inner_text()
    print(f"Body text (first 800):\n{text[:800]}")

    # Check if components rendered
    h2s = [el.inner_text() for el in page.locator("h2").all()]
    print(f"\nh2 elements: {h2s}")

    # Check for table
    print(f"Tables: {page.locator('[class*=\"ant-table\"]').count()}")

    # Check for "企业管理" heading (the h2 in the component)
    print(f"\n'企业管理' in text: {'企业管理' in text}")
    print(f"'企业名称' in text: {'企业名称' in text}")

    page.screenshot(path="/tmp/e2e_debug14.png", full_page=True)

    # Now try to directly set React state via __reactFiber
    # Try forcing a re-render by toggling and re-navigating
    print("\n\n=== Trying force render via React DevTools ===")

    # Try dispatching hashchange instead
    page.evaluate("window.location.hash = '#/platform/enterprises'")
    page.evaluate("window.dispatchEvent(new Event('hashchange'))")
    page.wait_for_timeout(3000)
    print(f"URL: {page.url}")
    text2 = page.locator("body").inner_text()
    print(f"Body (first 800):\n{text2[:800]}")
    h2s2 = [el.inner_text() for el in page.locator("h2").all()]
    print(f"h2 elements: {h2s2}")

    browser.close()
