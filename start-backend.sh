#!/bin/bash
set -e

# Show help
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Usage: $0 [PORT]"
    echo "Start backend application on the specified port (default: 8080)"
    echo "Options:"
    echo "  -h, --help    Show this help message"
    exit 0
fi

PORT=${1:-8080}

# Validate port is a number between 1 and 65535
if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "Error: Invalid port number '$PORT'. Port must be between 1 and 65535."
    exit 1
fi

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill process occupying the port
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "Port $PORT is in use, killing process..."
    kill -9 $(lsof -ti:$PORT) 2>/dev/null || true
    sleep 1
fi

cd "$APP_DIR/saas-backend"

echo "Building backend (skipping tests)..."
./mvnw clean install -DskipTests -q

echo "Starting backend on port $PORT..."
nohup ./mvnw spring-boot:run -pl carbon-app -Dspring-boot.run.arguments="--server.port=$PORT" > "$APP_DIR/backend.log" 2>&1 &
echo "Backend started on port $PORT (PID: $!)"
