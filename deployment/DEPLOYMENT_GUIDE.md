# 🚀 Полное руководство по развертыванию VPN инфраструктуры

## Обзор

Это пошаговое руководство проведет вас через весь процесс развертывания VPN инфраструктуры от начала до конца.

## Архитектура системы

```
Internet
   │
   ├─── VPN Clients (Mobile/Desktop Apps)
   │         │
   │         ▼
   ├─── NestJS Backend (API Server)
   │         ├─── PostgreSQL Database
   │         └─── Stripe Payment Gateway
   │         │
   │         ▼
   └─── WireGuard VPN Servers (Multiple locations)
             ├─── WireGuard Management API
             └─── WireGuard Server (Port 51820)
```

## Компоненты системы

1. **Backend Server** - NestJS приложение (API, база данных)
2. **WireGuard Servers** - VPN серверы в разных локациях
3. **Monitoring** - Система мониторинга состояния

## Пошаговое развертывание

---

### 📋 Этап 0: Подготовка

#### 0.1 Необходимые аккаунты

- [ ] GitHub/GitLab для кода
- [ ] VPS провайдер (Hetzner, DigitalOcean, Vultr)
- [ ] Stripe аккаунт для платежей
- [ ] Domain name (опционально, для production)

#### 0.2 Локальная разработка

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd vpn

# Установите зависимости
npm install

# Скопируйте .env.example в .env
cp .env.example .env

# Отредактируйте .env файл
nano .env
```

**Минимальная конфигурация `.env`:**
```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=vpn
DB_SYNCHRONIZE=true

JWT_SECRET=<generate-random-64-chars>
JWT_REFRESH_SECRET=<generate-random-64-chars>
```

Генерация секретов:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 🐳 Этап 1: Развертывание Backend (Docker)

#### 1.1 Локальное тестирование

```bash
# Запуск через Docker Compose
docker-compose up -d

# Проверка логов
docker-compose logs -f backend

# Проверка работы
curl http://localhost:3000/api
```

#### 1.2 Развертывание на VPS

**Вариант А: На том же сервере, что и WireGuard**

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установите Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Клонируйте репозиторий
git clone <your-repo-url>
cd vpn

# Настройте .env для продакшена
cp .env.example .env
nano .env

# Важно для продакшена:
# - NODE_ENV=production
# - DB_SYNCHRONIZE=false
# - Сильные пароли и секреты
# - Правильный CORS_ORIGIN

# Запустите
docker-compose up -d

# Проверьте
docker-compose ps
docker-compose logs backend
```

**Вариант Б: Отдельный сервер для Backend**

Если у вас отдельный сервер для backend:
- Повторите шаги выше
- Настройте firewall для доступа к PostgreSQL
- Убедитесь что backend может достучаться до WireGuard серверов

---

### 🛡️ Этап 2: Развертывание WireGuard серверов

#### 2.1 Аренда VPS серверов

**Рекомендации:**
- Минимум: 1 CPU, 1GB RAM, 20GB SSD
- Ubuntu 22.04 LTS
- Разные локации (Европа, США, Азия)

**Примеры конфигураций:**

```
Server 1: Europe (Germany)
- Provider: Hetzner
- Location: Frankfurt
- IP: 1.2.3.4
- Cost: ~€4/month

Server 2: USA (New York)
- Provider: DigitalOcean
- Location: New York
- IP: 5.6.7.8
- Cost: ~$6/month

Server 3: Asia (Singapore)
- Provider: Vultr
- Location: Singapore
- IP: 9.10.11.12
- Cost: ~$6/month
```

#### 2.2 Установка WireGuard (на каждом сервере)

```bash
# 1. Подключитесь к серверу
ssh root@1.2.3.4

# 2. Скачайте скрипт установки
wget https://raw.githubusercontent.com/your-repo/vpn/main/deployment/install-wireguard.sh

# Или скопируйте вручную
nano install-wireguard.sh
# Вставьте содержимое из deployment/install-wireguard.sh

# 3. Сделайте исполняемым
chmod +x install-wireguard.sh

# 4. Запустите
sudo bash install-wireguard.sh

# 5. Сохраните выведенную информацию:
# - Public IP
# - Public Key
# - Port
```

**Повторите для каждого сервера!**

#### 2.3 Установка WireGuard Management API

```bash
# На том же сервере после установки WireGuard

# 1. Скачайте скрипт
wget https://raw.githubusercontent.com/your-repo/vpn/main/deployment/install-wireguard-api.sh

# 2. Сделайте исполняемым
chmod +x install-wireguard-api.sh

# 3. Запустите
sudo bash install-wireguard-api.sh

# 4. ОБЯЗАТЕЛЬНО сохраните:
# - API URL: http://SERVER_IP:8080
# - API Key: abc123xyz...
```

**Повторите для каждого сервера!**

#### 2.4 Проверка работы

На каждом сервере:

```bash
# Проверка WireGuard
wg show
systemctl status wg-quick@wg0

# Проверка API
curl http://localhost:8080/health
systemctl status wireguard-api

# Просмотр логов
journalctl -u wg-quick@wg0 -f
journalctl -u wireguard-api -f
```

---

### 🔗 Этап 3: Добавление серверов в Backend

#### 3.1 Получите JWT токен

```bash
# Зарегистрируйте admin пользователя
curl -X POST http://your-backend-url:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "first_name": "Admin",
    "last_name": "User"
  }'

# Войдите
curl -X POST http://your-backend-url:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'

# Сохраните access_token из ответа
```

#### 3.2 Добавьте серверы в базу данных

Для каждого сервера:

```bash
curl -X POST http://your-backend-url:3000/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Frankfurt-01",
    "country_code": "DE",
    "city": "Frankfurt",
    "hostname": "1.2.3.4",
    "port": 51820,
    "protocol": "wireguard",
    "public_key": "SERVER_PUBLIC_KEY_FROM_INSTALL",
    "is_active": true,
    "priority": 10,
    "load": 0
  }'
```

#### 3.3 Обновите Backend .env

```bash
# На сервере с backend
nano .env

# Добавьте (используйте любой из серверов или создайте отдельный):
WIREGUARD_API_URL=http://1.2.3.4:8080
WIREGUARD_API_KEY=api_key_from_install

# Перезапустите backend
docker-compose restart backend
```

---

### ✅ Этап 4: Тестирование системы

#### 4.1 Проверка API endpoints

```bash
# 1. Получить доступные серверы
curl -X GET http://your-backend-url:3000/client/servers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Проверить статус подписки
curl -X GET http://your-backend-url:3000/client/subscription/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Получить VPN конфигурацию (создастся автоматически!)
curl -X GET http://your-backend-url:3000/client/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4.2 Тестирование WireGuard подключения

```bash
# 1. Сохраните полученную конфигурацию в файл
nano test-client.conf
# Вставьте config_body из ответа API

# 2. Установите WireGuard клиент (если ещё нет)
# Ubuntu/Debian:
sudo apt install wireguard

# macOS:
brew install wireguard-tools

# 3. Запустите туннель
sudo wg-quick up ./test-client.conf

# 4. Проверьте подключение
ping 10.8.0.1
curl ifconfig.me  # Должен показать IP WireGuard сервера

# 5. Отключитесь
sudo wg-quick down ./test-client.conf
```

---

### 📊 Этап 5: Настройка мониторинга

#### 5.1 Установка скрипта мониторинга

```bash
# На вашей локальной машине или сервере мониторинга

# 1. Скачайте скрипт
wget https://raw.githubusercontent.com/your-repo/vpn/main/deployment/monitor-servers.sh
chmod +x monitor-servers.sh

# 2. Создайте config файл
nano monitor-config.env

# Добавьте:
BACKEND_URL=http://your-backend-url:3000
JWT_TOKEN=your_jwt_token
WIREGUARD_API_KEY=your_api_key
ALERT_EMAIL=your-email@example.com  # опционально

# 3. Запустите мониторинг
source monitor-config.env
./monitor-servers.sh
```

#### 5.2 Настройка Cron для автоматического мониторинга

```bash
# Каждые 5 минут
crontab -e

# Добавьте:
*/5 * * * * source /path/to/monitor-config.env && /path/to/monitor-servers.sh >> /var/log/vpn-monitor.log 2>&1
```

---

### 💳 Этап 6: Настройка Stripe платежей

#### 6.1 Создание продуктов в Stripe

1. Зайдите на https://dashboard.stripe.com
2. Перейдите в Products
3. Создайте 2 продукта:
   - VPN Monthly - $9.99/month
   - VPN Yearly - $99.99/year

4. Скопируйте Price IDs

#### 6.2 Обновите .env

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
```

#### 6.3 Настройка Webhook

1. В Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-backend-url/payments/webhook/stripe`
3. Выберите события: `checkout.session.completed`, `customer.subscription.*`
4. Скопируйте Webhook Secret в `.env`

---

### 🔐 Этап 7: Безопасность

#### 7.1 Firewall на Backend сервере

```bash
# UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Backend (временно, потом через nginx)
sudo ufw enable
```

#### 7.2 Firewall на WireGuard серверах

```bash
# Ограничить доступ к Management API
sudo ufw delete allow 8080/tcp
sudo ufw allow from YOUR_BACKEND_IP to any port 8080

# Разрешить только необходимое
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 51820/udp  # WireGuard
```

#### 7.3 SSL сертификаты (Production)

```bash
# Установите nginx и certbot
sudo apt install nginx certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com

# Настройте nginx reverse proxy
sudo nano /etc/nginx/sites-available/vpn-backend

# Конфигурация:
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Активируйте
sudo ln -s /etc/nginx/sites-available/vpn-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 🎯 Этап 8: Финальная проверка

#### Checklist

- [ ] Backend запущен и отвечает на API запросы
- [ ] PostgreSQL база данных работает
- [ ] Все WireGuard серверы активны
- [ ] Management API на всех серверах работает
- [ ] Серверы добавлены в базу данных
- [ ] Автоматическое создание конфигураций работает
- [ ] Можно подключиться через WireGuard
- [ ] Stripe настроен (если используется)
- [ ] Мониторинг работает
- [ ] Firewall настроен
- [ ] SSL сертификаты установлены (для production)
- [ ] Backup настроен

#### Тестовый сценарий end-to-end

```bash
# 1. Регистрация пользователя
curl -X POST https://your-domain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","first_name":"Test","last_name":"User"}'

# 2. Вход
curl -X POST https://your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# 3. Создание подписки (через Stripe или вручную в БД для теста)

# 4. Получение VPN конфигурации
curl -X GET https://your-domain.com/client/config \
  -H "Authorization: Bearer TOKEN"

# 5. Тест подключения с полученной конфигурацией

# 6. Проверка в мониторинге
./monitor-servers.sh
```

---

## 📝 Maintenance

### Регулярные задачи

#### Ежедневно
- Проверка логов мониторинга
- Проверка alerts (если настроены)

#### Еженедельно
- Проверка использования ресурсов серверов
- Review логов ошибок

#### Ежемесячно
- Обновление системы: `apt update && apt upgrade`
- Backup базы данных
- Проверка SSL сертификатов

### Backup

```bash
# Backend database
docker-compose exec postgres pg_dump -U postgres vpn > backup_$(date +%Y%m%d).sql

# WireGuard конфигурации
tar -czf wireguard_backup_$(date +%Y%m%d).tar.gz /etc/wireguard/
```

---

## 🆘 Troubleshooting

См. раздел Troubleshooting в:
- `DOCKER_DEPLOYMENT.md`
- `deployment/WIREGUARD_SETUP.md`
- `deployment/WIREGUARD_INTEGRATION.md`

---

## 🎉 Поздравляем!

Ваша VPN инфраструктура развернута и готова к работе!

### Следующие шаги:

1. **Разработка Frontend** - Создайте клиентские приложения
2. **Маркетинг** - Запустите рекламные кампании
3. **Масштабирование** - Добавьте больше серверов по мере роста
4. **Мониторинг** - Настройте Grafana + Prometheus для детального мониторинга

**Удачи! 🚀**
