# ⚡ Быстрая шпаргалка - Развертывание VPN Backend

## 🔥 1. Полная очистка (на VPS)

```bash
# Остановить и удалить все Docker контейнеры и данные
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
docker volume rm $(docker volume ls -q) 2>/dev/null || true
docker system prune -a --volumes -f

# Удалить старые директории
rm -rf /opt/vpn-backend /opt/3x-ui /root/vpn-credentials.txt

# Удалить PostgreSQL если установлен
systemctl stop postgresql 2>/dev/null || true
apt-get remove --purge postgresql postgresql-* -y 2>/dev/null || true
rm -rf /var/lib/postgresql /etc/postgresql
```

## 🔧 2. Подготовка системы

```bash
# Обновить систему
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git nano

# Настроить firewall
ufw --force enable
ufw allow 22/tcp 80/tcp 443/tcp 2053/tcp 3000/tcp

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
systemctl start docker && systemctl enable docker
```

## 📥 3. Установка проекта

```bash
# Создать директорию
mkdir -p /opt/vpn-backend && cd /opt/vpn-backend

# Вариант A: Клонировать из Git
git clone https://github.com/YOUR_USERNAME/vpn-backend.git .

# Вариант B: Загрузить файлы
# На локальной машине:
cd c:\Users\artur\WebstormProjects\vpn
tar -czf vpn-backend.tar.gz .
scp vpn-backend.tar.gz root@YOUR_VPS_IP:/opt/vpn-backend/

# На VPS:
cd /opt/vpn-backend
tar -xzf vpn-backend.tar.gz && rm vpn-backend.tar.gz
```

## 🔐 4. Создать .env с паролями

```bash
cd /opt/vpn-backend

# Сгенерировать пароли
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
JWT_SECRET=$(openssl rand -base64 64 | tr -d '/+=')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '/+=')
XRAY_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=')

# Создать .env
cat > .env << EOF
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*

DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=vpn
DB_SYNCHRONIZE=true
DB_LOGGING=false

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
STRIPE_MONTHLY_PRICE_ID=price_YOUR_MONTHLY_ID
STRIPE_YEARLY_PRICE_ID=price_YOUR_YEARLY_ID

FRONTEND_URL=http://localhost:3000

XRAY_PANEL_URL=http://3x-ui:2053
XRAY_PANEL_USERNAME=admin
XRAY_PANEL_PASSWORD=${XRAY_PASSWORD}
EOF

# Сохранить credentials
cat > /root/vpn-credentials.txt << EOF
Backend API: http://$(curl -s ifconfig.me):3000
API Docs: http://$(curl -s ifconfig.me):3000/api
3X-UI Panel: http://$(curl -s ifconfig.me):2053

DB Password: ${DB_PASSWORD}
3X-UI Login: admin
3X-UI Password: ${XRAY_PASSWORD}
JWT Secret: ${JWT_SECRET}
EOF

chmod 600 /root/vpn-credentials.txt
cat /root/vpn-credentials.txt
```

## 🚀 5. Запуск

```bash
cd /opt/vpn-backend

# Создать network
docker network create vpn_network 2>/dev/null || true

# Запустить все сервисы
docker compose -f docker-compose.full.yml up -d

# Проверить статус
docker compose -f docker-compose.full.yml ps

# Посмотреть логи
docker compose -f docker-compose.full.yml logs -f
```

## ✅ 6. Проверка

```bash
# Проверить Backend
curl http://localhost:3000/api

# Проверить БД
docker exec vpn_postgres pg_isready -U postgres

# Проверить 3X-UI (в браузере)
echo "http://$(curl -s ifconfig.me):2053"

# Показать все контейнеры
docker ps
```

## 🔧 7. Настройка 3X-UI

```bash
# 1. Открыть в браузере
echo "http://$(curl -s ifconfig.me):2053"

# 2. Войти (credentials в /root/vpn-credentials.txt)
cat /root/vpn-credentials.txt

# 3. В панели: Inbounds -> Add Inbound
# Protocol: VLESS
# Port: 443
# Security: reality
# Dest: github.com:443
# Flow: xtls-rprx-vision
```

## 🧪 8. Тест API

```bash
# Создать пользователя
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","username":"test"}'

# Логин
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# Сохраните accessToken из ответа!
```

## 📊 Полезные команды

```bash
# Просмотр логов
docker logs -f vpn_backend
docker logs -f vpn_postgres
docker logs -f vpn_3x_ui

# Перезапуск
docker restart vpn_backend
docker restart vpn_postgres
docker restart vpn_3x_ui

# Остановка всех сервисов
docker compose -f /opt/vpn-backend/docker-compose.full.yml down

# Запуск всех сервисов
docker compose -f /opt/vpn-backend/docker-compose.full.yml up -d

# Статус
docker compose -f /opt/vpn-backend/docker-compose.full.yml ps

# Использование ресурсов
docker stats

# Зайти в контейнер
docker exec -it vpn_backend sh
docker exec -it vpn_postgres psql -U postgres -d vpn

# Показать credentials
cat /root/vpn-credentials.txt

# Проверить .env
cat /opt/vpn-backend/.env
```

## 🔄 Обновление (в будущем)

```bash
cd /opt/vpn-backend

# Остановить
docker compose -f docker-compose.full.yml down

# Обновить код
git pull origin master

# Запустить
docker compose -f docker-compose.full.yml up -d --build
```

## 🆘 Troubleshooting

```bash
# Backend не запускается
docker logs vpn_backend
docker restart vpn_backend

# БД не работает
docker logs vpn_postgres
docker exec vpn_postgres pg_isready -U postgres

# 3X-UI не открывается
docker logs vpn_3x_ui
netstat -tulpn | grep 2053

# Полный перезапуск
docker compose -f /opt/vpn-backend/docker-compose.full.yml restart

# Удалить всё и начать заново
docker compose -f /opt/vpn-backend/docker-compose.full.yml down -v
rm -rf /opt/vpn-backend
# Затем повторите установку
```

## 📋 Быстрый чеклист

```bash
✓ VPS подготовлен (Ubuntu/Debian)
✓ Firewall настроен (порты: 22, 80, 443, 2053, 3000)
✓ Docker установлен
✓ Старые данные удалены
✓ Проект загружен в /opt/vpn-backend
✓ .env создан с паролями
✓ Контейнеры запущены
✓ Backend работает (curl http://localhost:3000/api)
✓ PostgreSQL работает
✓ 3X-UI доступен (http://IP:2053)
✓ VLESS inbound создан
✓ Credentials сохранены (/root/vpn-credentials.txt)
```

## 🎯 Важные URL

```bash
# Получить IP сервера
curl ifconfig.me

# Backend API
http://YOUR_IP:3000

# API Documentation (Swagger)
http://YOUR_IP:3000/api

# 3X-UI Panel
http://YOUR_IP:2053

# Credentials
cat /root/vpn-credentials.txt
```

---

**Готово! Проект развернут и работает! 🚀**
