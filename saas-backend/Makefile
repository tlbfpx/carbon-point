.PHONY: build build-jar build-frontend build-image up down logs restart clean test

# Variables
APP_NAME := carbon-point
VERSION := 1.0.0-SNAPSHOT
IMAGE_TAG := $(APP_NAME):$(VERSION)
DOCKER_REGISTRY :=

# ─────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────

build: build-jar build-frontend

build-jar:
	./mvnw clean package -DskipTests -B

build-frontend:
	cd .. && pnpm -r --filter @carbon-point/... build

build-image:
	docker build -t $(DOCKER_REGISTRY)$(IMAGE_TAG) .

# ─────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────

dev-backend:
	./mvnw spring-boot:run -pl carbon-app -Dspring-boot.run.profiles=dev

dev-frontend-h5:
	cd .. && pnpm --filter @carbon-point/h5 dev

dev-frontend-enterprise:
	cd .. && pnpm --filter @carbon-point/enterprise-frontend dev

dev-frontend-platform:
	cd .. && pnpm --filter @carbon-point/platform-frontend dev

dev: dev-backend dev-frontend-h5 dev-frontend-enterprise dev-frontend-platform

# ─────────────────────────────────────────────────────────
# Docker Compose (Development)
# ─────────────────────────────────────────────────────────

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-app:
	docker-compose logs -f app

restart:
	docker-compose restart app

clean:
	docker-compose down -v
	rm -rf */target
	rm -rf ../saas-frontend/*/dist

# ─────────────────────────────────────────────────────────
# Docker Compose (Production)
# ─────────────────────────────────────────────────────────

prod-up:
	@if [ ! -f .env.prod ]; then echo "ERROR: .env.prod not found. Copy .env.example.prod to .env.prod and fill in values."; exit 1; fi
	@if [ ! -d certs ]; then echo "WARNING: certs/ directory not found. SSL will be disabled."; fi
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-restart:
	docker-compose -f docker-compose.prod.yml restart app

# ─────────────────────────────────────────────────────────
# Testing
# ─────────────────────────────────────────────────────────

test:
	./mvnw test

test-module:
	./mvnw test -pl $(MODULE)

test-integration:
	./mvnw test -pl carbon-checkin -Dspring.profiles.active=test

# ─────────────────────────────────────────────────────────
# Deployment
# ─────────────────────────────────────────────────────────

deploy-staging:
	docker build -t $(DOCKER_REGISTRY)$(IMAGE_TAG)-staging .
	docker tag $(DOCKER_REGISTRY)$(IMAGE_TAG)-staging $(DOCKER_REGISTRY)$(APP_NAME):staging

deploy-prod:
	docker build -t $(DOCKER_REGISTRY)$(IMAGE_TAG) .
	docker push $(DOCKER_REGISTRY)$(IMAGE_TAG)

# ─────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────

mvn:
	./mvnw $(MAVEN_ARGS)

# Show help
help:
	@echo "Carbon Point Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  build               - Build all modules (backend + frontend)"
	@echo "  build-jar           - Build backend JAR"
	@echo "  build-frontend      - Build frontend apps"
	@echo "  build-image         - Build Docker image"
	@echo "  up                  - Start dev services with docker-compose"
	@echo "  down                - Stop dev services"
	@echo "  logs                - View all logs"
	@echo "  logs-app            - View application logs"
	@echo "  restart             - Restart the application container"
	@echo "  clean               - Clean all build artifacts and volumes"
	@echo "  test                - Run all tests"
	@echo "  test-module         - Run tests for a specific module (MODULE=carbon-checkin)"
	@echo "  dev-backend         - Start backend with dev profile"
	@echo "  dev-frontend-h5         - Start H5 dev server"
	@echo "  dev-frontend-enterprise  - Start enterprise frontend dev server"
	@echo "  dev-frontend-platform    - Start platform frontend dev server"
	@echo "  prod-up             - Start production services (requires .env.prod)"
	@echo "  prod-down           - Stop production services"
	@echo "  prod-logs           - View production logs"
	@echo "  prod-restart        - Restart production app container"
	@echo ""
