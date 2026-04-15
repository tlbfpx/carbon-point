# Carbon Point E2E 验收测试

基于 Playwright 的后台管理系统自动化验收测试，覆盖从登录到所有菜单导航。

## 目录结构

```
e2e/
├── package.json
├── playwright.config.ts    # Playwright 配置
├── README.md             # 本文档
├── tests/
│   ├── platform-admin-login.spec.ts  # 平台管理后台登录+菜单测试
│   └── enterprise-admin-login.spec.ts # 企业管理后台登录+菜单测试
└── test-results/         # 测试输出（截图、报告）
```

## 快速开始

### 1. 安装依赖

```bash
cd e2e
npm install
npm run install  # 安装浏览器
```

### 2. 配置环境变量（可选）

```bash
# 平台管理后台地址
export BASE_URL=http://localhost:5173
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=admin123

# 企业管理后台地址（如果分开部署）
export BASE_URL_ENTERPRISE=http://localhost:5174
export ENTERPRISE_USERNAME=admin
export ENTERPRISE_PASSWORD=admin123
```

### 3. 运行测试

```bash
# 运行所有测试（默认无头模式）
npm test

# 运行所有测试（有头模式，看浏览器动作）
npm run test:headed

# 只运行 Chromium（更快）
npm run test:chromium

# 只运行登录相关测试
npm run test:login-only

# 查看测试报告
npm run show-report
```

## 测试覆盖

### 平台管理后台 (`platform-admin-login.spec.ts`)

| 测试用例 | 说明 |
|---------|------|
| 平台管理员登录 - 成功进入 | 验证正确用户名密码能登录进入数据看板 |
| 导航所有菜单项 - 验证都能正常打开 | 逐个点击所有菜单验证页面能正常打开 |
| 错误用户名密码 - 提示错误 | 验证错误凭证提示正确 |
| 空用户名 - 前端校验提示 | 验证表单前端校验，登录按钮禁用 |
| 退出登录 - 返回登录页 | 验证退出登录功能 |
| 未登录直接访问 dashboard - 重定向登录 | 验证未登录访问保护 |

**覆盖菜单**: 数据看板、企业管理、套餐管理、管理员、系统配置、操作日志

### 企业管理后台 (`enterprise-admin-login.spec.ts`)

| 测试用例 | 说明 |
|---------|------|
| 企业管理员登录 - 成功进入 | 验证正确凭证能登录 |
| 导航所有菜单项 - 验证都能正常打开 | 所有主菜单项逐个验证 |
| 错误密码 - 提示错误 | 错误凭证提示正确 |
| 空手机号 - 按钮禁用 | 前端校验正确 |
| 退出登录 | 退出成功返回登录页 |
| 未登录访问 - 重定向登录 | 未登录访问保护正确 |

**覆盖菜单**: 数据看板、员工列表/部门管理、角色管理、规则配置、积分流水、虚拟商品/兑换订单、数据统计、企业信息

## 输出

测试运行后，`test-results/` 目录下会生成：

- 每个页面截图（`.png`）
- HTML 测试报告
- 失败用例的 traces

## 环境要求

- Node.js 18+
- Playwright 1.58+（系统已经安装）
- 后台管理系统已经运行在 `http://localhost:5173`（平台）或 `http://localhost:5174`（企业）

## 说明

- 当前项目前端尚未开发完成，所以测试需要在前端开发完成后才能运行
- 所有选择器使用语义化选择器（文本、角色），适应一般布局变化
- 如果选择器不匹配，根据实际渲染的 HTML 修改定位方式即可
- 所有测试失败都会自动截图和录 trace，方便排查问题
