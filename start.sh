#!/bin/bash
# Carbon Point 一键启动脚本
# 启动: ./start.sh
# 停止: Ctrl+C

set -e

echo "=========================================="
echo "  Carbon Point 一键启动"
echo "=========================================="

# 配置端口（固定端口，不可变更）
BACKEND_PORT=8080
ENTERPRISE_PORT=3000
MULTITANT_PORT=3001
H5_PORT=3002
DASHBOARD_PORT=3003

# 强制杀掉占用端口的进程
kill_port() {
    local port=$1
    echo "Checking port $port..."
    
    # 多次尝试查找并杀死进程
    for i in 1 2 3; do
        local pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            echo "Killing process $pid on port $port (attempt $i)..."
            kill -9 $pid 2>/dev/null || true
            sleep 1
        else
            break
        fi
    done
    
    # 再次确认端口已释放
    if lsof -ti:$port >/dev/null 2>&1; then
        echo "WARNING: Port $port still in use! Forcing cleanup..."
        fuser -k -n tcp $port 2>/dev/null || true
        sleep 2
    fi
    
    echo "Port $port is clear"
}

# 清理所有端口
echo "Cleaning up all ports..."
kill_port $BACKEND_PORT
kill_port $ENTERPRISE_PORT
kill_port $MULTITANT_PORT
kill_port $H5_PORT
kill_port $DASHBOARD_PORT

# 启动 Docker 服务（如果没启动）
if ! docker ps | grep -q "carbon-point-mysql"; then
    echo "Starting MySQL with Docker..."
    docker compose up -d mysql
    sleep 5
else
    echo "MySQL already running."
fi

if ! docker ps | grep -q "carbon-point-redis"; then
    echo "Starting Redis with Docker..."
    docker compose up -d redis
    sleep 2
else
    echo "Redis already running."
fi

# 获取项目根目录
PROJECT_ROOT=$(dirname "$0")
cd "$PROJECT_ROOT"

echo ""
echo "Starting backend (compiling, skipping tests)..."
cd "$PROJECT_ROOT/carbon-app" && mvn clean spring-boot:run -Dmaven.test.skip=true -DskipTests -Dspring-boot.run.profiles.active=dev &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 30

echo ""
echo "Starting enterprise-frontend..."
cd "$PROJECT_ROOT/apps/enterprise-frontend" && pnpm dev &
ENTERPRISE_PID=$!

echo ""
echo "Starting multi-tenant-frontend..."
cd "$PROJECT_ROOT/apps/multi-tenant-frontend" && pnpm dev &
MULTITANT_PID=$!

echo ""
echo "Starting H5..."
cd "$PROJECT_ROOT/apps/h5" && pnpm dev &
H5_PID=$!

echo ""
echo "Starting Dashboard..."
cd "$PROJECT_ROOT/apps/dashboard" && pnpm dev &
DASHBOARD_PID=$!

echo ""
echo "=========================================="
echo "  Services started (all ports fixed):"
echo "  - Backend API: http://localhost:$BACKEND_PORT"
echo "  - Enterprise Frontend: http://localhost:$ENTERPRISE_PORT"
echo "  - Multi-Tenant Frontend: http://localhost:$MULTITANT_PORT"
echo "  - H5 App: http://localhost:$H5_PORT/h5/"
echo "  - Dashboard: http://localhost:$DASHBOARD_PORT"
echo "  - MySQL: localhost:3306"
echo "  - Redis: localhost:6379"
echo "=========================================="
echo "Test accounts:"
echo "  Enterprise C (full permissions):"
echo "    - Super Admin: 13800030001 / 123456"
echo "    - Operator: 13800030002 / 123456"
echo "  Enterprise D (full permissions):"
echo "    - Super Admin: 13800040001 / 123456"
echo "    - Operator: 13800040002 / 123456"
echo "=========================================="
echo "Press Ctrl+C to stop all services"

# 等待 Ctrl+C
trap "echo 'Stopping all services...'; kill $BACKEND_PID $ENTERPRISE_PID $MULTITANT_PID $H5_PID $DASHBOARD_PID 2>/dev/null; exit" INT
wait
