"""Debug /login page and try to login"""
from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    def log_console(msg):
        if msg.type in ["error"]:
            print(f"[{msg.type}] {msg.text}")

    page.on("console", log_console)

    # Go directly to /login
    page.goto("http://localhost:8081/login")
    page.wait_for_timeout(5000)

    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")

    # Check for inputs
    inputs = page.locator("input").all()
    print(f"Inputs: {len(inputs)}")
    for i, inp in enumerate(inputs):
        attrs = inp.evaluate("""el => ({
            type: el.type, placeholder: el.placeholder || '',
            id: el.id || '', className: el.className.substring(0, 50)
        })""")
        print(f"  [{i}] {attrs}")

    # Check page text
    text = page.locator("body").inner_text()
    print(f"\nPage text: {text[:500]}")

    # Screenshot
    page.screenshot(path="/tmp/e2e_login_page_detail.png", full_page=True)

    # Try to fill and submit
    if len(inputs) > 0:
        try:
            # Find phone input
            phone_input = page.locator('input[placeholder*="手机"]')
            pwd_input = page.locator('input[type="password"]')
            submit_btn = page.locator('button:has-text("登录")')

            if phone_input.count() > 0:
                phone_input.fill("13800138000")
                pwd_input.fill("admin123")
                submit_btn.click()
                page.wait_for_timeout(3000)
                print(f"\nAfter submit URL: {page.url}")
                page.screenshot(path="/tmp/e2e_after_login.png", full_page=True)

                # Check menu
                menu_text = page.locator("body").inner_text()
                print(f"\nAfter login text: {menu_text[:1000]}")
            else:
                print("No phone input found")
        except Exception as e:
            print(f"Login error: {e}")

    browser.close()
