# ============================================================================
# 邮件发送系统 - 多阶段 Docker 构建
# ============================================================================
# 这是一个全栈应用（React 前端 + Express 后端）的多阶段构建配置
# 
# 构建流程：
# 1. 依赖安装阶段 (dependencies): 安装所有依赖
# 2. 前端构建阶段 (frontend-build): 使用 Vite 构建 React 前端
# 3. 后端构建阶段 (backend-build): 使用 esbuild 构建 Express 后端
# 4. 生产阶段 (production): 最终的生产镜像，仅包含必要的运行时文件
#
# 镜像大小优化：
# - 使用 node:22-alpine 作为基础镜像（仅 ~200MB）
# - 多阶段构建，最终镜像只包含运行时依赖
# - 移除构建工具和开发依赖
# ============================================================================

# ============================================================================
# 第一阶段：依赖安装
# ============================================================================
FROM node:22-alpine AS dependencies

WORKDIR /app

# 安装必要的系统库
# - build-base: C++ 编译工具（某些 npm 包需要）
# - python3: 某些原生模块的构建依赖
RUN apk add --no-cache build-base python3

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm（使用 npm 全局安装）
RUN npm install -g pnpm@10.4.1

# 使用 pnpm ci 安装依赖（比 npm ci 更快，且使用锁定版本）
# --frozen-lockfile: 如果 lock 文件与 package.json 不匹配则失败
RUN pnpm install --frozen-lockfile

# ============================================================================
# 第二阶段：前端构建
# ============================================================================
FROM node:22-alpine AS frontend-build

WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=dependencies /app/node_modules ./node_modules

# 复制项目文件
COPY package.json pnpm-lock.yaml tsconfig.json vite.config.ts ./
COPY client ./client
COPY server ./server
COPY drizzle ./drizzle
COPY shared ./shared
COPY patches ./patches

# 安装 pnpm
RUN npm install -g pnpm@10.4.1

# 构建前端（Vite 构建输出到 dist/public）
# 这会生成优化的静态文件
RUN pnpm build:frontend

# ============================================================================
# 第三阶段：后端构建
# ============================================================================
FROM node:22-alpine AS backend-build

WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=dependencies /app/node_modules ./node_modules

# 复制项目文件
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY server ./server
COPY shared ./shared
COPY drizzle ./drizzle

# 安装 pnpm
RUN npm install -g pnpm@10.4.1

# 构建后端（esbuild 构建输出到 dist/index.js）
RUN pnpm build:backend

# ============================================================================
# 第四阶段：生产镜像
# ============================================================================
FROM node:22-alpine AS production

WORKDIR /app

# 安装运行时依赖（仅包含生产依赖）
# - dumb-init: 处理 Docker 信号转发，确保正确的进程管理
RUN apk add --no-cache dumb-init

# 创建非 root 用户以提高安全性
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 从依赖阶段复制 node_modules（仅包含生产依赖）
# 注意：这会包含所有依赖，包括 devDependencies
# 如果需要进一步优化，可以在依赖阶段使用 --prod 标志
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# 从前端构建阶段复制前端构建产物
COPY --from=frontend-build --chown=nodejs:nodejs /app/dist/public ./dist/public

# 从后端构建阶段复制后端构建产物
COPY --from=backend-build --chown=nodejs:nodejs /app/dist ./dist

# 复制 package.json（运行时可能需要）
COPY --chown=nodejs:nodejs package.json ./

# 设置环境变量
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# 切换到非 root 用户
USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 暴露端口
EXPOSE 3000

# 使用 dumb-init 作为 PID 1 进程，确保正确的信号处理
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "dist/index.js"]

# ============================================================================
# 构建说明
# ============================================================================
# 构建镜像：
#   docker build -t email-sender-tool:latest .
#
# 运行容器：
#   docker run -p 3000:3000 \
#     -e DATABASE_URL="mysql://user:pass@host:3306/db" \
#     -e JWT_SECRET="your-secret-key" \
#     email-sender-tool:latest
#
# 使用 docker-compose：
#   docker-compose up -d
# ============================================================================
