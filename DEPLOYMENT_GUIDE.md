# 统一架构部署指南

## 概述

本文档描述如何部署 Carbon Point 统一资源架构版本。

## 架构变更内容

### 1. 新增数据库表

- `platform_resources` - 平台资源定义表
- `package_resources` - 套餐-资源关联表
- `tenant_packages` - 租户-套餐关联表
- `tenant_resource_configs` - 租户资源配置表
- `menu_definitions` - 菜单定义表
- `package_change_logs` - 套餐变更日志表

### 2. 数据库迁移

1. 执行 DDL 脚本创建新表:
   ```sql
   source openspec/review/ddl/V2__unified_resource_architecture.sql
   ```

2. 执行数据迁移脚本:
   ```sql
   source openspec/review/ddl/V2.1__data_migration.sql
   ```

## 部署步骤

### 1. 备份现有数据

```bash
# 备份数据库
mysqldump -u [username] -p [database] > backup_before_v2.sql
```

### 2. 执行数据库变更

```bash
# 连接数据库
mysql -u [username] -p [database]

# 执行 DDL
source openspec/review/ddl/V2__unified_resource_architecture.sql;

# 执行数据迁移
source openspec/review/ddl/V2.1__data_migration.sql;
```

### 3. 部署后端

```bash
cd saas-backend

# 编译打包
./mvnw clean package -Dmaven.test.skip=true

# 停止旧服务
pkill -f "carbon-app"

# 启动新服务
java -jar carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar --spring.profiles.active=prod
```

### 4. 部署前端

```bash
cd saas-frontend

# 构建平台前端
cd platform-frontend
pnpm install
pnpm build

# 构建企业前端
cd ../enterprise-frontend
pnpm install
pnpm build

# 使用 Nginx 或其他 Web 服务器部署构建产物
```

### 5. 验证部署

1. 检查后端日志确认服务正常启动
2. 访问平台管理后台验证新功能
3. 访问企业管理后台验证动态菜单加载

## 回滚步骤

如果部署出现问题，按以下步骤回滚:

1. 停止新版本服务
2. 恢复数据库备份:
   ```bash
   mysql -u [username] -p [database] < backup_before_v2.sql
   ```
3. 重新部署旧版本

## 新功能使用指南

### 平台侧操作

1. **资源管理**: 在平台管理后台管理功能产品、商城商品、功能点等资源
2. **套餐管理**: 创建套餐，选择包含的资源
3. **企业分配**: 为企业分配套餐

### 企业侧操作

1. **动态菜单**: 企业管理员登录后会看到套餐对应的菜单
2. **资源配置**: 企业可以在允许范围内配置资源
3. **商城上架**: 从平台商品池中选择商品上架到企业商城

## 监控要点

1. 检查套餐分配后的菜单加载
2. 监控资源访问权限控制
3. 观察数据库性能

## 相关文档

- [最终验证报告](./docs/reports/FINAL_VERIFICATION_REPORT.md)
- [生产运维手册 (RUNBOOK)](./RUNBOOK.md)
- [部署指南 (英文)](./DEPLOYMENT.md)
