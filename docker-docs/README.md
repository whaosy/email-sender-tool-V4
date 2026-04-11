# Docker 容器化部署文档

欢迎使用邮件发送系统的 Docker 容器化部署方案！本文档包含了完整的部署指南和配置说明。

---

## 📚 文档导航

### 🚀 快速开始（推荐首先阅读）

**[DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)** - 5 分钟快速上线指南

- 前置要求检查
- 3 步快速启动
- 常用命令速查
- 基本故障排查

**适合人群**: 首次使用 Docker 部署、想快速体验应用

---

### 🏗️ 生产部署指南

**[DOCKER_PRODUCTION.md](./DOCKER_PRODUCTION.md)** - 完整的生产环境部署指南

- 生产环境架构设计
- 安全配置（SSL/TLS、用户权限、网络隔离）
- 性能优化（资源限制、连接池、缓存策略）
- 监控和日志（Prometheus、ELK Stack）
- 备份和恢复策略
- 故障转移和高可用配置
- 扩展性方案（Docker Swarm、Kubernetes）

**适合人群**: 需要在生产环境部署、关注安全性和性能、需要高可用方案

---

### ✅ 配置验证报告

**[DOCKER_VERIFICATION.md](./DOCKER_VERIFICATION.md)** - Docker 配置验证和检查清单

- Dockerfile 验证结果
- docker-compose.yml 验证结果
- .dockerignore 文件检查
- 环境变量配置检查
- 启动脚本功能检查
- 配置清单和最终检查

**适合人群**: 需要了解配置细节、验证部署就绪状态

---

## 📁 Docker 配置文件清单

### 核心配置文件

| 文件 | 大小 | 说明 |
|------|------|------|
| **Dockerfile** | 5.0K | 多阶段构建配置，包含依赖安装、前端构建、后端构建、生产镜像 |
| **docker-compose.yml** | 6.3K | 容器编排配置，定义 MySQL 和应用服务、网络、数据卷 |
| **.dockerignore** | 3.3K | 构建时忽略文件列表，优化构建上下文大小 |
| **docker-start.sh** | 4.6K | 启动脚本，提供快速命令行操作界面 |

### 环境配置

| 文件 | 说明 |
|------|------|
| **.env.example** | 环境变量示例（项目根目录），包含所有可配置项 |

### 文档文件

| 文件 | 大小 | 说明 |
|------|------|------|
| **DOCKER_QUICKSTART.md** | 6.4K | 快速开始指南 |
| **DOCKER_PRODUCTION.md** | 11K | 生产部署指南 |
| **DOCKER_VERIFICATION.md** | 5.9K | 配置验证报告 |
| **README.md** | 本文件 | 文档导航 |

---

## 🎯 选择合适的指南

### 场景 1: 我想快速体验应用

👉 **阅读**: [DOCKER_QUICKSTART.md](./DOCKER_QUICKSTART.md)

**步骤**:
1. 验证 Docker 和 Docker Compose 已安装
2. 执行 `docker-compose up -d`
3. 访问 `http://localhost:3000`

**预计时间**: 5-10 分钟

---

### 场景 2: 我想在生产环境部署

👉 **阅读**: [DOCKER_PRODUCTION.md](./DOCKER_PRODUCTION.md)

**关键内容**:
- 生产环境架构设计
- SSL/TLS 证书配置
- 数据库主从复制
- 监控和告警设置
- 备份和恢复策略
- 高可用配置

**预计时间**: 1-2 小时

---

### 场景 3: 我想了解配置细节

👉 **阅读**: [DOCKER_VERIFICATION.md](./DOCKER_VERIFICATION.md)

**内容**:
- 所有配置文件的验证结果
- 多阶段构建的优化说明
- 安全特性和性能优化
- 镜像大小预估
- 配置检查清单

**预计时间**: 20-30 分钟

---

## 🚀 快速命令参考

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose stop

# 重启所有服务
docker-compose restart

# 查看服务状态
docker-compose ps
```

### 查看日志

```bash
# 查看应用日志
docker-compose logs -f app

# 查看 MySQL 日志
docker-compose logs -f mysql

# 查看最后 100 行日志
docker-compose logs --tail=100 app
```

### 进入容器

```bash
# 进入应用容器
docker-compose exec app sh

# 进入数据库容器
docker-compose exec mysql mysql -u email_user -p
```

### 使用启动脚本

```bash
# 查看帮助
./docker-start.sh help

# 启动容器
./docker-start.sh start

# 查看日志
./docker-start.sh logs

# 查看容器状态
./docker-start.sh status
```

---

## 📋 配置清单

### 部署前检查

- [ ] Docker 已安装（版本 20.10+）
- [ ] Docker Compose 已安装（版本 2.0+）
- [ ] 磁盘空间充足（至少 5GB）
- [ ] 内存充足（至少 2GB）
- [ ] 3000 端口未被占用

### 部署后检查

- [ ] 应用容器运行正常
- [ ] MySQL 容器运行正常
- [ ] 应用可访问（http://localhost:3000）
- [ ] 数据库连接成功
- [ ] 健康检查通过

### 生产部署检查

- [ ] SSL/TLS 证书已配置
- [ ] 数据库备份策略已制定
- [ ] 监控和告警已设置
- [ ] 日志收集已配置
- [ ] 资源限制已设置
- [ ] 自动重启策略已配置

---

## 🔧 常见问题

### Q: 如何修改应用端口？

A: 编辑 `docker-compose.yml`，修改 `ports` 部分:
```yaml
ports:
  - "8080:3000"  # 将 3000 改为其他端口
```

### Q: 如何修改数据库密码？

A: 编辑 `.env` 文件（从 `.env.example` 复制），修改:
```env
MYSQL_PASSWORD=your_new_password
```

### Q: 如何查看数据库中的数据？

A: 进入数据库容器:
```bash
docker-compose exec mysql mysql -u email_user -p email_sender_db
```

### Q: 如何备份数据库？

A: 执行备份命令:
```bash
docker-compose exec mysql mysqldump -u email_user -p email_sender_db > backup.sql
```

### Q: 如何恢复数据库？

A: 执行恢复命令:
```bash
docker-compose exec mysql mysql -u email_user -p email_sender_db < backup.sql
```

---

## 📞 获取帮助

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [MySQL 文档](https://dev.mysql.com/doc/)
- [Node.js 文档](https://nodejs.org/docs/)

---

## 📝 版本信息

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 22-alpine
- **MySQL**: 5.7
- **应用版本**: 1.0.0

---

## 🎉 开始部署

选择适合您的指南，开始部署邮件发送系统吧！

- 🚀 [快速开始](./DOCKER_QUICKSTART.md)
- 🏗️ [生产部署](./DOCKER_PRODUCTION.md)
- ✅ [配置验证](./DOCKER_VERIFICATION.md)

---

**祝您部署顺利！** 🎊
