"""
Platform System Management Page E2E Test v2
Debug version - examines page content more carefully
"""
from playwright.sync_api import sync_playwright
import json
import urllib.request


def build_auth_data():
    """Get auth data from API login"""
    req = urllib.request.Request(
        "http://localhost:8080/platform/auth/login",
        data=json.dumps({"username": "admin", "password": "admin123"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=10)
    login_data = json.loads(resp.read())
    token = login_data["data"]["accessToken"]
    admin_info = login_data["data"]["admin"]
    return {
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
    }, token


def run_tests():
    results = []
    auth_state, token = build_auth_data()

    def log(step, expected, actual, status):
        results.append({
            "step": step, "expected": expected, "actual": actual, "status": status
        })
        print(f"[{'PASS' if status == 'PASS' else 'FAIL'}] {step}: {actual}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        console_errors = []

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        try:
            # Inject auth into localStorage before page loads
            page.add_init_script(f"""
                window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{state: {json.dumps(auth_state)}, version: 0}}));
            """)

            print("\n=== 0. Login ===")
            page.goto("http://localhost:3002/platform.html#/platform/system", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(5000)

            # Check what page is actually displayed
            page_text = page.locator("body").inner_text()
            print(f"\nPage content preview (first 500 chars):\n{page_text[:500]}")

            # Get all menu items
            menu_items = page.locator('.ant-layout-sider .ant-menu-item')
            menu_count = menu_items.count()
            print(f"\nMenu items found: {menu_count}")
            for i in range(min(menu_count, 10)):
                try:
                    text = menu_items.nth(i).inner_text()
                    print(f"  Menu {i}: {text}")
                except:
                    pass

            # Check URL
            current_url = page.url
            print(f"\nCurrent URL: {current_url}")

            # Check if we're on system management
            has_system_title = "系统管理" in page_text
            has_admin_list = any(kw in page_text for kw in ["平台管理员", "admin", "用户名", "手机号", "角色"])
            has_logs = any(kw in page_text for kw in ["操作日志", "操作人", "操作类型"])

            log("页面标题-系统管理", "显示", "已显示" if has_system_title else "未显示", "PASS" if has_system_title else "FAIL")
            log("管理员列表内容", "显示", "已显示" if has_admin_list else "未显示", "PASS" if has_admin_list else "FAIL")
            log("操作日志内容", "显示", "已显示" if has_logs else "未显示", "PASS" if has_logs else "FAIL")

            # Check for Tabs
            tabs = page.locator('.ant-tabs-tab')
            tab_count = tabs.count()
            tab_texts = [t.inner_text() for t in tabs.all()]
            print(f"\nTabs found ({tab_count}): {tab_texts}")
            log("Tabs存在", "至少有admins和logs", f"{tab_texts}", "PASS" if tab_count >= 2 else "FAIL")

            # Check for table
            table = page.locator('.ant-table')
            has_table = table.count() > 0
            log("表格显示", "显示", "已显示" if has_table else "未显示", "PASS" if has_table else "FAIL")

            # Get table headers if table exists
            if has_table:
                headers = page.locator('.ant-table-thead th')
                header_texts = [h.inner_text() for h in headers.all()]
                print(f"Table headers: {header_texts}")
                log("表格列标题", "包含用户名/角色等", f"{header_texts}", "PASS" if any("用户名" in h for h in header_texts) else "FAIL")

            # Check for buttons
            all_buttons = page.locator('button')
            button_texts = [b.inner_text() for b in all_buttons.all()]
            print(f"\nButtons found: {button_texts[:10]}")
            log("创建管理员按钮", "存在", "存在" if any("创建管理员" in b for b in button_texts) else "不存在", "PASS" if any("创建管理员" in b for b in button_texts) else "FAIL")

            # Check if we can click on 操作日志 tab
            log_tab = page.locator('.ant-tabs-tab').filter(has_text="操作日志")
            if log_tab.count() > 0:
                log_tab.first.click()
                page.wait_for_timeout(2000)
                log_page_text = page.locator("body").inner_text()
                has_log_filter = "操作人" in log_page_text or "操作类型" in log_page_text
                log("操作日志Tab切换", "成功", "成功" if has_log_filter else "未显示筛选", "PASS" if has_log_filter else "FAIL")

                # Check for filter fields in logs tab
                filter_inputs = page.locator('.ant-form-item')
                filter_count = filter_inputs.count()
                log("日志筛选表单", "有筛选", f"{filter_count}个筛选项", "PASS" if filter_count >= 3 else "FAIL")

            # Test API directly
            print("\n=== API Tests ===")
            headers_auth = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            api_tests = [
                ("GET", "http://localhost:8080/platform/admins", "管理员列表API"),
                ("GET", "http://localhost:8080/platform/logs?page=1&size=10", "操作日志API"),
            ]

            for method, url, name in api_tests:
                try:
                    req_api = urllib.request.Request(url, headers=headers_auth)
                    resp_api = urllib.request.urlopen(req_api, timeout=10)
                    data = json.loads(resp_api.read())
                    api_ok = data.get("code") == 200
                    details = f"code={data.get('code')}"
                    log(name, "返回200", details, "PASS" if api_ok else "FAIL")
                except Exception as e:
                    log(name, "返回200", str(e)[:50], "FAIL")

            print("\n=== Console Errors ===")
            print(f"Total console errors: {len(console_errors)}")
            for i, err in enumerate(console_errors[:10], 1):
                print(f"  {i}. {err[:200]}")

            log("控制台错误", "无CORS错误", f"{len(console_errors)}个错误", "PASS" if len(console_errors) == 0 else "FAIL")

        except Exception as e:
            print(f"[ERROR] Test exception: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

    # ============================================================
    # Generate report
    # ============================================================
    print("\n" + "=" * 70)
    print("系统管理页面 E2E 测试报告 v2")
    print("=" * 70)

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")

    print(f"\n总计: {len(results)} 项, 通过: {passed}, 失败: {failed}\n")

    print("| 功能 | 预期 | 实际 | 结果 |")
    print("|------|------|------|------|")
    for r in results:
        print(f"| {r['step']} | {r['expected']} | {r['actual']} | {'PASS' if r['status'] == 'PASS' else 'FAIL'} |")

    print("\n" + "=" * 70)
    print("问题汇总")
    print("=" * 70)
    failed_items = [r for r in results if r["status"] == "FAIL"]
    if failed_items:
        for i, item in enumerate(failed_items, 1):
            print(f"{i}. {item['step']}: {item['actual']}")
    else:
        print("全部通过!")

    return results, console_errors


if __name__ == "__main__":
    run_tests()