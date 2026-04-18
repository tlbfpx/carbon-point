## 用户视角 E2E 测试

**测试时间**: 2026-04-12
**测试环境**: localhost (H5: http://localhost:8081/h5/, App: http://localhost:9090, Dashboard: http://localhost:8081/dashboard/)

---

### 测试结果总览

| 功能 | 步骤 | 预期 | 实际 | 结果 |
|------|------|------|------|------|
| H5 页面加载 | 访问首页 | 跳转到登录页 | 跳转到 /login，显示登录表单 | **PASS** |
| H5 登录页 | 页面包含手机号+密码输入框 | 有登录表单 | 有手机号、密码输入框和登录按钮 | **PASS** |
| H5 注册页 | 点击注册链接 | 显示注册表单 | 显示手机号、验证码、密码、确认密码、邀请码表单 | **PASS** |
| H5 登录 | 输入正确账号密码 | 登录成功 | HTTP 500 系统内部错误 | **FAIL** |
| H5 注册 | 输入手机号+验证码+密码 | 注册成功或提示验证码 | 需要短信验证码（无短信网关，无法测试） | **BLOCKED** |
| H5 Dashboard 加载 | 访问 Dashboard | 显示管理后台 | JS 资源 404，页面空白 | **FAIL** |
| H5 Dashboard 登录 | 输入管理员账号密码 | 登录成功 | Dashboard 无法加载，无法测试 | **BLOCKED** |
| 打卡功能 | 登录后进入打卡页 | 显示时段和打卡按钮 | 因登录失败而无法测试 | **BLOCKED** |
| 积分功能 | 登录后查看积分 | 显示积分余额和等级 | 因登录失败而无法测试 | **BLOCKED** |
| 商城功能 | 登录后浏览商品 | 显示商品列表 | 因登录失败而无法测试 | **BLOCKED** |
| 个人中心 | 登录后修改个人信息 | 可编辑昵称/头像 | 因登录失败而无法测试 | **BLOCKED** |

---

### 发现的问题

#### 🔴 P0 - 阻断性问题（系统不可用）

**1. H5 登录 API 返回 500（根因：数据库 Schema 不匹配）**
- **现象**: 调用 `POST /api/auth/login` 返回 `{"data":null,"code":500,"message":"系统内部错误，请稍后重试"}`
- **根因**: `LoginSecurityLogEntity` 实体类字段与 `login_security_logs` 数据库表 Schema 不一致：
  - 实体有 `ip`、`status`、`fail_reason`、`loginType`、`userType`、`location` 等字段
  - 数据库实际列名为 `ip_address`、`result`、`geo_city`、`login_method`、`user_type` 等
  - INSERT 时报 `SQLSyntaxErrorException: Unknown column 'ip' in 'field list'`
- **影响范围**: 所有用户无法登录 H5
- **已找到用户**: 数据库中存在用户 `13800138001`（密码 `password123`）
- **修复建议**: 在 `LoginSecurityLogEntity.java` 中为每个不匹配的字段添加 `@TableField("actual_column_name")` 注解，例如 `@TableField("result") private String status;`

**2. H5 注册页依赖短信验证码（无短信网关）**
- **现象**: 注册页需要短信验证码，但系统中没有短信服务
- **影响范围**: 新用户无法注册
- **修复建议**: Phase 1 中增加测试短信网关（如 Redis 存储验证码），或提供测试验证码接口

**3. Dashboard 所有 JS 资源返回 404**
- **现象**: Dashboard HTML 引用 `/assets/*.js`（绝对路径），但 nginx 配置从 `dist/h5/assets/` 读取，而 H5 和 Dashboard 的 JS hash 不同，导致 404
- **根因**: Vite build 配置中 `base` 默认为 `/`，Dashboard 和 H5 共享同一资产路径，但各自的 JS hash 不同
- **影响范围**: Dashboard 管理后台完全不可用
- **修复建议**:
  1. 修改 Dashboard 的 `vite.config.ts`：`base: '/dashboard/'`
  2. 或修改 nginx 配置，为 Dashboard 添加独立的 `/dashboard/assets/` 路径映射

#### 🟡 P1 - 功能性缺陷

**4. tenants 表为空**
- **现象**: `SELECT * FROM tenants;` 返回空结果
- **根因**: 缺少租户初始化数据，而用户表中存在 `tenant_id=1` 的用户
- **影响**: 登录时无法验证租户状态，可能导致业务逻辑异常
- **修复建议**: 添加租户初始化数据

**5. 图形验证码生成失败（500）**
- **现象**: `GET /api/auth/captcha` 返回 500
- **根因**: CaptchaService 使用 Arial/Tahoma/Verdana/Georgia 字体，但 Docker 容器中只有 DejaVu 系列字体，导致 `Font` 实例化失败
- **影响**: 需要验证码时无法生成图片，阻断登录
- **修复建议**: 将 `CaptchaService.java` 中的字体改为容器中存在的字体（如 DejaVu Sans）

**6. Docker 容器健康检查失败**
- **现象**: `docker ps` 显示 `carbon-point-app` 状态为 `unhealthy`（失败 114 次）
- **根因**: healthcheck 使用 `wget http://localhost:8080/actuator/health`，但 actuator 端点被 Spring Security 保护返回 401
- **影响**: Kubernetes/Docker Compose 无法正确判断容器健康状态
- **修复建议**: 在 Security 配置中为 `/actuator/health` 添加免认证访问

#### 🟠 P2 - 代码质量/Security 问题

**7. 多个 Schema 不匹配（已发现 2 处）**
- `login_security_logs`: 实体字段名与数据库列名不一致
- `platform_admins`: 实体期望 `password` 列，数据库中为 `password_hash`
- **修复建议**: 统一使用 MyBatis-Plus 约定：`user_id` → `user_id`（驼峰转下划线），或显式使用 `@TableField` 注解

**8. 登录安全日志 user_type 未赋值**
- **现象**: `Field 'user_type' doesn't have a default value` 导致 INSERT 失败
- **根因**: `LoginSecurityLogEntity.userType` 未被设置
- **影响**: 登录失败时的日志记录失败
- **修复建议**: 在 `LoginSecurityLogService.logFailure()` 中添加 `entity.setUserType("USER")`

---

### 发现的用户账号

| 手机号 | 密码 | 角色 |
|--------|------|------|
| 13800138001 | password123 | 企业管理员（tenant_id=1） |
| 13800138002 | （未知） | 普通员工 |
| 13800138003 | （未知） | 普通员工 |
| 13800138004 | （未知） | 已禁用 |
| 13800138005 | （未知） | 普通员工 |

> 注：密码通过 Argon2id 哈希验证，`13800138001` 的密码为 `password123`

---

### 截图

| 截图 | 描述 |
|------|------|
| `/tmp/h5_home.png` | H5 首页初始加载 |
| `/tmp/h5_root.png` | H5 登录页重定向后 |
| `/tmp/h5_01_login.png` | H5 登录页 |
| `/tmp/h5_02_register.png` | H5 注册页 |
| `/tmp/dashboard_login.png` | Dashboard 登录页（JS 404） |
| `/tmp/dashboard_debug.png` | Dashboard 调试截图 |

---

### 总结

**系统当前状态：生产环境不可用**

- H5 用户端：登录 API 因 Schema 不匹配完全不可用
- Dashboard 管理端：前端资源 404，完全不可用
- 所有需要认证的功能（打卡、积分、商城、个人中心）均因登录失败而无法测试

**建议优先级**:
1. 修复 `LoginSecurityLogEntity` Schema 映射（最紧急，阻断所有登录）
2. 修复 Dashboard Vite build 配置（次紧急）
3. 添加租户初始化数据
4. 修复验证码字体问题
5. 修复 Docker healthcheck 配置
6. 全面检查并修复所有 Schema 不匹配问题
