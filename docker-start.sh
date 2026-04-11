#!/bin/bash

# ============================================================================
# Docker 启动脚本
# ============================================================================
# 用于快速启动和管理 Docker 容器
#
# 使用方法：
#   ./docker-start.sh start      # 启动容器
#   ./docker-start.sh stop       # 停止容器
#   ./docker-start.sh restart    # 重启容器
#   ./docker-start.sh logs       # 查看日志
#   ./docker-start.sh build      # 构建镜像
#   ./docker-start.sh clean      # 清理容器和镜像
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 函数：打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查 Docker 和 Docker Compose
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    print_success "Docker 和 Docker Compose 已安装"
}

# 启动容器
start_containers() {
    print_info "正在启动容器..."
    docker-compose up -d
    print_info "等待服务启动..."
    sleep 5
    
    if docker-compose ps | grep -q "healthy"; then
        print_success "容器已启动"
        print_info "应用地址: http://localhost:3000"
        print_info "用户名: admin"
        print_info "密码: admin123"
    else
        print_warning "容器正在启动，请稍候..."
        docker-compose logs -f app
    fi
}

# 停止容器
stop_containers() {
    print_info "正在停止容器..."
    docker-compose stop
    print_success "容器已停止"
}

# 重启容器
restart_containers() {
    print_info "正在重启容器..."
    docker-compose restart
    print_success "容器已重启"
}

# 查看日志
show_logs() {
    print_info "显示应用日志（按 Ctrl+C 退出）..."
    docker-compose logs -f app
}

# 构建镜像
build_image() {
    print_info "正在构建镜像..."
    docker-compose build
    print_success "镜像构建完成"
}

# 清理容器和镜像
clean_containers() {
    print_warning "即将删除所有容器和镜像（数据卷将保留）"
    read -p "确认删除？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "正在清理..."
        docker-compose down
        print_success "清理完成"
    else
        print_info "已取消"
    fi
}

# 显示帮助信息
show_help() {
    echo "Docker 启动脚本"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start       启动容器"
    echo "  stop        停止容器"
    echo "  restart     重启容器"
    echo "  logs        查看日志"
    echo "  build       构建镜像"
    echo "  clean       清理容器和镜像"
    echo "  status      查看容器状态"
    echo "  shell       进入应用容器"
    echo "  mysql       进入数据库容器"
    echo "  help        显示帮助信息"
}

# 查看容器状态
show_status() {
    print_info "容器状态:"
    docker-compose ps
}

# 进入应用容器
enter_app_shell() {
    print_info "进入应用容器..."
    docker-compose exec app sh
}

# 进入数据库容器
enter_mysql_shell() {
    print_info "进入数据库容器..."
    docker-compose exec mysql mysql -u email_user -p
}

# 主程序
main() {
    check_docker

    case "${1:-help}" in
        start)
            start_containers
            ;;
        stop)
            stop_containers
            ;;
        restart)
            restart_containers
            ;;
        logs)
            show_logs
            ;;
        build)
            build_image
            ;;
        clean)
            clean_containers
            ;;
        status)
            show_status
            ;;
        shell)
            enter_app_shell
            ;;
        mysql)
            enter_mysql_shell
            ;;
        help)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"
