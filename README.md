# 🚀 ПОШАГОВАЯ ИНСТРУКЦИЯ ПО РАЗВЕРТЫВАНИЮ НА VPS

## 📋 Требования

- **VPS:** Ubuntu 20.04/22.04 или Debian 11/12
- **RAM:** Минимум 2GB (рекомендуется 4GB)
- **CPU:** 2 ядра или больше
- **Диск:** Минимум 20GB свободного места
- **Доступ:** Root доступ по SSH

---

## 🔥 ШАГ 1: Полная очистка предыдущих установок

### 1.1. Подключитесь к VPS по SSH

```bash
ssh root@YOUR_VPS_IP
```

### 1.2. Остановите и удалите все существующие контейнеры

```bash
# Остановить все Docker контейнеры
docker stop $(docker ps -aq) 2>/dev/null || true

# Удалить все контейнеры
docker rm $(docker ps -aq) 2>/dev/null || true

# Удалить все Docker образы
docker rmi $(docker images -q) 2>/dev/null || true

# Удалить все Docker volumes (ВНИМАНИЕ: Это удалит ВСЕ данные!)
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Удалить все Docker networks (кроме стандартных)
docker network prune -f

# Очистить весь Docker кэш
docker system prune -a --volumes -f
```

### 1.3. Удалите старые директории проекта

```bash
# Удалить старую директорию проекта
rm -rf /opt/vpn-backend

# Удалить старые данные 3X-UI
rm -rf /opt/3x-ui

# Удалить старые credentials
rm -f /root/vpn-credentials.txt

# Удалить старые backup'ы (если есть)
rm -rf /opt/backups
```

### 1.4. Удалите PostgreSQL если он установлен локально

```bash
# Остановить PostgreSQL
systemctl stop postgresql 2>/dev/null || true

# Удалить PostgreSQL и все данные
apt-get remove --purge postgresql postgresql-* -y 2>/dev/null || true
rm -rf /var/lib/postgresql
rm -rf /etc/postgresql

# Очистить автозагрузку
systemctl disable postgresql 2>/dev/null || true
```

---

## 🔧 ШАГ 2: Подготовка системы

### 2.1. Обновите систему

```bash
# Обновить список пакетов
apt-get update

# Обновить все пакеты
apt-get upgrade -y

# Установить базовые утилиты
apt-get install -y curl wget git nano htop
```

### 2.2. Настройте firewall (UFW)

```bash
# Включить firewall
ufw --force enable

# Разрешить SSH (ВАЖНО!)
ufw allow 22/tcp

# Разрешить HTTP
ufw allow 80/tcp

# Разрешить HTTPS (для Xray)
ufw allow 443/tcp

# Разрешить 3X-UI панель
ufw allow 2053/tcp

# Разрешить Backend API
ufw allow 3000/tcp

# Проверить статус
ufw status
```

### 2.3. Установите Docker

```bash
# Удалить старые версии Docker (если есть)
apt-get remove docker docker-engine docker.io containerd runc 2>/dev/null || true

# Установить зависимости
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Добавить официальный GPG ключ Docker
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Добавить репозиторий Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установить Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Проверить установку
docker --version
docker compose version
```

### 2.4. Запустите Docker

```bash
# Запустить Docker
systemctl start docker

# Включить автозагрузку
systemctl enable docker

# Проверить статус
systemctl status docker
```

---

## 📥 ШАГ 3: Установка проекта

### 3.1. Создайте директорию проекта

```bash
# Создать директорию
mkdir -p /opt/vpn-backend

# Перейти в директорию
cd /opt/vpn-backend
```

### 3.2. Склонируйте репозиторий

**Вариант A: Если у вас есть Git репозиторий**

```bash
# Склонировать репозиторий
git clone https://github.com/YOUR_USERNAME/vpn-backend.git .

# Проверить что файлы на месте
ls -la
```

**Вариант B: Если репозитория нет - загрузите файлы вручную**

```bash
# На вашем локальном компьютере:
# 1. Запакуйте проект
cd c:\Users\artur\WebstormProjects\vpn
tar -czf vpn-backend.tar.gz .

# 2. Загрузите на VPS
scp vpn-backend.tar.gz root@YOUR_VPS_IP:/opt/vpn-backend/

# 3. На VPS распакуйте
cd /opt/vpn-backend
tar -xzf vpn-backend.tar.gz
rm vpn-backend.tar.gz
```

### 3.3. Создайте .env файл

```bash
# Создать .env файл с автоматической генерацией секретов
cat > /opt/vpn-backend/.env << 'EOF'
# Node Environment
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=REPLACE_WITH_SECURE_PASSWORD
DB_DATABASE=vpn
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=REPLACE_WITH_JWT_SECRET
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=REPLACE_WITH_JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d

# Stripe Payment Configuration (заполните свои)
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
STRIPE_MONTHLY_PRICE_ID=price_YOUR_MONTHLY_ID
STRIPE_YEARLY_PRICE_ID=price_YOUR_YEARLY_ID

# Frontend URL (измените на свой домен)
FRONTEND_URL=http://localhost:3000

# Xray Panel Configuration (3X-UI)
XRAY_PANEL_URL=http://3x-ui:2053
XRAY_PANEL_USERNAME=admin
XRAY_PANEL_PASSWORD=REPLACE_WITH_XRAY_PASSWORD
EOF
```

### 3.4. Сгенерируйте безопасные пароли

```bash
# Генерация паролей
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
JWT_SECRET=$(openssl rand -base64 64 | tr -d '/+=')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '/+=')
XRAY_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=')

# Замените пароли в .env
sed -i "s|DB_PASSWORD=REPLACE_WITH_SECURE_PASSWORD|DB_PASSWORD=${DB_PASSWORD}|g" /opt/vpn-backend/.env
sed -i "s|JWT_SECRET=REPLACE_WITH_JWT_SECRET|JWT_SECRET=${JWT_SECRET}|g" /opt/vpn-backend/.env
sed -i "s|JWT_REFRESH_SECRET=REPLACE_WITH_JWT_REFRESH_SECRET|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|g" /opt/vpn-backend/.env
sed -i "s|XRAY_PANEL_PASSWORD=REPLACE_WITH_XRAY_PASSWORD|XRAY_PANEL_PASSWORD=${XRAY_PASSWORD}|g" /opt/vpn-backend/.env

# Сохраните credentials
cat > /root/vpn-credentials.txt << EOF
===========================================
VPN Backend Credentials
===========================================
Generated: $(date)
Server IP: $(curl -s ifconfig.me)

Backend API: http://$(curl -s ifconfig.me):3000
API Docs: http://$(curl -s ifconfig.me):3000/api
3X-UI Panel: http://$(curl -s ifconfig.me):2053

Database:
  Host: postgres (internal)
  Port: 5432
  Username: postgres
  Password: ${DB_PASSWORD}
  Database: vpn

JWT Secrets:
  JWT_SECRET: ${JWT_SECRET}
  JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}

3X-UI Panel:
  URL: http://$(curl -s ifconfig.me):2053
  Username: admin
  Password: ${XRAY_PASSWORD}

===========================================
ВАЖНО: Сохраните эти credentials в безопасном месте!
===========================================
EOF

chmod 600 /root/vpn-credentials.txt

# Показать credentials
cat /root/vpn-credentials.txt
```

---

## 🚀 ШАГ 4: Запуск приложения

### 4.1. Создайте Docker network

```bash
cd /opt/vpn-backend

# Создать network
docker network create vpn_network 2>/dev/null || true
```

### 4.2. Запустите полный стек

```bash
# Запустить все сервисы
docker compose up -d

# Проверить статус
docker compose ps
```

### 4.3. Проверьте логи

```bash
# Логи всех сервисов
docker compose logs -f

# Или по отдельности:
docker logs -f vpn_backend
docker logs -f vpn_postgres
docker logs -f vpn_3x_ui
```

### 4.4. Дождитесь запуска всех сервисов

```bash
# Подождите 30-60 секунд, затем проверьте
docker compose ps

# Все сервисы должны быть в состоянии "running" или "healthy"
```

---

## ✅ ШАГ 5: Проверка работоспособности

### 5.1. Проверьте Backend API

```bash
# Проверить что API отвечает
curl http://localhost:3000/api

# Если получили HTML страницу Swagger - всё работает!
```

### 5.2. Проверьте базу данных

```bash
# Проверить PostgreSQL
docker exec vpn_postgres pg_isready -U postgres

# Подключиться к БД
docker exec -it vpn_postgres psql -U postgres -d vpn

# В psql выполните:
\dt  # Показать таблицы
\q   # Выйти
```

### 5.3. Проверьте 3X-UI панель

```bash
# Получить IP сервера
curl ifconfig.me

# Откройте в браузере:
# http://YOUR_SERVER_IP:2053
```

---

## 🔧 ШАГ 6: Настройка 3X-UI

### 6.1. Войдите в 3X-UI панель

1. Откройте `http://YOUR_SERVER_IP:2053`
2. Войдите с credentials:
   - Username: `admin`
   - Password: смотрите в `/root/vpn-credentials.txt`

### 6.2. Создайте VLESS Reality Inbound

1. Перейдите в раздел **"Inbounds"**
2. Нажмите **"Add Inbound"**
3. Заполните параметры:

```
Remark: VPN-Main
Protocol: VLESS
Listen IP: 0.0.0.0
Port: 443
Network: tcp
Security: reality

Reality Settings:
  Dest: github.com:443
  Server Names: github.com
  Private Key: (сгенерируется автоматически)
  Short IDs: (сгенерируется автоматически)
  Fingerprint: chrome

Flow: xtls-rprx-vision
```

4. Нажмите **"Save"**
5. Включите inbound (переключатель справа)

---

## 🧪 ШАГ 7: Тестирование

### 7.1. Создайте тестового пользователя

```bash
# Войдите в контейнер backend
docker exec -it vpn_backend sh

# Или используйте API через curl
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "username": "testuser"
  }'
```

### 7.2. Получите JWT токен

```bash
# Логин
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'

# Сохраните accessToken из ответа
```

### 7.3. Создайте тестовую подписку

```bash
# Замените YOUR_JWT_TOKEN и USER_ID на реальные значения
curl -X POST http://localhost:3000/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": "USER_ID",
    "plan_name": "MONTHLY",
    "price": 999,
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-02-01T00:00:00Z",
    "status": "ACTIVE"
  }'
```

### 7.4. Получите VPN конфигурацию

```bash
# Получить конфиг
curl -X GET "http://localhost:3000/client/config" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Вы должны получить vless:// ссылку
```

---

## 🔒 ШАГ 8: Безопасность (ВАЖНО!)

### 8.1. Измените пароль 3X-UI

1. Войдите в 3X-UI панель
2. Перейдите в **"Panel Settings"**
3. Измените пароль администратора
4. Сохраните новый пароль в безопасном месте

### 8.2. Настройте SSL (опционально, но рекомендуется)

```bash
# Установите Certbot
apt-get install -y certbot

# Получите SSL сертификат (замените на свой домен)
certbot certonly --standalone -d your-domain.com

# Сертификаты будут в /etc/letsencrypt/live/your-domain.com/
```

### 8.3. Ограничьте доступ к 3X-UI панели

```bash
# Разрешить доступ только с вашего IP
ufw delete allow 2053/tcp
ufw allow from YOUR_IP to any port 2053

# Проверить
ufw status
```

---

## 📊 ШАГ 9: Мониторинг

### 9.1. Проверка статуса сервисов

```bash
# Статус всех контейнеров
docker compose -f /opt/vpn-backend/docker-compose.yml ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker compose -f /opt/vpn-backend/docker-compose.yml logs -f
```

### 9.2. Создайте скрипт для мониторинга

```bash
cat > /root/check-vpn-status.sh << 'EOF'
#!/bin/bash
echo "=== VPN Services Status ==="
docker compose -f /opt/vpn-backend/docker-compose.yml ps
echo ""
echo "=== Backend Logs (last 20 lines) ==="
docker logs --tail 20 vpn_backend
echo ""
echo "=== Database Status ==="
docker exec vpn_postgres pg_isready -U postgres
EOF

chmod +x /root/check-vpn-status.sh

# Запустить проверку
/root/check-vpn-status.sh
```

---

## 🔄 ШАГ 10: Обновление приложения (в будущем)

### 10.1. Остановите сервисы

```bash
cd /opt/vpn-backend
docker compose down
```

### 10.2. Обновите код

```bash
# Если используете Git
git pull origin master

# Или загрузите новые файлы через SCP
```

### 10.3. Пересоберите и запустите

```bash
# Пересобрать образы
docker compose build --no-cache

# Запустить
docker compose up -d
```

---

## 🆘 Troubleshooting

### Проблема: Backend не запускается

```bash
# Проверить логи
docker logs vpn_backend

# Проверить подключение к БД
docker exec vpn_backend env | grep DB_

# Перезапустить
docker restart vpn_backend
```

### Проблема: БД не доступна

```bash
# Проверить статус PostgreSQL
docker logs vpn_postgres

# Проверить что volume создан
docker volume ls | grep postgres

# Переподключиться к БД
docker exec -it vpn_postgres psql -U postgres
```

### Проблема: 3X-UI не открывается

```bash
# Проверить логи
docker logs vpn_3x_ui

# Проверить порт
netstat -tulpn | grep 2053

# Перезапустить
docker restart vpn_3x_ui
```

### Проблема: Не генерируются VPN ключи

```bash
# Проверить что 3X-UI доступен из backend
docker exec vpn_backend curl http://3x-ui:2053

# Проверить credentials в .env
cat /opt/vpn-backend/.env | grep XRAY

# Проверить что inbound создан в 3X-UI
# Откройте http://YOUR_IP:2053 -> Inbounds
```

---

## 📋 Чеклист развертывания

- [ ] VPS подготовлен (Ubuntu/Debian)
- [ ] SSH доступ настроен
- [ ] Firewall настроен
- [ ] Старые данные удалены
- [ ] Docker установлен
- [ ] Проект загружен в /opt/vpn-backend
- [ ] .env файл создан с безопасными паролями
- [ ] Credentials сохранены в /root/vpn-credentials.txt
- [ ] Docker контейнеры запущены
- [ ] Backend API отвечает на http://IP:3000/api
- [ ] PostgreSQL работает
- [ ] 3X-UI панель доступна на http://IP:2053
- [ ] VLESS Reality inbound создан в 3X-UI
- [ ] Тестовый пользователь создан
- [ ] Тестовая подписка работает
- [ ] VPN конфигурация генерируется
- [ ] Пароли изменены на безопасные
- [ ] Мониторинг настроен

---

## 🎉 Готово!

Ваш VPN backend успешно развернут!

**Важные URL:**
- Backend API: `http://YOUR_IP:3000`
- API Documentation: `http://YOUR_IP:3000/api`
- 3X-UI Panel: `http://YOUR_IP:2053`

**Credentials:** `/root/vpn-credentials.txt`

**Логи:** `docker compose -f /opt/vpn-backend/docker-compose.yml logs -f`

**Статус:** `docker compose -f /opt/vpn-backend/docker-compose.yml ps`
