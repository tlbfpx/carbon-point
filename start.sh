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
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

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
BACKEND_LOG="$LOG_DIR/backend.log"
echo "  启动: java -jar $JAR_FILE --spring.profiles.active=dev"
echo "  日志: $BACKEND_LOG"
cd "$BACKEND_DIR"
java -jar "$JAR_FILE" --spring.profiles.active=dev > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "  后端 PID: $BACKEND_PID"

# 等待后端就绪，同时实时显示日志
echo "  等待后端启动 (最多 60s)..."
echo "  ─── 后端启动日志 ───"
for i in $(seq 1 60); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/login 2>/dev/null | grep -qE '^[0-9]{3}$'; then
    echo ""
    echo "  后端已就绪"
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo ""
    echo "  错误: 后端进程意外退出" >&2
    echo "  最后 20 行日志:" >&2
    tail -20 "$BACKEND_LOG" >&2
    exit 1
  fi
  # 每秒刷新最新日志
  sleep 1
  tail -1 "$BACKEND_LOG" 2>/dev/null | sed 's/^/  /'
done

# ─── 三个前端启动 ───────────────────────────────────────
echo ""
echo "启动前端..."

# 检查并安装前端依赖（node_modules 不存在或 vite 不可用时重装）
for dir in enterprise-frontend platform-frontend h5; do
  NODE_MODULES="$FRONTEND_DIR/$dir/node_modules"
  if [ ! -d "$NODE_MODULES" ] || [ ! -f "$NODE_MODULES/vite/bin/vite.js" ]; then
    echo "  安装 $dir 依赖..."
    rm -rf "$NODE_MODULES"
    cd "$FRONTEND_DIR/$dir" && pnpm install
  fi
done

ENTERPRISE_LOG="$LOG_DIR/enterprise-frontend.log"
cd "$FRONTEND_DIR/enterprise-frontend" && pnpm dev > "$ENTERPRISE_LOG" 2>&1 &
ENTERPRISE_PID=$!
echo "  企业前端 PID: $ENTERPRISE_PID (http://localhost:3000/enterprise)"
echo "    日志: $ENTERPRISE_LOG"

PLATFORM_LOG="$LOG_DIR/platform-frontend.log"
cd "$FRONTEND_DIR/platform-frontend" && pnpm dev > "$PLATFORM_LOG" 2>&1 &
PLATFORM_PID=$!
echo "  平台前端 PID: $PLATFORM_PID (http://localhost:3001/platform)"
echo "    日志: $PLATFORM_LOG"

H5_LOG="$LOG_DIR/h5.log"
cd "$FRONTEND_DIR/h5" && pnpm dev > "$H5_LOG" 2>&1 &
H5_PID=$!
echo "  H5 用户端 PID: $H5_PID (http://localhost:3002/h5/)"
echo "    日志: $H5_LOG"

# 等待前端就绪
wait_for_port() {
  local name=$1 port=$2 pid=$3 log=$4
  echo -n "  等待 $name 就绪 (端口 $port)..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:$port >/dev/null 2>&1; then
      echo " OK"
      return 0
    fi
    if ! kill -0 $pid 2>/dev/null; then
      echo " 失败!"
      echo "  错误: $name 进程意外退出" >&2
      tail -20 "$log" >&2
      return 1
    fi
    sleep 1
  done
  echo " 超时"
  echo "  警告: $name 在 30s 内未就绪，请检查日志: $log"
  return 0
}

echo ""
wait_for_port "企业前端" 3000 $ENTERPRISE_PID "$ENTERPRISE_LOG"
wait_for_port "平台前端" 3001 $PLATFORM_PID "$PLATFORM_LOG"
wait_for_port "H5 用户端" 3002 $H5_PID "$H5_LOG"

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
echo "日志目录: $LOG_DIR/"
echo "  查看实时日志: tail -f $LOG_DIR/<service>.log"
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
