#!/bin/bash
# Carbon Point 一键启动脚本
# 启动: ./start.sh
# 停止: Ctrl+C

echo "=========================================="
echo "  Carbon Point 一键启动"
echo "=========================================="

# 配置端口
BACKEND_PORT=8080
FRONTEND_PORT=3000

# 杀掉占用端口的进程
kill_port() {
    local port=$1
    echo "Checking port $port..."
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Killing process $pid on port $port..."
        kill -9 $pid
        sleep 1
    fi
}

# 清理端口
echo "Cleaning up ports..."
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

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
echo "Starting frontend dashboard..."
cd "$PROJECT_ROOT/apps/dashboard" && pnpm dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "  Services started:"
echo "  - Backend API: http://localhost:$BACKEND_PORT"
echo "  - Management Dashboard: http://localhost:$FRONTEND_PORT"
echo "    - Enterprise Admin: http://localhost:$FRONTEND_PORT/#/enterprise"
echo "    - Platform Admin: http://localhost:$FRONTEND_PORT/#/platform"
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
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait