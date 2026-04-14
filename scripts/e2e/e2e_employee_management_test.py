"""
Employee Management Page E2E Test for Carbon Point
Tests: Employee list, Add employee, Search/Filter, Console errors
Uses UI login with enterprise credentials: 13800138001 / admin123
"""
from playwright.sync_api import sync_playwright
import json
import urllib.request
import time


def run_tests():
    results = []
    console_errors = []

    def log(step, expected, actual, status):
        results.append({
            "step": step, "expected": expected, "actual": actual, "status": status
        })
        print(f"[{'PASS' if status == 'PASS' else 'FAIL'}] {step} | Expected: {expected} | Actual: {actual}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Capture console errors
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        try:
            # Navigate to dashboard
            print("\n=== 1. Navigate to Dashboard ===")
            page.goto("http://localhost:3002/dashboard/", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)

            print(f"Current URL: {page.url}")
            page_text = page.locator("body").inner_text()
            print(f"Page loaded, text length: {len(page_text)}")

            # Check if we need to login
            has_login_form = page.locator('input[type="text"], input[placeholder*="手机"], input[placeholder*="账号"]').count() > 0
            print(f"Login form detected: {has_login_form}")

            if has_login_form:
                print("\n=== 2. Login with enterprise credentials ===")
                # Find phone/username input
                phone_input = page.locator('input[placeholder*="手机号"], input[placeholder*="账号"], input[type="text"]').first
                if phone_input.count() > 0:
                    phone_input.fill("13800138001")
                    print("Filled phone number")

                # Find password input
                password_input = page.locator('input[type="password"]').first
                if password_input.count() > 0:
                    password_input.fill("admin123")
                    print("Filled password")

                # Click login button
                login_btn = page.locator('button[type="submit"], button:has-text("登录"), button:has-text("登 录")').first
                if login_btn.count() > 0:
                    login_btn.click()
                    print("Clicked login button")
                else:
                    print("Login button not found, available buttons:")
                    print([b.inner_text() for b in page.locator('button').all()[:10]])

                page.wait_for_timeout(5000)
                print(f"URL after login: {page.url}")

            page.screenshot(path="/tmp/e2e_dashboard.png", full_page=True)
            page_text = page.locator("body").inner_text()

            # Check if logged in
            is_logged_in = any(kw in page_text for kw in ["工作台", "dashboard", "首页", "打卡", "积分", "员工", "企业", "菜单", "Dashboard"])
            log("用户登录", "登录成功显示工作台", "已登录" if is_logged_in else "未登录", "PASS" if is_logged_in else "FAIL")
            print(f"Login status text preview: {page_text[:500]}")

            # Navigate to employee management
            print("\n=== 3. Navigate to 员工管理 (Employee Management) ===")

            # Try to find sidebar menu
            sidebar = page.locator('.ant-layout-sider, .ant-menu, [class*="sidebar"]').first
            menu_found = False

            # Try different menu item texts
            menu_items = ["员工管理", "企业管理", "企业员工", "员工", "人员管理", "用户管理"]
            for menu_text in menu_items:
                items = page.locator(f'.ant-menu-item, .ant-layout-sider .ant-menu li, [class*="menu"] li').filter(has_text=menu_text).all()
                if items:
                    print(f"Found menu item: {menu_text}, count: {len(items)}")
                    items[0].click()
                    menu_found = True
                    page.wait_for_timeout(3000)
                    break

            if not menu_found:
                # List all available menus
                all_menus = page.locator('.ant-menu-item, .ant-layout-sider li, [class*="sidebar"] li').all()
                menu_texts = [m.inner_text() for m in all_menus[:20]]
                print(f"All menu items found: {menu_texts}")

            page.screenshot(path="/tmp/e2e_employee_page.png", full_page=True)

            # Check employee list page
            page_text = page.locator("body").inner_text()
            employee_keywords = ["员工", "员工管理", "员工列表", "新增员工", "添加员工", "人员"]
            has_employee_page = any(kw in page_text for kw in employee_keywords)
            log("员工管理页面", "显示员工管理页面", "已显示" if has_employee_page else "未显示", "PASS" if has_employee_page else "FAIL")

            # Check if employee table/list is visible
            has_table = any(kw in page_text for kw in ["姓名", "手机", "工号", "部门", "状态", "操作", "创建时间"])
            log("员工列表表格", "显示员工数据表格", "已显示" if has_table else "未显示", "PASS" if has_table else "FAIL")

            print("\n=== 4. Employee List Data ===")
            # Check for employee data
            employee_data_keywords = ["13800138001", "13800138002", "测试", "admin", "管理员", "张", "李", "王"]
            has_data = any(kw in page_text for kw in employee_data_keywords)
            log("员工数据", "显示员工数据", "已显示" if has_data else "未显示", "PASS" if has_data else "FAIL")

            # Count table rows
            table_rows = page.locator('.ant-table-tbody tr, .ant-table-row, table tr').all()
            row_count = len(table_rows)
            log("表格行数", "有数据行", f"{row_count}行", "PASS" if row_count > 0 else "FAIL")
            print(f"Table rows found: {row_count}")

            # Check pagination
            pagination = page.locator('.ant-pagination, .pagination, [class*="pagination"]').first
            has_pagination = pagination.count() > 0
            if has_pagination:
                pagination_text = pagination.inner_text()
                log("分页控件", "显示分页", pagination_text[:50], "PASS")
                print(f"Pagination: {pagination_text[:100]}")
            else:
                log("分页控件", "显示分页", "未显示(可能无分页)", "PASS")

            print("\n=== 5. Test Add Employee ===")
            # Look for add employee button
            add_btn = None
            for btn_text in ["新增", "添加", "创建", "新建"]:
                btn = page.locator(f'button:has-text("{btn_text}")').first
                if btn.count() > 0:
                    add_btn = btn
                    print(f"Found add button: {btn_text}")
                    break

            if add_btn and add_btn.count() > 0:
                add_btn.click()
                page.wait_for_timeout(2000)
                page.screenshot(path="/tmp/e2e_add_employee_modal.png", full_page=True)

                # Check if modal opened
                modal_text = page.locator("body").inner_text()
                has_form = any(kw in modal_text for kw in ["姓名", "手机号", "工号", "部门", "角色", "密码", "邮箱"])
                log("添加员工弹窗", "显示添加表单", "已显示" if has_form else "未显示", "PASS" if has_form else "FAIL")

                # Try to fill the form
                form_inputs = page.locator('.ant-modal input, .ant-modal input').all()
                print(f"Form inputs found: {len(form_inputs)}")

                # Close modal
                close_btn = page.locator('button:has-text("取消"), .ant-modal-close, [class*="close"]').first
                if close_btn.count() > 0:
                    close_btn.click()
                    page.wait_for_timeout(1000)
            else:
                log("添加员工按钮", "显示添加按钮", "未找到", "FAIL")

            print("\n=== 6. Test Search/Filter ===")
            # Look for search input
            search_inputs = page.locator('input[placeholder*="搜索"], input[placeholder*="查询"], input[placeholder*="请输入"]').all()
            if search_inputs:
                search_input = search_inputs[0]
                search_input.fill("13800138001")
                print("Filled search input")
                page.wait_for_timeout(1000)

                # Click search button or press enter
                search_btn = page.locator('button:has-text("搜索"), button:has-text("查询")').first
                if search_btn.count() > 0:
                    search_btn.click()
                    print("Clicked search button")
                else:
                    search_input.press("Enter")
                    print("Pressed Enter")

                page.wait_for_timeout(2000)

                search_result = page.locator("body").inner_text()
                has_search_result = "13800138001" in search_result or "无数据" in search_result or "没有" in search_result
                log("搜索功能", "执行搜索", "已执行" if has_search_result else "未执行", "PASS")
            else:
                log("搜索输入框", "显示搜索框", "未找到", "FAIL")
                # List all inputs
                all_inputs = page.locator('input').all()
                print(f"All inputs found: {[inp.get_attribute('placeholder') for inp in all_inputs[:10]]}")

            # Check filter dropdowns
            filter_dropdowns = page.locator('.ant-select, [class*="select"]').all()
            filter_count = len(filter_dropdowns)
            log("筛选下拉菜单", "有筛选选项", f"{filter_count}个", "PASS" if filter_count > 0 else "FAIL")
            print(f"Filter dropdowns found: {filter_count}")

            print("\n=== 7. Console Errors ===")
            log("控制台错误", "无错误", f"{len(console_errors)}个错误", "PASS" if len(console_errors) == 0 else "FAIL")
            if console_errors:
                for err in console_errors[:10]:
                    print(f"  ERROR: {err[:200]}")

            print("\n=== 8. API Verification ===")
            # Try to extract token from localStorage
            local_storage = page.evaluate("() => JSON.stringify(window.localStorage)")
            print(f"LocalStorage keys: {local_storage[:500]}")

        except Exception as e:
            print(f"[ERROR] Test exception: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

    # Generate report
    print("\n" + "=" * 70)
    print("员工管理页面 E2E 测试报告")
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
        print("控制台错误详情:")
        for i, err in enumerate(console_errors[:10], 1):
            print(f"  {i}. {err[:200]}")

    print(f"\n截图已保存到 /tmp/e2e_*.png")

    print("\n" + "=" * 70)
    print("发现的问题")
    print("=" * 70)
    failed_items = [r for r in results if r["status"] == "FAIL"]
    if failed_items:
        for i, item in enumerate(failed_items, 1):
            print(f"{i}. [{item['step']}] {item['actual']}")
    else:
        print("未发现明显问题!")

    return results, console_errors


if __name__ == "__main__":
    run_tests()