# 立即开始测试！

## 🎯 当前状态
- ✅ 后端服务已启动 (:8080)
- ✅ 企业前端已启动 (:3000)
- ✅ 平台前端已启动 (:3001)
- ✅ Playwright 配置就绪

## 🚀 推荐测试方式

### 方式一：Playwright UI 模式（最推荐，实时观察）

#### 平台前端
```bash
cd saas-frontend/platform-frontend
pnpm test:local:ui
```

#### 企业前端
```bash
cd saas-frontend/enterprise-frontend
pnpm test:local:ui
```

#### H5 移动端
```bash
cd saas-frontend/h5
pnpm test:local:ui
```

### 方式二：命令行 headed 模式

```bash
# 平台前端
cd platform-frontend
pnpm test:local

# 企业前端
cd enterprise-frontend
pnpm test:local

# H5
cd h5
pnpm test:local
```

### 方式三：一键运行所有

```bash
cd saas-frontend
node run-local-tests.js
```

## 📋 测试覆盖范围

| 项目 | 页面数 | 测试用例数 |
|------|--------|-----------|
| 平台前端 | 11 | ~100+ |
| 企业前端 | 13 | ~50+ |
| H5 移动端 | 7 | ~20+ |

## 🔍 Console 监控

测试会自动检查：
- ❌ Console Error（零容忍）
- ⚠️ Console Warning（逐步清理）

白名单配置在：`e2e/utils/console-monitor.ts`

## 📊 测试报告

测试完成后查看报告：
- 平台前端: `platform-frontend/e2e/reports-local/index.html`
- 企业前端: `enterprise-frontend/e2e/reports-local/index.html`
- H5: `h5/e2e/reports-local/index.html`

---

**下一步**：在终端中运行 `pnpm test:local:ui` 开始交互式测试！
