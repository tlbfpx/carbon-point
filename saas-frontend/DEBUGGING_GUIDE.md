# 测试调试指南

## 🔍 当前状态

已修复登录选择器问题：
- ✅ 修正: "请输入用户名" → "请输入管理员用户名"
- ✅ 改为使用 UI 登录而非 localStorage 注入（更可靠）

---

## 🚀 推荐：使用 UI 模式调试（最简单）

UI 模式让你可以：
- 直观地看到测试执行过程
- 点击测试用例单步执行
- 查看时间线调试
- 实时观察浏览器状态

### 平台前端测试
```bash
cd saas-frontend/platform-frontend
pnpm test:local:ui
```

### 企业前端测试
```bash
cd saas-frontend/enterprise-frontend
pnpm test:local:ui
```

### H5 测试
```bash
cd saas-frontend/h5
pnpm test:local:ui
```

---

## 📊 查看失败测试的 Trace

如果测试失败，可以用以下命令查看详细的 Trace：

```bash
cd saas-frontend/platform-frontend
npx playwright show-trace test-results/<失败的测试路径>/trace.zip
```

---

## 🔧 常见问题

### 1. 测试超时
- 检查后端服务是否在运行（http://localhost:8080）
- 检查前端服务是否在运行
- 查看是否有 Console Error

### 2. 登录失败
- 检查测试用户账号是否存在
- 查看 API 响应

---

## 📝 下一步

1. 运行 `pnpm test:local:ui` 打开 Playwright UI
2. 选择一个简单的测试运行（比如登录测试）
3. 观察执行过程，根据需要调整

---

**最后更新**: 2026-04-27
