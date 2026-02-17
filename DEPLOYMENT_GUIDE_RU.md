# VPN Backend - Руководство по автоматическому развертыванию

## 🚀 Обзор

Данное руководство описывает автоматическое развертывание VPN backend на VPS с использованием VLESS + Reality протокола через 3X-UI панель.

## ✨ Основные изменения

### 1. Полный переход на VLESS + Reality
- ✅ Удалены все модули WireGuard
- ✅ Приложение полностью работает на VLESS + Reality через Xray
- ✅ Более современная обфускация трафика
- ✅ Лучшая защита от DPI (Deep Packet Inspection)

### 2. Добавлено поле цены в подписку
```typescript
// src/subscriptions/entities/subscription.entity.ts
@Column({ type: 'int', default: 0 })
price: number;  // Цена в центах (например, 999 = $9.99)
```

### 3. Использование констант
Все магические константы заменены на именованные константы из файла:
```typescript
// src/subscriptions/subscriptions.constants.ts
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export const SUBSCRIPTION_PLAN = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  TRIAL: 'TRIAL',
} as const;

export const SUBSCRIPTION_PRICES = {
  MONTHLY: 999,   // $9.99
  YEARLY: 9999,   // $99.99
  TRIAL: 0,
} as const;
```

## 📦 Автоматическое развертывание

### Вариант 1: Полностью автоматический скрипт

Скрипт `deploy-vps.sh` автоматически устанавливает и настраивает:
- Docker и Docker Compose
- PostgreSQL базу данных
- NestJS Backend API
- 3X-UI панель для управления Xray

```bash
# На свежем Ubuntu VPS выполните:
git clone <ваш-репозиторий>
cd vpn-backend
chmod +x deploy-vps.sh

# Установите переменные окружения (опционально)
export STRIPE_SECRET_KEY="sk_live_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
export STRIPE_MONTHLY_PRICE_ID="price_..."
export STRIPE_YEARLY_PRICE_ID="price_..."

# Запустите развертывание
sudo ./deploy-vps.sh
```

### Вариант 2: Docker Compose с 3X-UI

Используйте `docker-compose.full.yml` для полного стека:

```bash
# 1. Создайте .env файл
cat > .env << EOF
# Database
DB_PASSWORD=your_secure_password
DB_USERNAME=postgres
DB_DATABASE=vpn

# JWT
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# Xray Panel
XRAY_PANEL_URL=http://3x-ui:2053
XRAY_PANEL_USERNAME=admin
XRAY_PANEL_PASSWORD=your_secure_password

# Stripe (optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
EOF

# 2. Запустите стек
docker-compose -f docker-compose.full.yml up -d

# 3. Проверьте статус
docker-compose -f docker-compose.full.yml ps

# 4. Просмотрите логи
docker-compose -f docker-compose.full.yml logs -f
```

## ⚙️ Конфигурация 3X-UI

После развертывания необходимо настроить 3X-UI:

### 1. Доступ к панели
- URL: `http://YOUR_SERVER_IP:2053`
- Username: `admin`
- Password: указан в логах развертывания или в `/root/vpn-credentials.txt`

### 2. Создание VLESS Reality Inbound

1. Перейдите в раздел "Inbounds"
2. Нажмите "Add Inbound"
3. Настройте параметры:
   - **Protocol**: VLESS
   - **Port**: 443 (или любой другой)
   - **Network**: tcp
   - **Security**: reality
   - **SNI**: github.com (или другой популярный домен)
   - **Flow**: xtls-rprx-vision

4. Сохраните конфигурацию

### 3. Важные настройки Reality

```json
{
  "network": "tcp",
  "security": "reality",
  "realitySettings": {
    "show": false,
    "dest": "github.com:443",
    "xver": 0,
    "serverNames": ["github.com"],
    "privateKey": "AUTO_GENERATED",
    "publicKey": "AUTO_GENERATED",
    "shortIds": ["AUTO_GENERATED"],
    "fingerprint": "chrome"
  }
}
```

## 🔄 Автоматический процесс для пользователей

### Как это работает:

1. **Пользователь оплачивает подписку** в iOS/Android приложении
   ```
   User -> App Store/Google Play -> Backend Webhook
   ```

2. **Backend получает уведомление** о платеже
   ```typescript
   // src/payments/payments.service.ts
   async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session)
   ```

3. **Автоматически создается подписка**
   ```typescript
   // Создается запись в таблице subscriptions
   {
     user_id: "...",
     plan_name: "MONTHLY",
     price: 999,  // $9.99
     status: "ACTIVE",
     start_date: now,
     end_date: now + 30 days
   }
   ```

4. **Генерируется VLESS конфигурация**
   ```typescript
   // src/xray/xray-manager.service.ts
   async createVlessConfig(userId: string)
   ```

5. **Пользователь получает доступ к VPN**
   - API эндпоинт: `GET /client/config`
   - Возвращает готовую vless:// ссылку
   - Приложение автоматически подключается

### API эндпоинты для клиентского приложения

```typescript
// Получить доступные серверы
GET /client/servers
Response: [{ id, name, country_code, city, load, protocol }]

// Получить статус подписки
GET /client/subscription-status
Response: { 
  has_active_subscription: boolean,
  plan_name: "MONTHLY",
  end_date: "2024-03-15",
  days_remaining: 25
}

// Получить VPN конфигурацию
GET /client/config?serverId=1
Response: {
  id: "123",
  config_body: "vless://uuid@server:443?...",
  server_name: "US-NYC-01",
  expires_at: "2024-03-15"
}
```

## 🔐 Безопасность

### Переменные окружения
Все чувствительные данные хранятся в `.env`:
- ✅ JWT секреты генерируются автоматически
- ✅ Пароли БД генерируются случайно
- ✅ Stripe ключи не хардкодятся

### Сохраненные credentials
После развертывания все креды сохраняются в:
```
/root/vpn-credentials.txt (chmod 600)
```

## 📊 Мониторинг

### Просмотр логов
```bash
# Backend
docker logs -f vpn_backend

# Database
docker logs -f vpn_postgres

# 3X-UI
docker logs -f vpn_3x_ui
```

### Проверка здоровья
```bash
# Backend API
curl http://localhost:3000/api

# Database
docker exec vpn_postgres pg_isready

# 3X-UI Panel
curl http://localhost:2053
```

## 🔄 Обновление

```bash
cd /opt/vpn-backend

# Обновить код
git pull

# Пересобрать и перезапустить
docker-compose down
docker-compose build
docker-compose up -d

# Или для полного стека
docker-compose -f docker-compose.full.yml down
docker-compose -f docker-compose.full.yml up -d --build
```

## 🛠 Управление подписками через Stripe

### Webhook для автоматической обработки платежей

Backend автоматически обрабатывает следующие события Stripe:

1. **checkout.session.completed** - Создание новой подписки
2. **customer.subscription.created** - Подтверждение подписки
3. **customer.subscription.updated** - Обновление подписки (напр., переход с месячной на годовую)
4. **customer.subscription.deleted** - Отмена подписки
5. **invoice.payment_succeeded** - Успешное продление
6. **invoice.payment_failed** - Неудачная оплата

### Настройка Stripe Webhook

```bash
# 1. В Stripe Dashboard создайте webhook endpoint:
https://your-backend-domain.com/payments/webhook

# 2. Выберите события:
- checkout.session.completed
- customer.subscription.*
- invoice.payment_succeeded
- invoice.payment_failed

# 3. Скопируйте Webhook Secret в .env:
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📱 Интеграция с мобильными приложениями

### iOS (StoreKit)
```swift
// После успешной покупки отправьте квитанцию на backend
func purchaseCompleted(transaction: SKPaymentTransaction) {
    let receiptData = loadReceipt()
    
    APIClient.verifyReceipt(receiptData) { result in
        // Backend автоматически создаст подписку и VPN config
        // Получите config через GET /client/config
    }
}
```

### Android (Google Play Billing)
```kotlin
// После покупки отправьте purchase token
billingClient.launchBillingFlow(activity, params) { result ->
    if (result.responseCode == BillingClient.BillingResponseCode.OK) {
        APIClient.verifyPurchase(purchaseToken) { 
            // Автоматически получите VPN конфигурацию
        }
    }
}
```

## 🚨 Troubleshooting

### Backend не запускается
```bash
# Проверьте логи
docker logs vpn_backend

# Проверьте подключение к БД
docker exec vpn_backend env | grep DB_

# Пересоздайте контейнер
docker-compose down
docker-compose up -d
```

### 3X-UI недоступен
```bash
# Проверьте статус
docker ps | grep 3x-ui

# Перезапустите
docker restart vpn_3x_ui

# Проверьте порты
netstat -tulpn | grep 2053
```

### Пользователь не может подключиться
1. Проверьте активность подписки в БД
2. Убедитесь, что inbound включен в 3X-UI
3. Проверьте порт 443 открыт в firewall
4. Проверьте expires_at в таблице configs

## 📖 Дополнительная информация

- [3X-UI Documentation](https://github.com/MHSanaei/3x-ui)
- [Xray Documentation](https://xtls.github.io/)
- [VLESS Protocol](https://www.v2fly.org/config/protocols/vless.html)
- [Reality Protocol](https://github.com/XTLS/REALITY)

## 📝 Changelog

### Version 2.0.0 (Current)
- ✅ Полный переход на VLESS + Reality
- ✅ Удален WireGuard модуль
- ✅ Добавлено поле price в подписки
- ✅ Использование констант вместо магических значений
- ✅ Автоматическое развертывание через deploy-vps.sh
- ✅ Интеграция с 3X-UI панелью
- ✅ Docker Compose для полного стека

### Version 1.0.0 (Previous)
- WireGuard protocol support
- Basic subscription management
- Manual server configuration

## 💬 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте конфигурацию: `cat .env`
3. Проверьте доступность сервисов: `docker-compose ps`
4. Просмотрите credentials: `sudo cat /root/vpn-credentials.txt`
