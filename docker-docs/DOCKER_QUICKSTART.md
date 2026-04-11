# Docker 快速开始指南

本指南帮助您快速使用 Docker 部署邮件发送系统。

---

## 📋 前置要求

- **Docker**: 20.10+ ([安装指南](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ ([安装指南](https://docs.docker.com/compose/install/))
- **磁盘空间**: 至少 5GB 可用空间
- **内存**: 至少 2GB 可用内存

### 验证安装

```bash
docker --version
docker-compose --version
```

---

## 🚀 3 步快速启动

### 第 1 步：克隆或下载项目

```bash
# 克隆项目
git clone https://github.com/whaosy/email-settlementV3.git
cd email-settlementV3

# 或下载并解压项目文件
unzip email-sender-tool.zip
cd email-sender-tool
```

### 第 2 步：启动 Docker 容器

```bash
# 启动所有服务（应用 + MySQL）
docker-compose up -d

# 查看启动日志
docker-compose logs -f app
```

### 第 3 步：访问应用

打开浏览器访问：

```
http://localhost:3000
```

**默认登录凭证**:
- 用户名: `admin`
- 密码: `admin123`

---

## 🛠️ 常用命令

### 查看服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看详细的服务信息
docker-compose ps -a
```

### 查看日志

```bash
# 查看应用日志
docker-compose logs -f app

# 查看 MySQL 日志
docker-compose logs -f mysql

# 查看最后 100 行日志
docker-compose logs --tail=100 app

# 查看特定时间范围的日志
docker-compose logs --since 10m app
```

### 进入容器

```bash
# 进入应用容器
docker-compose exec app sh

# 进入数据库容器
docker-compose exec mysql mysql -u email_user -p email_sender_db

# 执行命令
docker-compose exec app node --version
```

### 停止和启动

```bash
# 停止所有服务（保留数据）
docker-compose stop

# 启动所有服务
docker-compose start

# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart app
```

### 删除和清理

```bash
# 停止并删除容器（保留数据卷）
docker-compose down

# 停止并删除容器和数据卷
docker-compose down -v

# 删除所有未使用的镜像和容器
docker system prune

# 删除所有未使用的资源（包括数据卷）
docker system prune -a --volumes
```

### 重新构建

```bash
# 重新构建镜像
docker-compose build

# 重新构建并启动
docker-compose up -d --build

# 不使用缓存重新构建
docker-compose build --no-cache
```

---

## 🔧 配置环境变量

### 方法 1: 使用 .env 文件

1. 复制 `.env.example` 为 `.env`:
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，修改必要的配置:
   ```env
   # 数据库配置
   MYSQL_PASSWORD=your_secure_password
   
   # JWT 密钥
   JWT_SECRET=your-super-secret-key
   
   # 应用端口
   PORT=3000
   ```

3. 重启服务:
   ```bash
   docker-compose restart
   ```

### 方法 2: 直接修改 docker-compose.yml

编辑 `docker-compose.yml` 中的 `environment` 部分:

```yaml
services:
  app:
    environment:
      DATABASE_URL: mysql://user:password@mysql:3306/db
      JWT_SECRET: your-secret-key
```

---

## 📊 监控和性能

### 查看资源使用情况

```bash
# 实时监控所有容器
docker stats

# 监控特定容器
docker stats email-sender-app
```

### 查看容器详细信息

```bash
# 查看容器配置
docker inspect email-sender-app

# 查看容器网络信息
docker network inspect email-sender-tool_email-network
```

### 查看磁盘使用

```bash
# 查看 Docker 磁盘使用情况
docker system df

# 查看特定卷的大小
docker volume ls
```

---

## 🔐 安全建议

### 1. 修改默认密码

```bash
# 进入数据库容器
docker-compose exec mysql mysql -u email_user -p email_sender_db

# 更新管理员密码
UPDATE users SET password='new_password_hash' WHERE username='admin';
```

### 2. 使用强密钥

```bash
# 生成强 JWT 密钥
openssl rand -base64 32

# 在 .env 中使用
JWT_SECRET=generated_key_here
```

### 3. 限制容器资源

在 `docker-compose.yml` 中配置资源限制:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### 4. 启用 HTTPS

使用 Nginx 反向代理并配置 SSL 证书（参考 `DOCKER_PRODUCTION.md`）。

---

## 🐛 故障排查

### 问题 1: 端口被占用

**症状**: `Error: bind: address already in use`

**解决方案**:

```bash
# 查看占用 3000 端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改 docker-compose.yml 中的端口映射
# ports:
#   - "8080:3000"
```

### 问题 2: 数据库连接失败

**症状**: `Error: connect ECONNREFUSED`

**解决方案**:

```bash
# 检查 MySQL 容器是否运行
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql

# 检查数据库连接字符串
docker-compose exec app env | grep DATABASE_URL
```

### 问题 3: 内存不足

**症状**: `JavaScript heap out of memory`

**解决方案**:

```bash
# 增加 Node.js 堆内存
# 在 docker-compose.yml 中修改
environment:
  NODE_OPTIONS: "--max-old-space-size=1024"
```

### 问题 4: 构建失败

**症状**: `Error: npm install failed`

**解决方案**:

```bash
# 清除缓存并重新构建
docker-compose build --no-cache

# 查看构建日志
docker-compose build --verbose

# 检查网络连接
docker-compose exec app ping -c 1 8.8.8.8
```

---

## 📈 扩展和优化

### 增加应用实例

使用 Docker Swarm 或 Kubernetes 进行编排（参考 `DOCKER_PRODUCTION.md`）。

### 使用 Redis 缓存

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 使用 Nginx 反向代理

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

---

## 📚 更多资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [完整部署指南](./DOCKER_PRODUCTION.md)
- [故障排查指南](./DOCKER_TROUBLESHOOTING.md)

---

## 💡 提示

- 使用 `docker-compose logs -f` 实时查看日志
- 定期备份数据库: `docker-compose exec mysql mysqldump -u email_user -p email_sender_db > backup.sql`
- 使用 `.dockerignore` 减少构建上下文大小
- 在生产环境中使用 Docker Swarm 或 Kubernetes

---

**祝您使用愉快！** 🎉

如有问题，请参考故障排查指南或查看应用日志。
