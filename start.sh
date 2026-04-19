#!/bin/bash
# Carbon Point 一键启动脚本
# 用法:
#   ./start.sh        # 直接启动后端 + 三个前端
#   ./start.sh -i     # 重新编译打包后启动
#
# 端口分配:
#   后端 API:    8080
#   企业前端:    3000
#   平台前端:    3001
#   H5 用户端:   3002

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/saas-backend"
FRONTEND_DIR="$SCRIPT_DIR/saas-frontend"

# 无参数: 启动已编译的 JAR；-i: 先重新编译打包再启动
BUILD_MODE=""
while getopts "i" opt; do
  case $opt in
    i) BUILD_MODE="rebuild" ;;
    *) echo "用法: $0 [-i]" >&2; exit 1 ;;
  esac
done

# ─── 端口清理 ───────────────────────────────────────────
kill_port() {
  local port=$1
  echo "清理端口 $port..."
  for i in 1 2 3; do
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      echo "  强制终止进程 $pid (端口 $port)"
      kill -9 $pid 2>/dev/null || true
      sleep 1
    else
      break
    fi
  done
  echo "  端口 $port 已释放"
}

echo "=========================================="
echo "  Carbon Point 一键启动"
echo "=========================================="
echo ""
echo "清理所有端口..."
for port in 8080 3000 3001 3002; do
  kill_port $port
done

# ─── 后端启动 ───────────────────────────────────────────
JAR_FILE="$BACKEND_DIR/carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar"

# 检查是否已有后端在运行
if pgrep -f "carbon-app-1.0.0-SNAPSHOT.jar" > /dev/null 2>&1; then
  echo "  错误: 后端已在运行 (carbon-app-1.0.0-SNAPSHOT.jar)" >&2
  echo "  请先停止现有进程: pkill -f carbon-app-1.0.0-SNAPSHOT.jar" >&2
  exit 1
fi

if [ "$BUILD_MODE" = "rebuild" ]; then
  echo "  重新编译打包 (跳过测试)..."
  cd "$BACKEND_DIR"
  ./mvnw clean package -Dmaven.test.skip=true -q
elif [ ! -f "$JAR_FILE" ]; then
  echo "  JAR 未找到，先编译打包..."
  cd "$BACKEND_DIR"
  ./mvnw package -Dmaven.test.skip=true -q
fi

if [ ! -f "$JAR_FILE" ]; then
  echo "  错误: 打包失败，未找到 JAR: $JAR_FILE" >&2
  exit 1
fi

echo "  启动后端 JAR..."
echo "  启动: java -jar $JAR_FILE --spring.profiles.active=dev"
cd "$BACKEND_DIR"
java -jar "$JAR_FILE" --spring.profiles.active=dev >/dev/null 2>&1 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"

# 等待后端就绪
echo "  等待后端启动 (最多 60s)..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
    echo "  后端已就绪"
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "  错误: 后端进程意外退出" >&2
    exit 1
  fi
  sleep 1
done

# ─── 三个前端启动 ───────────────────────────────────────
echo ""
echo "启动前端..."

cd "$FRONTEND_DIR"
pnpm dev --filter @carbon-point/enterprise-frontend >/dev/null 2>&1 &
ENTERPRISE_PID=$!
echo "  企业前端 PID: $ENTERPRISE_PID (http://localhost:3000/enterprise)"

pnpm dev --filter @carbon-point/platform-frontend >/dev/null 2>&1 &
PLATFORM_PID=$!
echo "  平台前端 PID: $PLATFORM_PID (http://localhost:3001/platform)"

pnpm dev --filter @carbon-point/h5 >/dev/null 2>&1 &
H5_PID=$!
echo "  H5 用户端 PID: $H5_PID (http://localhost:3002/h5/)"

# ─── 完成输出 ───────────────────────────────────────────
echo ""
echo "=========================================="
echo "  所有服务已启动"
echo "=========================================="
echo ""
printf "  %-20s  %s\n" "企业前端:" "http://localhost:3000/enterprise"
printf "  %-20s  %s\n" "平台前端:" "http://localhost:3001/platform"
printf "  %-20s  %s\n" "H5 用户端:" "http://localhost:3002/h5/"
printf "  %-20s  %s\n" "后端 API:" "http://localhost:8080"
echo ""
echo "测试账号:"
echo "  企业租户 (1380003xxxx / 123456)"
echo "  平台管理员 (1380001xxxx / 123456)"
echo ""
echo "按 Ctrl+C 停止所有服务"

# trap Ctrl+C
stop_all() {
  echo ""
  echo "停止所有服务..."
  kill $BACKEND_PID $ENTERPRISE_PID $PLATFORM_PID $H5_PID 2>/dev/null || true
  for port in 8080 3000 3001 3002; do
    kill_port $port
  done
  echo "已停止"
  exit 0
}
trap stop_all INT

# 等待所有后台进程
wait
