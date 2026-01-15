#!/bin/bash

# API 测试脚本
# 使用方法: ./test-api.sh [端点名称]

BASE_URL="http://localhost:3000"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印帮助信息
print_help() {
  echo "=== API 测试脚本 ==="
  echo ""
  echo "使用方法: ./test-api.sh [命令]"
  echo ""
  echo "可用命令:"
  echo "  health              - 测试服务健康状态"
  echo "  register            - 注册管理员账号"
  echo "  login               - 管理员登录"
  echo "  products            - 查询产品列表"
  echo "  product [id]        - 查询产品详情"
  echo "  users               - 查询用户列表 (需要 token)"
  echo "  orders              - 查询订单列表 (需要 token)"
  echo "  dashboard           - 查询看板数据 (需要 token)"
  echo ""
  echo "示例:"
  echo "  ./test-api.sh health"
  echo "  ./test-api.sh products"
  echo "  ./test-api.sh product 1"
}

# 测试健康状态
test_health() {
  echo -e "${BLUE}测试服务健康状态...${NC}"
  curl -s $BASE_URL/ | jq .
  echo ""
}

# 注册管理员
register_admin() {
  echo -e "${BLUE}注册管理员账号...${NC}"
  curl -X POST $BASE_URL/admin/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@example.com",
      "password": "Admin123456",
      "nickname": "测试管理员"
    }' | jq .
  echo ""
}

# 管理员登录
login_admin() {
  echo -e "${BLUE}管理员登录...${NC}"
  RESPONSE=$(curl -s -X POST $BASE_URL/admin/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@example.com",
      "password": "Admin123456"
    }')

  echo "$RESPONSE" | jq .

  # 保存 token 到文件（修正路径）
  TOKEN=$(echo "$RESPONSE" | jq -r '.data.data.accessToken')
  if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "$TOKEN" > /Users/zhangchenyu/Documents/trae_projects/bmad1/.token
    echo -e "${GREEN}Token 已保存到 .token 文件${NC}"
  fi
}

# 查询产品列表
get_products() {
  echo -e "${BLUE}查询产品列表...${NC}"
  curl -s "$BASE_URL/v1/products" | jq .
  echo ""
}

# 查询产品详情
get_product() {
  local id=$1
  if [ -z "$id" ]; then
    id=1
  fi
  echo -e "${BLUE}查询产品详情 (ID: $id)...${NC}"
  curl -s "$BASE_URL/v1/products/$id" | jq .
  echo ""
}

# 查询用户列表（需要认证）
get_users() {
  TOKEN_FILE="/Users/zhangchenyu/Documents/trae_projects/bmad1/.token"
  if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${RED}错误: 未找到 token，请先执行 login${NC}"
    return
  fi

  TOKEN=$(tr -d '\n' < "$TOKEN_FILE")
  echo -e "${BLUE}查询用户列表...${NC}"
  curl -s "$BASE_URL/admin/users" \
    -H "Authorization: Bearer $TOKEN" | jq .
  echo ""
}

# 查询订单列表（需要认证）
get_orders() {
  TOKEN_FILE="/Users/zhangchenyu/Documents/trae_projects/bmad1/.token"
  if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${RED}错误: 未找到 token，请先执行 login${NC}"
    return
  fi

  TOKEN=$(tr -d '\n' < "$TOKEN_FILE")
  echo -e "${BLUE}查询订单列表...${NC}"
  curl -s "$BASE_URL/admin/orders" \
    -H "Authorization: Bearer $TOKEN" | jq .
  echo ""
}

# 查询看板数据（需要认证）
get_dashboard() {
  TOKEN_FILE="/Users/zhangchenyu/Documents/trae_projects/bmad1/.token"
  if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${RED}错误: 未找到 token，请先执行 login${NC}"
    return
  fi

  TOKEN=$(tr -d '\n' < "$TOKEN_FILE")
  echo -e "${BLUE}查询看板数据...${NC}"
  curl -s "$BASE_URL/admin/dashboard/overview" \
    -H "Authorization: Bearer $TOKEN" | jq .
  echo ""
}

# 主逻辑
case "$1" in
  health)
    test_health
    ;;
  register)
    register_admin
    ;;
  login)
    login_admin
    ;;
  products)
    get_products
    ;;
  product)
    get_product $2
    ;;
  users)
    get_users
    ;;
  orders)
    get_orders
    ;;
  dashboard)
    get_dashboard
    ;;
  *)
    print_help
    ;;
esac
