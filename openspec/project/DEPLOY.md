# Carbon Point 生产部署指南

> 版本: 1.0.0 | 更新日期: 2026-04-12

## 目录

- [环境要求](#环境要求)
- [数据库迁移](#数据库迁移)
- [环境变量配置](#环境变量配置)
- [启动顺序](#启动顺序)
- [健康检查](#健康检查)
- [回滚步骤](#回滚步骤)

---

## 环境要求

### 运行时依赖

| 组件 | 版本要求 | 最小配置 | 推荐配置 |
|------|----------|----------|----------|
| Java (JDK) | 21+ | 2核 CPU / 4GB RAM | 4核 CPU / 8GB RAM |
| MySQL | 8.0+ | 2核 CPU / 4GB RAM / 50GB 磁盘 | 4核 CPU / 16GB RAM / 200GB SSD |
| Redis | 7.0+ | 1核 CPU / 2GB RAM | 2核 CPU / 4GB RAM |
| Nginx | 1.25+ | 1核 CPU / 1GB RAM | 2核 CPU / 2GB RAM |

### 软件依赖版本（已在 Dockerfile 中固定）

- **Spring Boot**: 3.2.0
- **MyBatis-Plus**: 最新兼容版
- **Java**: Eclipse Temurin 21 (Alpine Linux)

---

## 数据库迁移

### 方式一：Docker Compose 自动初始化（推荐）

首次部署时，`docker-compose.prod.yml` 会自动通过 `docker-entrypoint-initdb.d` 加载 `docs/review/ddl/carbon-point-schema.sql`。

```bash
# 确认 DDL 文件存在
ls docs/review/ddl/carbon-point-schema.sql

# 启动数据库（会自动执行 DDL）
docker-compose -f docker-compose.prod.yml up -d mysql
```

### 方式二：手动迁移（生产环境推荐）

```bash
# 1. 备份现有数据库（如果存在）
mysqldump -h <host> -u root -p --single-transaction --quick carbon_point > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 创建数据库（如果不存在）
mysql -h <host> -u root -p -e "CREATE DATABASE IF NOT EXISTS carbon_point CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. 执行 DDL 迁移
mysql -h <host> -u root -p carbon_point < docs/review/ddl/carbon-point-schema.sql

# 4. 验证表结构
mysql -h <host> -u root -p carbon_point -e "SHOW TABLES;" | wc -l
# 预期输出: 25（25 张表）
```

### 迁移检查清单

- [ ] 所有 25 张表创建成功
- [ ] 索引创建成功（`SHOW INDEX FROM <table>`）
- [ ] 外键约束验证
- [ ] 默认数据插入成功（预设角色模板、默认时段规则）

---

## 环境变量配置

### 生产环境变量文件 `.env.prod`

从示例文件复制并配置：

```bash
# 复制示例文件
cp .env.example.prod .env.prod

# 生成并设置强密码
# JWT Secret（64位随机字符串）
sed -i 's|JWT_SECRET=<请生成64位随机字符串: openssl rand -base64 48>|JWT_SECRET=$(openssl rand -base64 48)|' .env.prod

# 编辑 .env.prod，替换所有 <...> 占位符为真实值
vim .env.prod
```

> 完整配置项说明见 `.env.example.prod` 文件注释。

### 密钥生成命令

```bash
# JWT Secret（64位随机字符串）
openssl rand -base64 48

# MySQL 强密码
openssl rand -base64 24

# Redis 密码
openssl rand -base64 16
```

### 敏感信息管理

- **禁止** 将 `.env.prod` 提交到版本控制系统
- **推荐** 使用 Vault 或云厂商 Secret Manager 管理密钥
- 生产环境必须修改所有默认值

---

## 启动顺序

### 方式一：Docker Compose 一键启动（推荐）

```bash
# 1. 准备环境变量文件
cp .env.example .env.prod
# 编辑 .env.prod 填入真实值

# 2. 构建并启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 3. 查看启动日志
docker-compose -f docker-compose.prod.yml logs -f app

# 4. 验证所有服务状态
docker-compose -f docker-compose.prod.yml ps
```

### 方式二：手动分步启动

```bash
# 1. 启动基础设施（必须先启动）
docker-compose -f docker-compose.prod.yml up -d mysql redis

# 2. 等待 MySQL 就绪（大约 30 秒）
until docker exec carbon-point-mysql mysqladmin ping -h localhost -uroot -p"$DB_PASSWORD" &>/dev/null; do
    echo "Waiting for MySQL..."
    sleep 2
done

# 3. 等待 Redis 就绪
until docker exec carbon-point-redis redis-cli ping 2>/dev/null | grep -q PONG; do
    echo "Waiting for Redis..."
    sleep 1
done

# 4. 启动应用
docker-compose -f docker-compose.prod.yml up -d app

# 5. 启动 Nginx（确保前端 dist 已就位）
docker-compose -f docker-compose.prod.yml up -d nginx

# 6. 最终状态确认
docker-compose -f docker-compose.prod.yml ps
```

### 启动顺序依赖图

```
MySQL (健康检查通过)
    ↓
Redis
    ↓
Spring Boot App (健康检查通过)
    ↓
Nginx (静态资源就位)
```

---

## 健康检查

### 1. Docker 服务健康状态

```bash
# 检查所有容器状态
docker-compose -f docker-compose.prod.yml ps

# 预期输出：所有容器状态为 "healthy" 或 "running"
# - carbon-point-app      healthy
# - carbon-point-mysql    healthy
# - carbon-point-redis     running
# - carbon-point-nginx     running
```

### 2. 应用健康端点

```bash
# 基础健康检查
curl -s http://localhost:8080/actuator/health
# 预期: {"status":"UP"}

# 详细健康信息
curl -s http://localhost:8080/actuator/health/details | jq
```

### 3. 数据库连接验证

```bash
docker exec carbon-point-mysql mysql -uroot -p"$DB_PASSWORD" -e \
  "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='carbon_point';"
# 预期: 25
```

### 4. Redis 连接验证

```bash
docker exec carbon-point-redis redis-cli -a "<password>" ping
# 预期: PONG
```

### 5. Nginx 代理验证

```bash
# API 代理
curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/captcha
# 预期: 200

# 前端静态资源
curl -s -o /dev/null -w "%{http_code}" http://localhost/
# 预期: 200

# 管理后台
curl -s -o /dev/null -w "%{http_code}" http://localhost/dashboard/
# 预期: 200
```

### 6. 关键功能冒烟测试

```bash
# 登录接口
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"test123","captchaKey":"test","captchaCode":"000000"}' \
  | jq '.code'

# 预期: 200 (登录成功，返回 token)
```

### 7. 日志检查

```bash
# 应用日志（实时）
docker-compose -f docker-compose.prod.yml logs -f app --tail=100

# 错误日志过滤
docker-compose -f docker-compose.prod.yml logs app | grep -i error

# Nginx 错误日志
docker exec carbon-point-nginx cat /var/log/nginx/error.log | tail -20
```

---

## 回滚步骤

### 方案一：基于 Docker 镜像回滚

```bash
# 1. 查看可用镜像版本（假设使用镜像标签）
docker images | grep carbon-point

# 2. 停止当前服务
docker-compose -f docker-compose.prod.yml down

# 3. 修改 docker-compose.prod.yml 中的镜像版本
# 例如: image: carbon-point/app:1.0.0 -> image: carbon-point/app:0.9.0

# 4. 重新启动
docker-compose -f docker-compose.prod.yml up -d

# 5. 验证回滚
curl -s http://localhost:8080/actuator/health
```

### 方案二：基于 JAR 文件回滚

```bash
# 1. 备份当前 JAR
docker cp carbon-point-app:/app/app.jar ./app.jar.backup

# 2. 替换 JAR 文件
docker cp ./app.jar.old carbon-point-app:/app/app.jar

# 3. 重启应用
docker restart carbon-point-app

# 4. 等待应用启动并验证
sleep 30 && curl -s http://localhost:8080/actuator/health
```

### 方案三：数据库回滚（如果迁移有问题）

```bash
# 1. 停止应用（防止写入）
docker-compose -f docker-compose.prod.yml stop app

# 2. 恢复数据库
mysql -h <host> -u root -p carbon_point < backup_YYYYMMDD_HHMMSS.sql

# 3. 重启应用
docker-compose -f docker-compose.prod.yml start app

# 4. 验证
curl -s http://localhost:8080/actuator/health
```

### 回滚检查清单

- [ ] 服务停止 / 隔离
- [ ] 数据已恢复到上一版本状态
- [ ] 应用重启成功
- [ ] 健康检查通过
- [ ] 关键业务流程验证通过
- [ ] 通知相关人员

---

## 附录

### 常用运维命令

```bash
# 查看资源使用
docker stats --no-stream

# 进入应用容器
docker exec -it carbon-point-app sh

# 进入数据库
docker exec -it carbon-point-mysql mysql -uroot -p"$DB_PASSWORD" carbon_point

# 重启单个服务
docker-compose -f docker-compose.prod.yml restart app

# 查看应用日志（实时）
docker-compose -f docker-compose.prod.yml logs -f --tail=50 app

# 清理未使用资源
docker system prune -f

# 完全重建
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d --build
```

### 联系方式

- 技术支持: support@carbonpoint.com
- 紧急联系: +86-XXX-XXXX-XXXX
- GitHub Issues: https://github.com/your-org/carbon-point/issues
