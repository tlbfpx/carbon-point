# ─────────────────────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml first for better layer caching
COPY mvnw pom.xml ./
COPY .mvn .mvn

# Copy all module directories first (needed for Maven reactor)
COPY carbon-common ./carbon-common
COPY carbon-system ./carbon-system
COPY carbon-checkin ./carbon-checkin
COPY carbon-points ./carbon-points
COPY carbon-mall ./carbon-mall
COPY carbon-report ./carbon-report
COPY carbon-honor ./carbon-honor
COPY carbon-app ./carbon-app

# Download dependencies (cached as a separate layer)
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Build the application (skip tests for Docker build)
RUN ./mvnw clean package -DskipTests -B

# ─────────────────────────────────────────────────────────────
# Stage 2: Runtime
# ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install DejaVu Sans fonts for captcha image generation
RUN apk add --no-cache font-dejavu

# Add non-root user for security
RUN addgroup -S carbon && adduser -S carbon -G carbon

# Copy the JAR file from build stage
COPY --from=builder /app/carbon-app/target/carbon-app-1.0.0-SNAPSHOT.jar app.jar

# Set ownership
RUN chown -R carbon:carbon /app

USER carbon

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-jar", "app.jar"]
