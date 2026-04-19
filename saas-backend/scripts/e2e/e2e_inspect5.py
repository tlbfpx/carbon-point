"""Inspect the actual dashboard login page"""
from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Capture ALL console messages
    def log_console(msg):
        if msg.type in ["error", "warning"]:
            print(f"[CONSOLE-{msg.type}] {msg.text}")

    page.on("console", log_console)

    # Go to the platform admin login page
    page.goto("http://localhost:8081/dashboard/platform/auth/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(5000)

    print(f"URL after load: {page.url}")
    print(f"Title: {page.title()}")

    # Take screenshot
    page.screenshot(path="/tmp/e2e_login_full.png", full_page=True)
    print("Screenshot saved")

    # Get all inputs
    inputs = page.locator("input").all()
    print(f"\n=== INPUTS ({len(inputs)}) ===")
    for i, inp in enumerate(inputs):
        try:
            attrs = inp.evaluate("""el => ({
                type: el.type,
                placeholder: el.placeholder || '',
                name: el.name || '',
                id: el.id || '',
                className: el.className.substring(0, 100)
            })""")
            print(f"  [{i}] {attrs}")
        except Exception as e:
            print(f"  [{i}] Error: {e}")

    # Get all buttons
    buttons = page.locator("button").all()
    print(f"\n=== BUTTONS ({len(buttons)}) ===")
    for i, btn in enumerate(buttons):
        try:
            attrs = btn.evaluate("""el => ({
                text: (el.innerText || '').trim().substring(0, 50),
                type: el.type || '',
                className: el.className.substring(0, 100)
            })""")
            print(f"  [{i}] {attrs}")
        except Exception as e:
            print(f"  [{i}] Error: {e}")

    # Check page text
    text = page.locator("body").inner_text()
    print(f"\n=== PAGE TEXT (first 1000 chars) ===")
    print(text[:1000])

    # Get page content for inspection
    root = page.locator('#root')
    root_html = root.inner_html()
    print(f"\n=== ROOT HTML (first 500 chars) ===")
    print(root_html[:500])

    browser.close()
