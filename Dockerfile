# ========================================
# Dockerfile для VPN Backend (NestJS)
# Multi-stage build для оптимизации размера
# ========================================

# Stage 1: Build
FROM node:18-alpine AS builder

# Установка рабочей директории
WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка всех зависимостей (включая dev)
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Удаление dev зависимостей
RUN npm prune --production

# ========================================
# Stage 2: Production
FROM node:18-alpine AS production

# Установка безопасного пользователя (не root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Установка рабочей директории
WORKDIR /app

# Копирование зависимостей из builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Копирование собранного приложения
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Копирование package.json для метаданных
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Переключение на пользователя nodejs
USER nodejs

# Открытие порта приложения
EXPOSE 3000

# Health check для мониторинга
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Запуск приложения
CMD ["node", "dist/main"]
