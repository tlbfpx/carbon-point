#!/bin/sh
# ─────────────────────────────────────────────────────────────
# Carbon Point Docker Entrypoint Script
# Performs health checks and initial setup before starting the app
# ─────────────────────────────────────────────────────────────

set -e

echo "Waiting for MySQL to be ready..."
until mysql -h"${DB_HOST:-mysql}" -u"${DB_USER:-root}" -p"${DB_PASSWORD:-rootpassword}" -e "SELECT 1" &>/dev/null; do
    echo "MySQL is unavailable - sleeping"
    sleep 2
done
echo "MySQL is ready!"

echo "Waiting for Redis to be ready..."
until redis-cli -h"${REDIS_HOST:-redis}" ping | grep -q PONG; do
    echo "Redis is unavailable - sleeping"
    sleep 1
done
echo "Redis is ready!"

# Run database migrations if needed (optional)
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    # mysql -h"${DB_HOST:-mysql}" -u"${DB_USER:-root}" -p"${DB_PASSWORD:-rootpassword}" carbon_point < /app/migrations/latest.sql
fi

echo "Starting Carbon Point application..."
exec java -XX:+UseG1GC \
    -XX:MaxRAMPercentage=75.0 \
    -Djava.security.egd=file:/dev/./urandom \
    -Dspring.profiles.active="${SPRING_PROFILES_ACTIVE:-prod}" \
    -jar app.jar
