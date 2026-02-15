# Документация API VPN-сервиса

## Обзор

Это комплексный бэкенд VPN-сервиса, построенный на NestJS, предоставляющий API для управления пользователями, подписками, VPN-серверами и обработки платежей.

## Базовый URL

```
http://localhost:3000
```

Для продакшена замените на ваш реальный URL API.

## Аутентификация

API использует JWT (JSON Web Token) для аутентификации. Большинство эндпоинтов требуют аутентификацию через Bearer токен в заголовке Authorization.

### Процесс аутентификации

1. **Зарегистрируйтесь** или **войдите** для получения access и refresh токенов
2. Включайте access токен в заголовок `Authorization`: `Bearer <access_token>`
3. Когда access токен истекает (15 минут), используйте refresh токен для получения новой пары

## Эндпоинты API

### Эндпоинты аутентификации

#### Регистрация пользователя
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}

Ответ:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "trial_used": false,
    "created_at": "2024-02-15T10:00:00.000Z"
  }
}
```

#### Вход
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}

Ответ: Аналогичен регистрации
```

#### Обновление токена
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}

Ответ: Новые access_token и refresh_token
```

#### Получение профиля текущего пользователя
```http
GET /auth/me
Authorization: Bearer <access_token>

Ответ: Объект пользователя
```

---

### Клиентские API эндпоинты (для VPN приложений)

Все клиентские эндпоинты требуют аутентификацию.

#### Получить доступные серверы
```http
GET /client/servers
Authorization: Bearer <access_token>

Ответ:
[
  {
    "id": 1,
    "name": "Frankfurt-01",
    "country_code": "DE",
    "city": "Frankfurt",
    "hostname": "vpn.example.com",
    "port": 51820,
    "protocol": "wireguard",
    "load": 45,
    "priority": 10
  }
]
```

#### Получить серверы по стране
```http
GET /client/servers/country/:countryCode
Authorization: Bearer <access_token>

Пример: GET /client/servers/country/DE

Ответ: Массив серверов в указанной стране
```

#### Получить статус подписки
```http
GET /client/subscription/status
Authorization: Bearer <access_token>

Ответ:
{
  "has_active_subscription": true,
  "plan_name": "MONTHLY",
  "start_date": "2024-02-01T00:00:00.000Z",
  "end_date": "2024-03-01T00:00:00.000Z",
  "status": "ACTIVE",
  "auto_renew": true,
  "days_remaining": 15
}
```

#### Получить VPN конфигурацию
```http
GET /client/config?server_id=1
Authorization: Bearer <access_token>

Ответ:
{
  "id": "config-uuid",
  "config_body": "[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\n...",
  "allocated_ip": "10.0.0.2",
  "expires_at": "2025-02-12T18:30:00.000Z",
  "server_name": "Frankfurt-01",
  "server_country": "DE",
  "server_hostname": "vpn.example.com",
  "server_port": 51820
}
```

#### Получить все конфигурации пользователя
```http
GET /client/configs
Authorization: Bearer <access_token>

Ответ: Массив VPN конфигураций
```

---

### Эндпоинты платежей

#### Создать сессию оформления заказа Stripe
```http
POST /payments/checkout/create-session
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "plan": "monthly",
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}

Ответ:
{
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_a1b2c3..."
}
```

#### Webhook Stripe (внутренний)
```http
POST /payments/webhook/stripe
Content-Type: application/json
Stripe-Signature: <signature>

[Данные webhook от Stripe]
```

---

## Ответы с ошибками

Все ошибки следуют этому формату:

```json
{
  "statusCode": 400,
  "timestamp": "2024-02-15T10:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST",
  "message": "Описание ошибки"
}
```

### Распространенные коды статуса

- `200` - Успех
- `201` - Создано
- `400` - Неверный запрос (ошибка валидации)
- `401` - Не авторизован (отсутствует или недействительный токен)
- `403` - Запрещено (нет активной подписки, истекший конфиг и т.д.)
- `404` - Не найдено
- `409` - Конфликт (дублирующийся email и т.д.)
- `429` - Слишком много запросов (превышен лимит)
- `500` - Внутренняя ошибка сервера

---

## Ограничение запросов

API реализует ограничение скорости запросов:
- **100 запросов в минуту** на один IP-адрес
- При превышении лимита вы получите ответ `429 Too Many Requests`

---

## Руководство по интеграции клиентского приложения

### 1. Начальная настройка

1. Пользователь регистрируется или входит в систему
2. Безопасно сохраните `access_token` и `refresh_token`
3. Используйте access токен для всех API запросов

### 2. Проверка статуса подписки

Перед разрешением VPN подключения проверьте статус подписки:

```javascript
const response = await fetch('http://localhost:3000/client/subscription/status', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const status = await response.json();

if (!status.has_active_subscription) {
  // Перенаправить на покупку подписки
}
```

### 3. Получение доступных серверов

Получите список серверов для отображения пользователю:

```javascript
const response = await fetch('http://localhost:3000/client/servers', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const servers = await response.json();
// Отобразите серверы пользователю
```

### 4. Получение VPN конфигурации

Когда пользователь выбирает сервер, получите конфигурацию:

```javascript
const response = await fetch(`http://localhost:3000/client/config?server_id=${serverId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const config = await response.json();
// Используйте config.config_body для настройки VPN подключения
```

### 5. Обработка истечения токена

Когда вы получаете ошибку `401`:

```javascript
// Обновите токен
const response = await fetch('http://localhost:3000/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refresh_token: refreshToken
  })
});

const { access_token, refresh_token } = await response.json();
// Сохраните новые токены и повторите запрос
```

### 6. Покупка подписки

```javascript
// Создать сессию оформления заказа
const response = await fetch('http://localhost:3000/payments/checkout/create-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    plan: 'monthly',
    success_url: 'myapp://payment/success',
    cancel_url: 'myapp://payment/cancel'
  })
});

const { url } = await response.json();
// Откройте URL оформления заказа Stripe в браузере
```

---

## Переменные окружения

```env
# Сервер
PORT=3000
CORS_ORIGIN=*

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=ваш_пароль
DB_DATABASE=vpn
DB_SYNCHRONIZE=true
DB_LOGGING=false

# JWT
JWT_SECRET=ваш-супер-секретный-jwt-ключ-замените-в-продакшене
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=ваш-супер-секретный-refresh-ключ-замените-в-продакшене
JWT_REFRESH_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# URL фронтенда
FRONTEND_URL=http://localhost:3000
```

---

## Документация Swagger

Интерактивная документация API доступна по адресу:

```
http://localhost:3000/api
```

Это предоставляет:
- Полный список эндпоинтов
- Схемы запросов/ответов
- Функциональность "попробовать"
- Тестирование аутентификации

---

## Лучшие практики безопасности

1. **Никогда не храните пароли в открытом виде** - Всегда используйте хеширование
2. **Безопасно храните токены** - Используйте защищенные механизмы хранения в вашем приложении
3. **Проверяйте SSL сертификаты** - Не отключайте проверку SSL
4. **Реализуйте обновление токенов** - Корректно обрабатывайте истекшие токены
5. **Используйте HTTPS в продакшене** - Никогда не отправляйте токены через HTTP
6. **Регулярно меняйте секреты** - Периодически обновляйте JWT секреты

---

## Поддержка

По вопросам или проблемам:
- Проверьте документацию Swagger на `/api`
- Изучите сообщения об ошибках для отладки
- Свяжитесь с командой поддержки

---

## Версия

Текущая версия API: **1.0**

Последнее обновление: Февраль 2026
