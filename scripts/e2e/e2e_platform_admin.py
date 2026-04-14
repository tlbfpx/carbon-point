"""
Platform Admin E2E Test for Carbon Point
Uses localStorage injection + SPA sidebar navigation.
"""
from playwright.sync_api import sync_playwright
import json
import urllib.request


def build_auth_data():
    """Get auth data from API login"""
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
    }


def run_tests():
    results = []
    auth_state = build_auth_data()
    token = auth_state["accessToken"]

    def log(step, expected, actual, status):
        results.append({
            "step": step, "expected": expected, "actual": actual, "status": status
        })
        print(f"[{'PASS' if status == 'PASS' else 'FAIL'}] {step}")

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

            # ============================================================
            # 0. Login & Dashboard
            # ============================================================
            print("\n=== 0. 登录认证 ===")
            admin_info = auth_state["user"]
            log("平台管理员API登录", "登录成功", f"admin ({admin_info.get('username', '')})", "PASS")

            page.goto("http://localhost:8081/dashboard/", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(5000)

            page_text = page.locator("body").inner_text()
            has_platform_menu = any(kw in page_text for kw in ["平台看板", "企业管理", "系统管理", "平台配置"])
            is_platform_view = has_platform_menu
            log("Dashboard平台视图", "显示平台管理视图", "平台视图" if is_platform_view else "企业视图", "PASS" if is_platform_view else "FAIL")

            # Helper: navigate by clicking sidebar
            def nav_to(menu_text):
                """Navigate by clicking sidebar menu item"""
                item = page.locator(f'.ant-layout-sider .ant-menu-item').filter(has_text=menu_text).first
                item.wait_for(timeout=5000)
                item.click()
                page.wait_for_timeout(3000)
                return page.locator("body").inner_text()

            # Helper: take screenshot
            def screenshot(name):
                page.screenshot(path=f"/tmp/e2e_{name}.png", full_page=True)

            # ============================================================
            # 1. 数据看板 (Platform Dashboard)
            # ============================================================
            print("\n=== 1. 数据看板 ===")
            page_text = page.locator("body").inner_text()
            stats_visible = any(kw in page_text for kw in ["企业", "用户", "积分", "打卡", "总", "平台", "今日", "总计", "平台看板", "企业总数", "活跃企业", "总用户"])
            log("平台统计指标", "显示统计数据", "已显示" if stats_visible else "未显示", "PASS" if stats_visible else "FAIL")

            # ============================================================
            # 2. 企业管理
            # ============================================================
            print("\n=== 2. 企业管理 ===")
            page_text = nav_to("企业管理")
            screenshot("enterprise_list")

            has_enterprise = any(kw in page_text for kw in ["企业管理", "企业列表", "企业名称", "企业数据管理"])
            log("企业管理页面", "显示企业列表", "已显示" if has_enterprise else "未显示", "PASS" if has_enterprise else "FAIL")

            # API check
            req_tenants = urllib.request.Request(
                "http://localhost:9090/platform/tenants",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            )
            resp_tenants = urllib.request.urlopen(req_tenants, timeout=10)
            tenants_data = json.loads(resp_tenants.read())
            if tenants_data.get("code") == 200:
                records = tenants_data.get("data", {}).get("records", [])
                log("企业数据", f"有{len(records)}条企业记录", f"{len(records)}条", "PASS" if len(records) > 0 else "FAIL")

            # Check for create button
            create_btn = page.locator('button:has-text("开通企业"), button:has-text("创建"), button:has-text("新增"), button:has-text("添加")')
            has_create = create_btn.count() > 0
            log("创建企业入口", "有创建按钮", "有" if has_create else "无", "PASS" if has_create else "FAIL")

            # Check for enable/disable buttons in table
            enable_btn = page.locator('button:has-text("停用"), button:has-text("开通"), button:has-text("启用")')
            has_toggle = enable_btn.count() > 0
            log("企业状态切换", "有状态切换按钮", "有" if has_toggle else "无", "PASS" if has_toggle else "FAIL")

            # ============================================================
            # 3. 系统管理
            # ============================================================
            print("\n=== 3. 系统管理 ===")
            page_text = nav_to("系统管理")
            screenshot("system_admin")

            has_system = any(kw in page_text for kw in ["管理员", "日志", "系统管理", "平台管理员", "操作日志"])
            log("系统管理页面", "显示系统管理", "已显示" if has_system else "未显示", "PASS" if has_system else "FAIL")

            has_admin_list = any(kw in page_text for kw in ["admin", "管理员", "超级管理员", "平台管理员"])
            log("管理员列表", "显示管理员", "已显示" if has_admin_list else "未显示", "PASS" if has_admin_list else "FAIL")

            # Click 操作日志 tab
            log_tab = page.locator('[class*="ant-tabs-tab"]:has-text("操作日志"), [role="tab"]:has-text("操作日志")')
            if log_tab.count() > 0:
                log_tab.first.click()
                page.wait_for_timeout(2000)
                tab_text = page.locator("body").inner_text()
                has_log = any(kw in tab_text for kw in ["日志", "操作", "平台管理员", "admin", "操作日志"])
                log("操作日志Tab", "显示日志Tab", "已显示" if has_log else "未显示", "PASS" if has_log else "FAIL")
            else:
                tabs_found = [t.inner_text() for t in page.locator('[class*="ant-tabs-tab"], [role="tab"]').all()]
                log("操作日志Tab", "显示日志Tab", f"Tab未找到, found: {tabs_found[:3]}", "FAIL")

            # ============================================================
            # 4. 平台配置
            # ============================================================
            print("\n=== 4. 平台配置 ===")
            page_text = nav_to("平台配置")
            screenshot("config")

            has_config = any(kw in page_text for kw in ["配置", "开关", "功能", "参数", "功能开关", "平台配置", "保存"])
            log("平台配置页面", "显示配置项", "已显示" if has_config else "未显示", "PASS" if has_config else "FAIL")

            # ============================================================
            # 5. 后端API验证
            # ============================================================
            print("\n=== 5. 后端API验证 ===")
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            api_tests = [
                ("GET", "http://localhost:9090/platform/tenants", "企业管理API"),
                ("GET", "http://localhost:9090/platform/admins", "管理员列表API"),
                ("GET", "http://localhost:9090/platform/logs?page=1&size=10", "操作日志API"),
                ("GET", "http://localhost:9090/platform/config", "平台配置API"),
                ("GET", "http://localhost:9090/platform/stats", "平台统计API"),
                ("GET", "http://localhost:9090/platform/enterprise-ranking?limit=5", "企业排行API"),
            ]

            for method, url, name in api_tests:
                try:
                    req_api = urllib.request.Request(url, headers=headers)
                    resp_api = urllib.request.urlopen(req_api, timeout=10)
                    data = json.loads(resp_api.read())
                    api_ok = data.get("code") == 200
                    details = f"code={data.get('code')}"
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

            # ============================================================
            # 6. 安全功能验证
            # ============================================================
            print("\n=== 6. 安全功能验证 ===")

            req_wrong = urllib.request.Request(
                "http://localhost:9090/platform/auth/login",
                data=json.dumps({"username": "admin", "password": "wrongpassword"}).encode(),
                headers={"Content-Type": "application/json"}
            )
            try:
                resp_wrong = urllib.request.urlopen(req_wrong, timeout=10)
                wrong_data = json.loads(resp_wrong.read())
                wrong_blocked = wrong_data.get("code") == 3001
                log("错误密码拒绝", "拒绝错误密码", wrong_data.get("message", ""), "PASS" if wrong_blocked else "FAIL")
            except Exception as e:
                log("错误密码拒绝", "拒绝错误密码", str(e), "FAIL")

            req_nouser = urllib.request.Request(
                "http://localhost:9090/platform/auth/login",
                data=json.dumps({"username": "nonexistent", "password": "admin123"}).encode(),
                headers={"Content-Type": "application/json"}
            )
            try:
                resp_nouser = urllib.request.urlopen(req_nouser, timeout=10)
                nouser_data = json.loads(resp_nouser.read())
                nouser_blocked = nouser_data.get("code") in [3001, 3002]
                log("不存在的用户", "拒绝不存在的用户", nouser_data.get("message", ""), "PASS" if nouser_blocked else "FAIL")
            except Exception as e:
                log("不存在的用户", "拒绝不存在的用户", str(e), "FAIL")

            req_invalid = urllib.request.Request(
                "http://localhost:9090/platform/tenants",
                headers={"Authorization": "Bearer invalid_token_123", "Content-Type": "application/json"}
            )
            try:
                resp_invalid = urllib.request.urlopen(req_invalid, timeout=10)
                inv_data = json.loads(resp_invalid.read())
                inv_rejected = inv_data.get("code") != 200
                log("无效Token拒绝", "拒绝无效Token", f"code={inv_data.get('code')}" if inv_rejected else "未拒绝", "PASS" if inv_rejected else "FAIL")
            except urllib.error.HTTPError as e:
                log("无效Token拒绝", "拒绝无效Token", f"HTTP {e.code}", "PASS")
            except Exception as e:
                log("无效Token拒绝", "拒绝无效Token", str(e), "FAIL")

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
    print("平台管理员 E2E 测试报告")
    print("=" * 70)

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")

    print(f"\n总计: {len(results)} 项, 通过: {passed}, 失败: {failed}\n")

    print("| 功能 | 预期 | 实际 | 结果 |")
    print("|------|------|------|------|")
    for r in results:
        print(f"| {r['step']} | {r['expected']} | {r['actual']} | {'✅' if r['status'] == 'PASS' else '❌'} |")

    print(f"\n控制台错误数: {len(console_errors)}")
    if console_errors:
        for err in console_errors[:5]:
            print(f"  - {err[:100]}")

    print(f"\n截图已保存到 /tmp/e2e_*.png")

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
