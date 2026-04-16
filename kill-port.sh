#!/bin/bash
# 杀掉占用指定端口的进程
# 用法: ./kill-port.sh <port1> [port2] [port3] ...

if [ $# -eq 0 ]; then
    echo "用法: $0 <port1> [port2] [port3] ..."
    echo "示例: $0 8080"
    echo "示例: $0 8080 3000 6379"
    exit 1
fi

kill_port() {
    local port="$1"
    echo "Checking port $port..."
    
    # 使用 lsof 获取占用端口的 PID
    local pid
    pid=$(lsof -ti :"$port" 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo "Killing process $pid on port $port..."
        kill -9 "$pid" 2>/dev/null
        sleep 0.5
        
        # 验证是否成功杀掉
        local still_alive
        still_alive=$(lsof -ti :"$port" 2>/dev/null)
        if [ -n "$still_alive" ]; then
            echo "Warning: Process $still_alive still running on port $port"
        else
            echo "Port $port cleared."
        fi
    else
        echo "Port $port is not in use."
    fi
}

echo "=========================================="
echo "  Kill Port Utility"
echo "=========================================="

for port in "$@"; do
    if [[ "$port" =~ ^[0-9]+$ ]]; then
        kill_port "$port"
    else
        echo "Error: '$port' is not a valid port number"
    fi
done

echo "=========================================="
echo "  Done."
echo "=========================================="
