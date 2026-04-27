# Carbon Point 部署指南

> 碳积分打卡平台 - 多租户 SaaS 系统完整部署文档

## 目录

1. [环境要求](#环境要求)
2. [本地开发环境搭建](#本地开发环境搭建)
3. [Docker Compose 生产部署](#docker-compose-生产部署)
4. [传统部署方式](#传统部署方式)
5. [数据库初始化](#数据库初始化)
6. [常见问题 FAQ](#常见问题-faq)
7. [端口分配说明](#端口分配说明)

---

## 环境要求

### 基础环境

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Java | 21+ | 使用 Eclipse Temurin 或 OpenJDK |
| Node.js | 18+ | 推荐 LTS 版本 |
| pnpm | 8+ | 包管理器 |
| MySQL | 8.0+ | 使用 utf8mb4 字符集 |
| Redis | 7.0+ | 用于缓存和分布式锁 |
| Nginx | 1.25+ | 反向代理（可选，Docker 部署自带） |

### 硬件要求

#### 开发环境
- CPU: 2 核以上
- 内存: 4GB 以上
- 磁盘: 20GB 以上

#### 生产环境（最小配置）
- CPU: 4 核
- 内存: 8GB
- 磁盘: 50GB SSD

#### 生产环境（推荐配置）
- CPU: 8 核
- 内存: 16GB
- 磁盘: 100GB SSD

---

## 本地开发环境搭建

### 1. 克隆项目

```bash
git clone <repository-url>
cd carbon-point
```

### 2. 安装依赖

#### 后端依赖
```bash
cd saas-backend
./mvnw dependency:go-offline
```

#### 前端依赖
```bash
cd saas-frontend
pnpm install
```

### 3. 配置环境

#### 数据库准备

创建 MySQL 数据库：

```sql
CREATE DATABASE carbon_point CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 配置文件

复制并修改后端配置：

```bash
cd saas-backend/carbon-app/src/main/resources
cp application-dev.yml application-local.yml
# 编辑 application-local.yml，配置数据库和 Redis 连接
```

### 4. 启动服务

#### 方式一：使用 Makefile（推荐）

```bash
cd saas-backend

# 启动后端
make dev-backend

# 新开终端，启动企业前端
make dev-frontend-enterprise

# 新开终端，启动平台前端
make dev-frontend-platform

# 新开终端，启动 H5 前端
make dev-frontend-h5
```

#### 方式二：手动启动

**启动后端：**
```bash
cd saas-backend
./mvnw spring-boot:run -pl carbon-app -Dspring-boot.run.profiles=dev
```

**启动前端：**
```bash
# 企业前端 (:3000)
cd saas-frontend/enterprise-frontend
pnpm dev

# 平台前端 (:3001)
cd saas-frontend/platform-frontend
pnpm dev

# H5 用户端 (:3002)
cd saas-frontend/h5
pnpm dev
```

### 5. 验证部署

访问以下地址验证服务是否正常：

| 服务 | URL |
|------|-----|
| 企业管理后台 | http://localhost:3000 |
| 平台管理后台 | http://localhost:3001 |
| H5 用户端 | http://localhost:3002 |
| 后端 API | http://localhost:8080 |
| 健康检查 | http://localhost:8080/actuator/health |

---

## Docker Compose 生产部署

### 前置准备

1. 确保已安装 Docker 和 Docker Compose
2. 准备生产环境配置文件

### 1. 准备配置文件

```bash
cd saas-backend

# 复制环境变量示例文件
cp ../.env.example.prod .env.prod

# 编辑 .env.prod，填入真实配置
vim .env.prod
```

### 2. 生成安全密钥

```bash
# 生成数据库密码
openssl rand -base64 24

# 生成 Redis 密码
openssl rand -base64 16

# 生成 JWT 密钥
openssl rand -base64 48
```

将生成的密钥填入 `.env.prod` 文件。

### 3. 构建前端资源

```bash
cd saas-frontend

# 构建所有前端应用
pnpm -r --filter @carbon-point/... build

# 复制构建产物到 saas-backend/dist 目录
cd ..
mkdir -p saas-backend/dist
cp -r saas-frontend/enterprise-frontend/dist saas-backend/dist/enterprise
cp -r saas-frontend/platform-frontend/dist saas-backend/dist/platform
cp -r saas-frontend/h5/dist saas-backend/dist/h5
```

### 4. 配置 SSL 证书（可选但推荐）

```bash
cd saas-backend
mkdir -p certs

# 将 SSL 证书文件放入 certs 目录
# - fullchain.pem
# - privkey.pem
```

### 5. 启动服务

```bash
cd saas-backend

# 使用 Makefile 启动
make prod-up

# 或直接使用 docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### 6. 查看服务状态

```bash
# 查看容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
make prod-logs
# 或
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### 7. 健康检查

```bash
# 检查后端健康状态
curl http://localhost/actuator/health

# 检查数据库连接
docker-compose -f docker-compose.prod.yml exec mysql mysqladmin ping -uroot -p<DB_PASSWORD>

# 检查 Redis 连接
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a <REDIS_PASSWORD> ping
```

### 8. 停止服务

```bash
cd saas-backend

# 停止服务但保留数据
make prod-down

# 停止服务并删除数据卷（谨慎使用）
docker-compose -f docker-compose.prod.yml down -v
```

---

## 传统部署方式

### 1. 后端部署

#### 编译打包

```bash
cd saas-backend
./mvnw clean package -Dmaven.test.skip=true
```

#### 配置生产环境

```bash
cd saas-backend/carbon-app/src/main/resources
cp application-prod.yml application-prod-custom.yml
# 编辑 application-prod-custom.yml
```

#### 启动服务

```bash
# 使用 nohup 后台运行
nohup java -jar carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  > app.log 2>&1 &

# 或使用 systemd 服务（推荐）
sudo tee /etc/systemd/system/carbon-point.service << EOF
[Unit]
Description=Carbon Point Application
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/carbon-point
ExecStart=/usr/bin/java -jar carbon-app-1.0.0-SNAPSHOT.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable carbon-point
sudo systemctl start carbon-point

# 查看状态
sudo systemctl status carbon-point
sudo journalctl -u carbon-point -f
```

### 2. 前端部署

#### 构建前端

```bash
cd saas-frontend

# 构建企业前端
cd enterprise-frontend
pnpm build

# 构建平台前端
cd ../platform-frontend
pnpm build

# 构建 H5 前端
cd ../h5
pnpm build
```

#### 配置 Nginx

将构建产物部署到 Nginx 服务器：

```bash
# 创建部署目录
sudo mkdir -p /var/www/carbon-point

# 复制前端文件
sudo cp -r saas-frontend/enterprise-frontend/dist /var/www/carbon-point/enterprise
sudo cp -r saas-frontend/platform-frontend/dist /var/www/carbon-point/platform
sudo cp -r saas-frontend/h5/dist /var/www/carbon-point/h5

# 复制 Nginx 配置
sudo cp saas-backend/nginx.conf /etc/nginx/sites-available/carbon-point
sudo ln -s /etc/nginx/sites-available/carbon-point /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 3. 数据库部署

#### 安装 MySQL 8.0

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server -y

# CentOS/RHEL
sudo yum install mysql-server -y
```

#### 初始化数据库

```bash
# 创建数据库
mysql -u root -p << SQL
CREATE DATABASE carbon_point CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'carbon_point'@'localhost' IDENTIFIED BY '<secure-password>';
GRANT ALL PRIVILEGES ON carbon_point.* TO 'carbon_point'@'localhost';
FLUSH PRIVILEGES;
SQL

# 导入 schema
mysql -u root -p carbon_point < openspec/review/ddl/carbon-point-schema.sql
```

#### MySQL 配置优化

编辑 `/etc/mysql/mysql.conf.d/mysqld.cnf`：

```ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
max_connections=500
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
innodb_flush_log_at_trx_commit=1
sync_binlog=1
slow_query_log=1
long_query_time=2
```

### 4. Redis 部署

#### 安装 Redis 7.0

```bash
# Ubuntu/Debian
sudo apt install redis-server -y

# CentOS/RHEL
sudo yum install redis -y
```

#### Redis 配置

编辑 `/etc/redis/redis.conf`：

```conf
requirepass <secure-redis-password>
appendonly yes
appendfsync everysec
maxmemory 512mb
maxmemory-policy allkeys-lru
maxclients 10000
```

#### 启动 Redis

```bash
sudo systemctl enable redis
sudo systemctl start redis
sudo systemctl status redis
```

---

## 数据库初始化

### Flyway 迁移（推荐）

项目使用 Flyway 进行数据库版本管理，启动应用时会自动执行迁移。

### 手动初始化

如果需要手动初始化数据库：

```bash
# 连接数据库
mysql -u root -p carbon_point

# 执行 DDL 脚本
source openspec/review/ddl/carbon-point-schema.sql;
```

### 初始化数据

项目包含必要的种子数据（如默认规则、配置等），会在首次启动时自动插入。

### 验证数据库

```sql
-- 查看表
SHOW TABLES;

-- 查看迁移记录
SELECT * FROM flyway_schema_history ORDER BY installed_rank DESC;

-- 查看租户数据
SELECT * FROM sys_tenant;
```

---

## 常见问题 FAQ

### 后端相关

**Q: 后端启动时报错 "Connection refused" 连接数据库失败**

A: 检查数据库是否启动，配置文件中的数据库连接信息是否正确。确认 MySQL 用户权限。

**Q: JWT 验证失败**

A: 确保 JWT_SECRET 配置正确，所有实例使用相同的密钥。生产环境务必使用强随机密钥。

**Q: Redis 连接失败**

A: 检查 Redis 是否启动，密码配置是否正确。使用 `redis-cli ping` 测试连接。

### 前端相关

**Q: 前端页面空白**

A: 检查浏览器控制台是否有错误，确认 API 地址配置正确，检查 Nginx 路由配置。

**Q: 前端构建失败**

A: 清理 node_modules 重新安装依赖，确保 Node.js 版本满足要求。

### Docker 相关

**Q: Docker 容器启动失败**

A: 查看容器日志 `docker-compose logs <service-name>`，检查端口是否被占用。

**Q: 数据卷权限问题**

A: 确保容器用户有数据卷读写权限，可能需要调整目录权限。

### 生产环境

**Q: 如何配置 HTTPS？**

A: 使用 Let's Encrypt 免费证书，配置 Nginx SSL 监听 443 端口。

**Q: 如何备份数据？**

A: 定期备份 MySQL 数据和 Redis 持久化文件，可以使用 cron 定时任务。

**Q: 如何升级版本？**

A: 
1. 备份数据库
2. 拉取最新代码
3. 重新构建镜像
4. 滚动更新容器

---

## 端口分配说明

### 开发环境端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 8080 | Spring Boot 应用 |
| 企业前端 | 3000 | Vite Dev Server |
| 平台前端 | 3001 | Vite Dev Server |
| H5 前端 | 3002 | Vite Dev Server |
| MySQL | 3306 | 数据库（本地） |
| Redis | 6379 | 缓存（本地） |

### 生产环境端口

| 服务 | 端口 | 暴露范围 | 说明 |
|------|------|---------|------|
| Nginx HTTP | 80 | 公网 | 强制重定向到 HTTPS |
| Nginx HTTPS | 443 | 公网 | 对外服务入口 |
| 后端 API | 8080 | 本地/Docker | 仅内部访问 |
| MySQL | 3306 | 本地/Docker | 仅内部访问 |
| Redis | 6379 | 本地/Docker | 仅内部访问 |

### 网络架构

```
                    ┌─────────────────┐
                    │   Nginx (443)   │
                    │   (80 redirect) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ Frontend│         │ Backend │         │         │
   │  (SPA)  │         │ (8080)  │         │         │
   └─────────┘         └────┬────┘         │         │
                            │              │         │
              ┌─────────────┼──────────────┘         │
              │             │                        │
              ▼             ▼                        ▼
         ┌─────────┐   ┌─────────┐            ┌─────────┐
         │  MySQL  │   │  Redis  │            │   OSS   │
         │ (3306)  │   │ (6379)  │            │ (Object │
         └─────────┘   └─────────┘            │ Storage)│
                                              └─────────┘
```

---

## 附录

### A. Makefile 常用命令

```bash
cd saas-backend

# 构建
make build              # 构建所有模块
make build-jar          # 构建后端 JAR
make build-frontend     # 构建前端

# 开发
make dev-backend        # 启动后端
make dev-frontend-enterprise  # 启动企业前端
make dev-frontend-platform    # 启动平台前端
make dev-frontend-h5    # 启动 H5 前端

# Docker（生产）
make prod-up            # 启动生产服务
make prod-down          # 停止生产服务
make prod-logs          # 查看生产日志
make prod-restart       # 重启应用容器
```

### B. 健康检查端点

| 端点 | 说明 |
|------|------|
| /actuator/health | 健康检查 |
| /actuator/info | 应用信息 |
| /actuator/metrics | 指标数据 |
| /actuator/prometheus | Prometheus 格式指标 |

### C. 日志位置

#### Docker 部署
```bash
# 应用日志
docker-compose -f docker-compose.prod.yml logs app

# Nginx 日志
/var/lib/docker/volumes/carbon-point_nginx_logs/_data/
```

#### 传统部署
```bash
# 应用日志
/opt/carbon-point/app.log
# 或使用 systemd journal
journalctl -u carbon-point -f

# Nginx 日志
/var/log/nginx/
```

### D. 监控和告警

推荐使用以下工具进行生产环境监控：

- **APM**: SkyWalking / Pinpoint
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack / Loki
- **告警**: Alertmanager

---

## 技术支持

如有问题，请查看：

- 项目文档: `openspec/` 目录
- 架构设计: `openspec/changes/carbon-point-platform/design.md`
- GitHub Issues

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-27
