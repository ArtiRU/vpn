# 🚀 VPN Backend с VLESS + Reality + ЮКасса

Современный VPN backend на NestJS с поддержкой:
- 🔐 VLESS + Reality протокол через 3X-UI
- 💳 ЮКасса (YooKassa) для приема платежей
- 🔄 Автоматическое управление подписками
- 📱 REST API для клиентских приложений

---

## 📋 Требования

- **VPS:** Ubuntu 20.04/22.04 или Debian 11/12
- **RAM:** Минимум 2GB
- **Доступ:** Root доступ по SSH
- **Git:** Для загрузки кода

---

## ⚡ Быстрая Установка (5 минут)

### 1. Подключитесь к VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2. Установите Docker

```bash
# Обновите систему
apt-get update && apt-get upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Проверьте установку
docker --version
docker compose version
```

### 3. Загрузите проект

```bash
# Создайте директорию
mkdir -p /opt/vpn-backend
cd /opt/vpn-backend

# Клонируйте репозиторий (замените на свой)
git clone https://github.com/YOUR_USERNAME/vpn-backend.git .

# Или загрузите через scp с локальной машины:
# scp -r c:\Users\artur\WebstormProjects\vpn/* root@YOUR_VPS_IP:/opt/vpn-backend/
```

### 4. Создайте .env файл

```bash
# Сгенерируйте безопасные пароли
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
JWT_SECRET=$(openssl rand -base64 64 | tr -d '/+=')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '/+=')
XRAY_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=')

# Создайте .env файл
cat > /opt/vpn-backend/.env << EOF
# Node Environment
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=${DB_PASSWORD}
DB_DATABASE=vpn
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRES_IN=7d

# YooKassa Payment Configuration (заполните свои ключи)
# Получите данные в личном кабинете: https://yookassa.ru/my
YOOKASSA_SHOP_ID=your_shop_id_here
YOOKASSA_SECRET_KEY=your_secret_key_here
YOOKASSA_MONTHLY_PRICE=500
YOOKASSA_YEARLY_PRICE=5000
YOOKASSA_CURRENCY=RUB

# Frontend URL
FRONTEND_URL=http://YOUR_DOMAIN.com

# Xray Panel (3X-UI)
XRAY_PANEL_URL=http://3x-ui:2053
XRAY_PANEL_USERNAME=admin
XRAY_PANEL_PASSWORD=${XRAY_PASSWORD}
EOF

# Сохраните пароли
cat > /root/vpn-credentials.txt << EOF
===========================================
VPN Backend Credentials
===========================================
Database Password: ${DB_PASSWORD}
JWT Secret: ${JWT_SECRET}
JWT Refresh Secret: ${JWT_REFRESH_SECRET}
3X-UI Password: ${XRAY_PASSWORD}

Backend API: http://$(curl -s ifconfig.me):3000
3X-UI Panel: http://$(curl -s ifconfig.me):2053
===========================================
EOF

chmod 600 /root/vpn-credentials.txt
cat /root/vpn-credentials.txt
```

### 5. Запустите все сервисы

```bash
cd /opt/vpn-backend

# Запустите Docker Compose
docker compose up -d

# Проверьте статус
docker compose ps

# Смотрите логи
docker compose logs -f
```

Подождите 30-60 секунд, пока все сервисы запустятся.

---

## 🔧 Настройка 3X-UI (VLESS Reality)

### 1. Откройте 3X-UI панель

```
http://YOUR_VPS_IP:2053
```

**Логин:**
- Username: `admin`
- Password: смотрите в `/root/vpn-credentials.txt`

### 2. Создайте VLESS Reality Inbound

1. Перейдите в **"Inbounds"**
2. Нажмите **"Add Inbound"**
3. Заполните:

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
  Private Key: (нажмите Generate)
  Short IDs: (нажмите Generate)
  Fingerprint: chrome

Flow: xtls-rprx-vision
```

4. Нажмите **"Save"**
5. Включите inbound (переключатель справа)

---

## 💾 Создайте сервер в базе данных

```bash
# Получите IP вашего VPS
VPS_IP=$(curl -s ifconfig.me)

# Создайте VLESS сервер
docker exec -it vpn_postgres psql -U postgres -d vpn << EOF
INSERT INTO servers (
  name,
  country_code,
  city,
  hostname,
  port,
  protocol,
  public_key,
  is_active,
  priority,
  load
) VALUES (
  'VPS-Main',
  'US',
  'New York',
  '${VPS_IP}',
  443,
  'vless',
  'github.com:443',
  true,
  10,
  0
)
RETURNING id, name, hostname, protocol;
EOF
```

---

## 🧪 Тестирование

### 1. Проверьте что все работает

```bash
# Backend API
curl http://localhost:3000/api

# 3X-UI
curl -I http://localhost:2053

# PostgreSQL
docker exec vpn_postgres pg_isready -U postgres
```

### 2. Создайте тестового пользователя

```bash
curl -X POST "http://localhost:3000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "username": "testuser"
  }'
```

**Сохраните `accessToken` из ответа!**

### 3. Создайте подписку

```bash
# Замените USER_ID на ID из предыдущего ответа
# Замените ACCESS_TOKEN на токен
USER_ID="uuid-пользователя"
ACCESS_TOKEN="токен"

# Рассчитайте даты
START_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
END_DATE=$(date -u -d "+30 days" +"%Y-%m-%dT%H:%M:%S.000Z")

# Создайте подписку
curl -X POST "http://localhost:3000/subscriptions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{
    \"user_id\": \"${USER_ID}\",
    \"plan_name\": \"MONTHLY\",
    \"start_date\": \"${START_DATE}\",
    \"end_date\": \"${END_DATE}\",
    \"status\": \"ACTIVE\",
    \"auto_renew\": true
  }"
```

### 4. Получите VLESS конфигурацию! 🎉

```bash
curl -X GET "http://localhost:3000/client/config?server_id=1" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

**Ответ будет содержать строку подключения:**
```json
{
  "id": "1",
  "config_body": "vless://uuid@YOUR_IP:443?type=tcp&security=reality&pbk=xxx&fp=chrome&sni=github.com&sid=xxx#VPS-Main",
  "server_name": "VPS-Main",
  "server_hostname": "YOUR_IP",
  "server_port": 443,
  "expires_at": "2026-03-20T..."
}
```

Поле `config_body` - это и есть **строка подключения для VPN клиента**!

---

## 📱 Подключение к VPN

### Используйте полученную строку в клиентах:

**Windows:**
- v2rayN
- NekoRay

**macOS:**
- V2Box
- ClashX

**iOS:**
- Shadowrocket
- V2Box

**Android:**
- v2rayNG
- NekoBox

**Просто вставьте `vless://...` строку в клиент!**

---

## 🔒 Настройка Firewall

```bash
# Разрешите необходимые порты
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # VLESS
ufw allow 2053/tcp  # 3X-UI
ufw allow 3000/tcp  # Backend API
ufw --force enable

# Проверьте
ufw status
```

---

## 🔄 Полная цепочка для фронтенда

### 1. Регистрация пользователя

```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "Password123!",
  "username": "username"
}

Ответ: { "accessToken": "...", "user": {...} }
```

### 2. Создание YooKassa Payment Session

```bash
POST /payments/checkout/create-session
Authorization: Bearer <accessToken>
{
  "plan": "monthly",
  "return_url": "https://yoursite.com/payment/success"
}

Ответ: { "url": "https://yoomoney.ru/checkout/...", "sessionId": "..." }
```

### 3. Пользователь оплачивает

YooKassa автоматически вызывает webhook `POST /payments/webhook/yookassa` и создаёт подписку.

### 4. Получение VPN строки

```bash
GET /client/config?server_id=1
Authorization: Bearer <accessToken>

Ответ: { "config_body": "vless://..." }
```

**Показываете `config_body` пользователю - это его VPN ключ!**

```javascript
// Пример на JavaScript
const response = await fetch('/client/config?server_id=1', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { config_body } = await response.json();
// config_body = "vless://uuid@host:443?..."
// Показываете эту строку пользователю
```

---

## 🛠️ Управление

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Только backend
docker compose logs -f backend

# Только 3X-UI
docker compose logs -f 3x-ui
```

### Перезапуск сервисов

```bash
# Перезапустить всё
docker compose restart

# Только backend
docker compose restart backend
```

### Обновление кода

```bash
cd /opt/vpn-backend
git pull origin master
docker compose build --no-cache backend
docker compose up -d backend
```

### Очистка базы данных

```bash
# Очистить все данные кроме серверов
docker exec -it vpn_postgres psql -U postgres -d vpn -c "
DELETE FROM sessions;
DELETE FROM configs;
DELETE FROM payments;
DELETE FROM subscriptions;
DELETE FROM users;
"
```

---

## 🐛 Решение проблем

### Backend не запускается

```bash
# Проверьте логи
docker compose logs backend

# Проверьте .env файл
cat /opt/vpn-backend/.env

# Пересоздайте контейнер
docker compose down
docker compose up -d
```

### 3X-UI не открывается

```bash
# Проверьте статус
docker compose ps | grep 3x-ui

# Проверьте порт
netstat -tulpn | grep 2053

# Перезапустите
docker compose restart 3x-ui
```

### "No VLESS Reality inbound configured"

**Решение:** Создайте inbound в 3X-UI (см. раздел "Настройка 3X-UI")

### "No VLESS Reality inbound configured"

**Решение:** Создайте inbound в 3X-UI (см. раздел "Настройка 3X-UI")

### Не могу зайти в панель 3X-UI / "Invalid username or password or two-factor code"

**Сброс панели 3X-UI с нуля (пароль забыт или не совпадает с .env):**

1. **Остановить контейнеры и удалить данные 3X-UI** (на сервере):

```bash
cd /opt/vpn-backend
docker compose down
docker volume rm vpn_3x_ui_data
docker compose up -d
```

После этого панель будет с **логином по умолчанию: admin / admin**.

2. **Сделать пароль панели таким же, как в .env:**

- Вариант А: в .env задать `XRAY_PANEL_USERNAME=admin` и `XRAY_PANEL_PASSWORD=admin`, зайти в панель и сменить пароль в настройках на свой, затем обновить .env и перезапустить backend.
- Вариант Б: сгенерировать bcrypt-хеш нового пароля и прописать его в БД панели (см. [3x-ui reset password](https://3x-ui.com/complete-guide-to-resetting-password-in-3x-ui-system/)).

3. **Создать VLESS Reality inbound** в панели (см. "Настройка 3X-UI"). Обязательно укажите **Listen IP: 0.0.0.0** (или оставьте пустым), иначе в Docker будет ошибка `bind: cannot assign requested address`.

4. **Если inbound уже есть, но Xray не стартует** (ошибка с 206.x.x.x:443 или :28108):

- Убедитесь, что в .env указаны те же логин/пароль, что и в панели.
- Вызовите ручку бэкенда, которая выставит listen=0.0.0.0 у всех inbounds, затем перезапустите контейнер 3x-ui:

```bash
# Проверка доступа к панели и списка inbounds
curl http://localhost:3000/xray/panel/status

# Исправить listen для всех inbounds (логин в панель из .env)
curl -X POST http://localhost:3000/xray/panel/fix-listen

# На сервере перезапустить 3x-ui
docker restart vpn_3x_ui
```

После этого проверьте логи: `docker logs vpn_3x_ui --tail 20`.

### "Server not found"

**Решение:** Создайте сервер в БД (см. раздел "Создайте сервер в базе данных")

### "Unauthorized" в Swagger

**Решение:**
1. Создайте новый токен через `/auth/login`
2. В Swagger нажмите "Authorize"
3. Вставьте **ТОЛЬКО токен** (без слова "Bearer")

---

## 📊 Полезные команды

```bash
# Статус всех контейнеров
docker compose ps

# Использование ресурсов
docker stats

# Проверка серверов в БД
docker exec -it vpn_postgres psql -U postgres -d vpn -c "SELECT * FROM servers;"

# Проверка пользователей
docker exec -it vpn_postgres psql -U postgres -d vpn -c "SELECT id, email, role FROM users;"

# Проверка подписок
docker exec -it vpn_postgres psql -U postgres -d vpn -c "SELECT * FROM subscriptions;"

# Остановить всё
docker compose down

# Запустить всё
docker compose up -d
```

---

## 🎯 API Endpoints

### Публичные (без авторизации)
- `POST /auth/register` - Регистрация
- `POST /auth/login` - Вход
- `POST /payments/webhook/yookassa` - YooKassa webhook
- `GET /xray/panel/status` - Проверка доступа к панели 3X-UI и списка inbounds
- `POST /xray/panel/fix-listen` - Выставить listen=0.0.0.0 у всех inbounds (для Docker)

### Защищенные (требуют Bearer Token)
- `GET /auth/me` - Текущий пользователь
- `GET /client/servers` - Список серверов
- `GET /client/subscription/status` - Статус подписки
- `GET /client/config?server_id=1` - **VPN строка подключения**
- `GET /client/configs` - Все конфигурации
- `POST /payments/checkout/create-session` - Создать Stripe оплату

**Swagger документация:** `http://YOUR_VPS_IP:3000/api`

---

## 📊 Структура проекта

```
src/
├── auth/           # JWT авторизация
├── users/          # Пользователи
├── subscriptions/  # Подписки
├── payments/       # YooKassa интеграция
├── servers/        # VPN серверы
├── configs/        # VPN конфигурации
├── xray/           # 3X-UI интеграция
└── client/         # API для клиентов
```

---

## 🏗️ Архитектура

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend  │─────>│  Backend API │─────>│ PostgreSQL   │
│  (React)    │      │  (NestJS)    │      │              │
└─────────────┘      └──────────────┘      └──────────────┘
                            │
                            │
                            ▼
                     ┌──────────────┐
                     │   3X-UI      │
                     │  (VLESS)     │
                     └──────────────┘
```

---

## 🛠️ Разработка

```bash
# Установка зависимостей
npm install

# Запуск в dev режиме
npm run start:dev

# Сборка
npm run build

# Запуск production
npm run start:prod
```

---

## ✅ Итоговый чеклист

- [ ] Docker установлен
- [ ] Проект загружен в `/opt/vpn-backend`
- [ ] `.env` файл создан
- [ ] Контейнеры запущены (`docker compose ps`)
- [ ] 3X-UI доступен на порту 2053
- [ ] VLESS Reality inbound создан
- [ ] Сервер создан в БД
- [ ] Тестовый пользователь создан
- [ ] Тестовая подписка работает
- [ ] VPN строка получена успешно

---

## 🎉 Готово!

Теперь ваш VPN backend полностью настроен и работает!

**Что дальше:**
1. Настройте свой frontend для интеграции с API
2. Настройте YooKassa для реальных платежей (см. раздел ниже)
3. Добавьте домен и SSL сертификат
4. Масштабируйте - добавьте больше серверов в разных странах

---

## 💳 Настройка ЮКассы (YooKassa)

### Шаг 1: Регистрация в ЮКассе

1. Перейдите на https://yookassa.ru/ и зарегистрируйтесь
2. Пройдите верификацию (понадобятся документы компании или ИП)
3. Подключите нужные способы оплаты (карты, СБП, ЮMoney и др.)

### Шаг 2: Получение API ключей

1. Войдите в личный кабинет ЮКассы
2. Перейдите в **Настройки** → **Протокол API**
3. Создайте новый ключ или используйте существующий
4. Скопируйте:
   - **Shop ID** (идентификатор магазина)
   - **Secret Key** (секретный ключ)

⚠️ **Важно:** Не передавайте секретный ключ третьим лицам!

### Шаг 3: Настройка Webhook

1. В личном кабинете ЮКассы: **Настройки** → **Уведомления**
2. Включите HTTP-уведомления
3. Укажите URL: `https://your-domain.com/payments/webhook/yookassa`
4. Сохраните настройки

### Шаг 4: Обновите .env файл

```bash
# На сервере обновите .env
cat >> /opt/vpn-backend/.env << EOF

# ЮКасса
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_Ab1Cd2Ef3Gh4...
YOOKASSA_MONTHLY_PRICE=500
YOOKASSA_YEARLY_PRICE=5000
YOOKASSA_CURRENCY=RUB
EOF

# Перезапустите backend
docker compose restart backend
```

### Тестовая среда

Для тестирования используйте переключатель в личном кабинете:
- Переключитесь в **режим тестирования**
- Используйте тестовые ключи
- Тестовые карты для оплаты:

**Успешная оплата:**
```
Номер: 5555 5555 5555 4477
Срок: 12/28
CVV: 123
3-D Secure: 12345
```

**Отклоненная оплата:**
```
Номер: 5555 5555 5555 4444
```

### API для работы с платежами

#### Создание платежной сессии
```bash
POST /payments/checkout/create-session
Authorization: Bearer <JWT_TOKEN>

{
  "plan": "monthly",  # или "yearly"
  "return_url": "https://your-site.com/payment/success"
}

# Ответ:
{
  "url": "https://yoomoney.ru/checkout/payments/v2/contract?orderId=...",
  "sessionId": "2d07ec3e-0006-5000-8000-1a60e1b52db6"
}
```

#### Проверка статуса платежа
```bash
GET /payments/status/:paymentId
Authorization: Bearer <JWT_TOKEN>
```

#### Webhook от ЮКассы
```bash
POST /payments/webhook/yookassa
# Автоматически вызывается ЮКассой при изменении статуса платежа
```

### Флоу оплаты

1. **Клиент** создает платежную сессию через API
2. **Backend** создает платеж в ЮКассе и возвращает URL
3. **Клиент** открывает URL и оплачивает
4. **ЮКасса** отправляет webhook на ваш сервер
5. **Backend** автоматически создает/продлевает подписку
6. **Клиент** получает доступ к VPN конфигурации

### Пример интеграции (React)

```typescript
async function handlePayment(plan: 'monthly' | 'yearly') {
  try {
    const response = await fetch('/payments/checkout/create-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan,
        return_url: `${window.location.origin}/payment/success`
      })
    });
    
    const { url } = await response.json();
    window.location.href = url; // Перенаправить на оплату
  } catch (error) {
    console.error('Ошибка создания платежа:', error);
  }
}
```

### Важные особенности ЮКассы

1. **Разовые платежи**: ЮКасса не имеет встроенных подписок как Stripe
2. **Продление**: При новом платеже система автоматически продлевает активную подписку
3. **Webhook без подписи**: Рекомендуется проверять IP адреса ЮКассы
4. **Локальные способы оплаты**: СБП, ЮMoney, Сбербанк Онлайн и др.
5. **Комиссия**: От 2.8% (ниже чем у Stripe)

### Поддержка ЮКассы

- **Документация:** https://yookassa.ru/developers
- **Личный кабинет:** https://yookassa.ru/my
- **Поддержка:** https://yookassa.ru/my/support
- **Телефон:** 8 800 250-66-99

---
- Логи: `docker compose logs -f`
- База данных: `docker exec -it vpn_postgres psql -U postgres -d vpn`
- 3X-UI панель: `http://YOUR_VPS_IP:2053`
- API документация: `http://YOUR_VPS_IP:3000/api`

---

## 🛡️ Production Deploy & SSL

### Настройка домена и SSL

```bash
# Установите Nginx
apt-get install nginx certbot python3-certbot-nginx -y

# Создайте конфиг Nginx
cat > /etc/nginx/sites-available/vpn-api << 'EOF'
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Включите конфиг
ln -s /etc/nginx/sites-available/vpn-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Получите SSL сертификат
certbot --nginx -d api.your-domain.com

# Автообновление сертификата
certbot renew --dry-run
```

### Обновите .env для production

```bash
# Обновите переменные
sed -i 's|CORS_ORIGIN=\*|CORS_ORIGIN=https://your-frontend-domain.com|g' /opt/vpn-backend/.env
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://your-frontend-domain.com|g' /opt/vpn-backend/.env

# Перезапустите
docker compose restart backend
```

### Настройка автозапуска

```bash
# Docker Compose уже настроен на автозапуск
# Проверьте статус
systemctl status docker

# Включите автозапуск Docker
systemctl enable docker
```

---

## 📝 Лицензия

MIT
