"""
Platform System Management Page E2E Test for Carbon Point
Tests: Login, System Management Page, UI elements, buttons, console errors
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
    refresh_token = login_data["data"]["refreshToken"]
    admin_info = login_data["data"]["admin"]
    return {
        "accessToken": token,
        "refreshToken": refresh_token,
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
        api_requests = []

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # Track API requests/responses
        def on_response(response):
            try:
                api_requests.append({
                    "url": response.url,
                    "status": response.status,
                    "method": response.request.method
                })
            except:
                pass
        page.on("response", on_response)

        try:
            # Inject auth into localStorage before page loads
            page.add_init_script(f"""
                window.localStorage.setItem('carbon-dashboard-auth', JSON.stringify({{state: {json.dumps(auth_state)}, version: 0}}));
            """)

            print("\n=== 0. 登录认证 ===")
            admin_info = auth_state["user"]
            log("平台管理员API登录", "登录成功", f"admin ({admin_info.get('username', '')})", "PASS")

            # Navigate to platform dashboard first
            page.goto("http://localhost:3002/platform.html", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            print("\n=== 1. 系统管理页面 ===")

            # Click on 系统管理 sidebar menu
            system_menu = page.locator('.ant-layout-sider .ant-menu-item').filter(has_text="系统管理").first
            if system_menu.count() > 0:
                system_menu.click()
                page.wait_for_timeout(3000)
                log("系统管理菜单点击", "能点击", "成功点击", "PASS")
            else:
                log("系统管理菜单点击", "能点击", "菜单未找到", "FAIL")

            # Check page title
            page_text = page.locator("body").inner_text()
            has_title = "系统管理" in page_text
            log("系统管理页面标题", "显示系统管理", "已显示" if has_title else "未显示", "PASS" if has_title else "FAIL")

            print("\n=== 2. 平台管理员 Tab ===")

            # Check for Tabs
            tabs = page.locator('.ant-tabs-tab')
            tab_count = tabs.count()
            log("Tab数量", "至少有管理员Tab", f"{tab_count}个Tab", "PASS" if tab_count >= 1 else "FAIL")

            # Check admin list table
            table = page.locator('.ant-table')
            has_table = table.count() > 0
            log("管理员表格", "显示表格", "已显示" if has_table else "未显示", "PASS" if has_table else "FAIL")

            # Check for 创建管理员 button
            create_btn = page.locator('button').filter(has_text="创建管理员")
            has_create_btn = create_btn.count() > 0
            log("创建管理员按钮", "显示创建按钮", "已显示" if has_create_btn else "未显示", "PASS" if has_create_btn else "FAIL")

            # Check table headers
            headers = page.locator('.ant-table-thead th')
            header_texts = [h.inner_text() for h in headers.all()]
            expected_headers = ["用户名", "手机号", "邮箱", "角色", "状态", "最后登录", "创建时间", "操作"]
            headers_found = all(any(exp in h for h in header_texts) for exp in expected_headers[:4])
            log("表格列标题", "显示关键列", f"列: {header_texts[:5]}", "PASS" if headers_found else "FAIL")

            # Check for edit and delete buttons in table
            edit_btns = page.locator('button.ant-btn-link').filter(has_text="")
            has_action_btns = edit_btns.count() > 0
            log("操作按钮(编辑/删除)", "显示操作按钮", f"找到{edit_btns.count()}个", "PASS" if has_action_btns else "FAIL")

            # Test Create Admin Modal
            if has_create_btn:
                create_btn.first.click()
                page.wait_for_timeout(1000)
                modal = page.locator('.ant-modal')
                has_modal = modal.count() > 0
                log("创建管理员弹窗", "弹窗打开", "已显示" if has_modal else "未显示", "PASS" if has_modal else "FAIL")

                # Check modal form fields
                form_labels = page.locator('.ant-form-item-label label')
                label_texts = [l.inner_text() for l in form_labels.all()]
                has_username_field = any("用户名" in l for l in label_texts)
                has_phone_field = any("手机号" in l for l in label_texts)
                has_password_field = any("密码" in l for l in label_texts)
                has_roles_field = any("角色" in l for l in label_texts)
                log("表单字段-用户名", "显示用户名", "已显示" if has_username_field else "未显示", "PASS" if has_username_field else "FAIL")
                log("表单字段-手机号", "显示手机号", "已显示" if has_phone_field else "未显示", "PASS" if has_phone_field else "FAIL")
                log("表单字段-密码", "显示密码", "已显示" if has_password_field else "未显示", "PASS" if has_password_field else "FAIL")
                log("表单字段-角色", "显示角色", "已显示" if has_roles_field else "未显示", "PASS" if has_roles_field else "FAIL")

                # Close modal
                cancel_btn = page.locator('.ant-modal button').filter(has_text="取消")
                if cancel_btn.count() > 0:
                    cancel_btn.first.click()
                    page.wait_for_timeout(500)

            print("\n=== 3. 操作日志 Tab ===")

            # Click on 操作日志 tab
            log_tab = page.locator('.ant-tabs-tab').filter(has_text="操作日志")
            if log_tab.count() > 0:
                log_tab.first.click()
                page.wait_for_timeout(2000)
                log("操作日志Tab点击", "能切换", "成功切换", "PASS")

                # Check filter fields
                filter_page_text = page.locator("body").inner_text()
                has_operator_filter = any("操作人" in filter_page_text for _ in [1])
                has_action_filter = any("操作类型" in filter_page_text for _ in [1])
                has_date_filter = any("时间" in filter_page_text for _ in [1])
                log("日志筛选-操作人", "显示筛选", "已显示" if has_operator_filter else "未显示", "PASS" if has_operator_filter else "FAIL")
                log("日志筛选-操作类型", "显示筛选", "已显示" if has_action_filter else "未显示", "PASS" if has_action_filter else "FAIL")
                log("日志筛选-时间范围", "显示筛选", "已显示" if has_date_filter else "未显示", "PASS" if has_date_filter else "FAIL")

                # Check search and reset buttons
                search_btn = page.locator('button').filter(has_text="查询")
                reset_btn = page.locator('button').filter(has_text="重置")
                refresh_btn = page.locator('button').filter(has_text="刷新")
                log("查询按钮", "显示查询", "已显示" if search_btn.count() > 0 else "未显示", "PASS" if search_btn.count() > 0 else "FAIL")
                log("重置按钮", "显示重置", "已显示" if reset_btn.count() > 0 else "未显示", "PASS" if reset_btn.count() > 0 else "FAIL")
                log("刷新按钮", "显示刷新", "已显示" if refresh_btn.count() > 0 else "未显示", "PASS" if refresh_btn.count() > 0 else "FAIL")

                # Check log table
                log_table = page.locator('.ant-table')
                has_log_table = log_table.count() > 0
                log("日志表格", "显示表格", "已显示" if has_log_table else "未显示", "PASS" if has_log_table else "FAIL")
            else:
                log("操作日志Tab点击", "能切换", "Tab未找到", "FAIL")

            print("\n=== 4. API 验证 ===")

            # Test APIs directly
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
                    status_code = resp_api.getcode()
                    details = f"code={data.get('code')}, status={status_code}"
                    log(name, "返回200", details, "PASS" if api_ok else "FAIL")
                except urllib.error.HTTPError as e:
                    resp_body = e.read().decode()
                    try:
                        err_data = json.loads(resp_body)
                        log(name, "返回200", f"HTTP {e.code}, code={err_data.get('code')}", "FAIL")
                    except:
                        log(name, "返回200", f"HTTP {e.code}", "FAIL")
                except Exception as e:
                    log(name, "返回200", str(e)[:50], "FAIL")

            print("\n=== 5. 控制台错误 ===")
            log("控制台错误数量", "无错误", f"{len(console_errors)}个错误", "PASS" if len(console_errors) == 0 else "FAIL")
            if console_errors:
                for i, err in enumerate(console_errors[:5], 1):
                    print(f"  Error {i}: {err[:200]}")

            print("\n=== 6. API 请求汇总 ===")
            platform_apis = [r for r in api_requests if 'localhost:9090/platform' in r['url']]
            for api in platform_apis:
                print(f"  {api['method']} {api['url']} -> {api['status']}")

        except Exception as e:
            print(f"[ERROR] 测试异常: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

    # ============================================================
    # Generate report
    # ============================================================
    print("\n" + "=" * 70)
    print("系统管理页面 E2E 测试报告")
    print("=" * 70)

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")

    print(f"\n总计: {len(results)} 项, 通过: {passed}, 失败: {failed}\n")

    print("| 功能 | 预期 | 实际 | 结果 |")
    print("|------|------|------|------|")
    for r in results:
        print(f"| {r['step']} | {r['expected']} | {r['actual']} | {'PASS' if r['status'] == 'PASS' else 'FAIL'} |")

    print(f"\n控制台错误数: {len(console_errors)}")
    if console_errors:
        print("控制台错误:")
        for i, err in enumerate(console_errors[:5], 1):
            print(f"  {i}. {err[:150]}")

    print("\n" + "=" * 70)
    print("发现的问题")
    print("=" * 70)
    failed_items = [r for r in results if r["status"] == "FAIL"]
    if failed_items:
        for i, item in enumerate(failed_items, 1):
            print(f"{i}. [{item['step']}] {item['actual']}")
    else:
        print("全部通过!")

    return results, console_errors


if __name__ == "__main__":
    run_tests()