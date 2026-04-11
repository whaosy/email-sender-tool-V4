# Docker 生产部署指南

本指南详细说明如何在生产环境中部署邮件发送系统。

---

## 📋 目录

1. [生产环境架构](#生产环境架构)
2. [安全配置](#安全配置)
3. [性能优化](#性能优化)
4. [监控和日志](#监控和日志)
5. [备份和恢复](#备份和恢复)
6. [故障转移](#故障转移)

---

## 🏗️ 生产环境架构

### 推荐架构

```
┌─────────────────────────────────────────────────────────────┐
│                     互联网用户                               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Nginx 反向代理                              │
│              (SSL/TLS 终止，负载均衡)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   App 1      │  │   App 2      │  │   App 3      │
│ (Node.js)    │  │ (Node.js)    │  │ (Node.js)    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   MySQL 主库 (Master)   │
            │   (读写)               │
            └────────┬───────────────┘
                     │ 复制
            ┌────────▼───────────────┐
            │   MySQL 从库 (Slave)    │
            │   (只读)               │
            └────────────────────────┘
```

### 使用 Docker Swarm 部署

```bash
# 初始化 Swarm 集群
docker swarm init

# 加入其他节点
docker swarm join --token <token> <manager-ip>:2377

# 部署服务
docker stack deploy -c docker-compose.prod.yml email-sender

# 查看服务状态
docker service ls
docker service ps email-sender_app
```

### 使用 Kubernetes 部署

参考 `kubernetes/` 目录中的配置文件。

---

## 🔐 安全配置

### 1. SSL/TLS 证书

#### 使用 Let's Encrypt 获取免费证书

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot certonly --standalone -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

#### 在 Nginx 中配置 SSL

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. 环境变量管理

使用 Docker Secrets（Swarm）或 Kubernetes Secrets：

```bash
# Docker Swarm
echo "your-secret-value" | docker secret create jwt_secret -

# 在服务中使用
docker service create \
  --secret jwt_secret \
  --env JWT_SECRET_FILE=/run/secrets/jwt_secret \
  email-sender-tool
```

### 3. 网络隔离

```yaml
# docker-compose.prod.yml
services:
  app:
    networks:
      - frontend
      - backend

  mysql:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br-backend
```

### 4. 用户权限

```dockerfile
# Dockerfile
# 使用非 root 用户运行应用
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
```

---

## ⚡ 性能优化

### 1. 资源限制

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
  
  mysql:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

### 2. 连接池优化

```typescript
// server/db.ts
const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});
```

### 3. 缓存策略

```yaml
# docker-compose.prod.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

volumes:
  redis_data:
```

### 4. 日志优化

```yaml
# docker-compose.prod.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "10"
        labels: "service=email-sender"
```

---

## 📊 监控和日志

### 1. Prometheus + Grafana 监控

```yaml
# docker-compose.prod.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
```

### 2. ELK Stack 日志收集

```yaml
# docker-compose.prod.yml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      discovery.type: single-node
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
```

### 3. 应用健康检查

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
```

---

## 💾 备份和恢复

### 1. 自动数据库备份

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 备份数据库
docker-compose exec -T mysql mysqldump \
  -u email_user -p${MYSQL_PASSWORD} \
  email_sender_db > ${BACKUP_DIR}/backup_${TIMESTAMP}.sql

# 压缩备份
gzip ${BACKUP_DIR}/backup_${TIMESTAMP}.sql

# 删除 7 天前的备份
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
```

### 2. 定时备份（Cron）

```bash
# 每天凌晨 2 点执行备份
0 2 * * * /path/to/backup.sh
```

### 3. 恢复数据库

```bash
# 恢复备份
docker-compose exec -T mysql mysql \
  -u email_user -p${MYSQL_PASSWORD} \
  email_sender_db < backup_20240101_020000.sql
```

### 4. 数据卷备份

```bash
# 备份 MySQL 数据卷
docker run --rm \
  -v email-sender-tool_mysql_data:/data \
  -v /backups:/backup \
  alpine tar czf /backup/mysql_data_backup.tar.gz -C /data .

# 恢复数据卷
docker run --rm \
  -v email-sender-tool_mysql_data:/data \
  -v /backups:/backup \
  alpine tar xzf /backup/mysql_data_backup.tar.gz -C /data
```

---

## 🔄 故障转移

### 1. 使用 Docker Swarm 的自动重启

```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

### 2. 使用 Keepalived 实现高可用

```bash
# 安装 Keepalived
sudo apt-get install keepalived

# 配置 Keepalived
sudo nano /etc/keepalived/keepalived.conf
```

### 3. 数据库主从复制

```sql
-- 主库配置
CHANGE MASTER TO
  MASTER_HOST='slave-ip',
  MASTER_USER='replication',
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=154;

START SLAVE;
```

---

## 📈 扩展性

### 1. 水平扩展

```bash
# 增加应用实例
docker service scale email-sender_app=3

# 查看服务副本
docker service ps email-sender_app
```

### 2. 负载均衡

```nginx
# Nginx 配置
upstream app_backend {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://app_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 数据库分片

对于大规模应用，考虑数据库分片或使用 MySQL Cluster。

---

## 🚀 部署检查清单

- [ ] SSL/TLS 证书已配置
- [ ] 数据库备份策略已制定
- [ ] 监控和告警已设置
- [ ] 日志收集已配置
- [ ] 资源限制已设置
- [ ] 健康检查已启用
- [ ] 自动重启策略已配置
- [ ] 故障转移机制已测试
- [ ] 安全组/防火墙已配置
- [ ] 定期备份已验证

---

## 📞 获取帮助

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Swarm 指南](https://docs.docker.com/engine/swarm/)
- [Kubernetes 文档](https://kubernetes.io/docs/)

---

**祝您部署顺利！** 🎉
