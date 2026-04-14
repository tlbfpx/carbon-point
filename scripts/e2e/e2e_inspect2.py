"""Deep inspection of platform admin login page"""
from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Capture ALL console messages
    def log_console(msg):
        print(f"[CONSOLE-{msg.type}] {msg.text}")

    page.on("console", log_console)
    page.on("pageerror", lambda e: print(f"[PAGEERROR] {e}"))

    # Go to login page
    page.goto("http://localhost:8081/dashboard/platform/auth/login")
    page.wait_for_load_state("domcontentloaded")
    page.wait_for_timeout(5000)

    # Wait for any React rendering
    try:
        page.wait_for_selector("input", timeout=10000)
    except:
        print("No input found after 10s")

    # Take screenshot
    page.screenshot(path="/tmp/e2e_login_page2.png", full_page=True)
    print("Screenshot saved")

    # Get full HTML
    html = page.content()
    print(f"\n=== HTML LENGTH: {len(html)} ===")

    # Check for iframes
    iframes = page.locator("iframe").all()
    print(f"\n=== IFRAMES: {len(iframes)} ===")

    # Check root element
    root = page.locator("#root")
    print(f"Root element exists: {root.count() > 0}")
    if root.count() > 0:
        root_html = root.inner_html()
        print(f"Root inner HTML length: {len(root_html)}")
        print(f"Root first 300 chars: {root_html[:300]}")

    # Check if React loaded
    has_react = page.evaluate("() => document.getElementById('root')?.children?.length > 0")
    print(f"\nReact rendered (root has children): {has_react}")

    # Check all elements
    all_divs = page.locator("div").count()
    all_spans = page.locator("span").count()
    all_inputs = page.locator("input").count()
    print(f"All divs: {all_divs}, spans: {all_spans}, inputs: {all_inputs}")

    # Try different selectors
    selectors_to_try = [
        ".login-form input",
        ".ant-form input",
        "[class*='login'] input",
        "[class*='form'] input",
        "form input",
    ]
    for sel in selectors_to_try:
        count = page.locator(sel).count()
        print(f"  Selector '{sel}': {count}")

    browser.close()
