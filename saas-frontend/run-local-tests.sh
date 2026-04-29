#!/bin/bash
#
# Carbon Point - 本地完整测试脚本
#
# 使用方式：
#   ./run-local-tests.sh          # 运行所有测试
#   ./run-local-tests.sh platform # 只运行平台前端
#   ./run-local-tests.sh enterprise # 只运行企业前端
#   ./run-local-tests.sh h5       # 只运行 H5
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Carbon Point 本地测试套件${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查当前目录
if [ ! -d "platform-frontend" ] || [ ! -d "enterprise-frontend" ] || [ ! -d "h5" ]; then
  echo -e "${RED}错误：请在 saas-frontend 目录下运行此脚本${NC}"
  exit 1
fi

# 复制 console-monitor 工具到所有项目
echo -e "${YELLOW}[1/5] 配置测试工具...${NC}"
mkdir -p enterprise-frontend/e2e/utils
cp platform-frontend/e2e/utils/console-monitor.ts enterprise-frontend/e2e/utils/
mkdir -p h5/e2e/utils
cp platform-frontend/e2e/utils/console-monitor.ts h5/e2e/utils/
echo -e "${GREEN}✓ Console Monitor 已配置${NC}"

# 目标项目
TARGETS=${1:-"all"}

run_platform() {
  echo ""
  echo -e "${YELLOW}[2/5] 运行平台前端测试...${NC}"
  cd platform-frontend
  echo -e "${YELLOW}使用配置: playwright.local-chrome.config.ts${NC}"
  echo -e "${YELLOW}模式: --headed (可视化)${NC}"
  npx playwright test --config=playwright.local-chrome.config.ts --headed || true
  cd ..
}

run_enterprise() {
  echo ""
  echo -e "${YELLOW}[3/5] 运行企业前端测试...${NC}"
  cd enterprise-frontend
  echo -e "${YELLOW}使用配置: playwright.local-chrome.config.ts${NC}"
  echo -e "${YELLOW}模式: --headed (可视化)${NC}"
  npx playwright test --config=playwright.local-chrome.config.ts --headed || true
  cd ..
}

run_h5() {
  echo ""
  echo -e "${YELLOW}[4/5] 运行 H5 移动端测试...${NC}"
  cd h5
  echo -e "${YELLOW}使用配置: e2e/playwright.local-chrome.config.ts${NC}"
  echo -e "${YELLOW}模式: --headed (可视化)${NC}"
  npx playwright test --config=e2e/playwright.local-chrome.config.ts --headed || true
  cd ..
}

# 执行测试
if [ "$TARGETS" = "all" ]; then
  run_platform
  run_enterprise
  run_h5
elif [ "$TARGETS" = "platform" ]; then
  run_platform
elif [ "$TARGETS" = "enterprise" ]; then
  run_enterprise
elif [ "$TARGETS" = "h5" ]; then
  run_h5
else
  echo -e "${RED}未知目标: $TARGETS${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  测试执行完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "报告位置："
echo "  平台前端: platform-frontend/e2e/reports-local/index.html"
echo "  企业前端: enterprise-frontend/e2e/reports-local/index.html"
echo "  H5 移动端: h5/e2e/reports-local/index.html"
echo ""
