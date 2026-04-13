# Task #1: Phase 1 项目骨架与基础设施

## 执行步骤

### 1.1 Maven 多模块项目结构
- [x] 1.1.1 创建根目录 pom.xml
- [x] 1.1.2 创建 carbon-common/pom.xml
- [x] 1.1.3 创建 carbon-system/pom.xml
- [x] 1.1.4 创建 carbon-checkin/pom.xml
- [x] 1.1.5 创建 carbon-points/pom.xml
- [x] 1.1.6 创建 carbon-mall/pom.xml
- [x] 1.1.7 创建 carbon-report/pom.xml
- [x] 1.1.8 创建 carbon-app/pom.xml

### 1.2 Application 配置
- [x] 1.2.1 创建 carbon-app/src/main/resources/application.yml
- [x] 1.2.2 创建 carbon-app/src/main/java/com/carbonpoint/app/Application.java

### 1.3 多租户拦截器
- [x] 1.3.1 TenantContext.java (ThreadLocal)
- [x] 1.3.2 InterceptorIgnore.java (注解)
- [x] 1.3.3 CustomTenantLineHandler.java (实现 TenantLineHandler)
- [x] 1.3.4 MyBatisPlusConfig.java (配置拦截器)

### 1.4 统一响应封装
- [x] 1.4.1 Result.java
- [x] 1.4.2 ErrorCode.java (枚举)
- [x] 1.4.3 BusinessException.java
- [x] 1.4.4 GlobalExceptionHandler.java

### 1.5 JWT 认证
- [x] 1.5.1 JwtUtil.java
- [x] 1.5.2 JwtAuthenticationFilter.java
- [x] 1.5.3 SecurityConfig.java
- [x] 1.5.4 PasswordEncoder 配置

### 1.6 租户上下文
- [x] 1.6.1 TenantContext set/get/clear 方法完善
- [x] 1.6.2 JwtAuthenticationFilter 中设置 TenantContext

### 1.7 验证
- [x] 1.7.1 Maven 编译验证 — BUILD SUCCESS (all 8 modules)
- [x] 1.7.2 更新 task_plan.md 完成状态
- [x] 1.7.3 更新 progress.md
