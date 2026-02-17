# 🔌 API Спецификация для клиентских приложений

## 📋 Базовая информация

**Base URL:** `https://your-domain.com` или `http://206.245.134.32:3000` (dev)

**Авторизация:** JWT Bearer Token в заголовке `Authorization`

**Формат данных:** JSON

---

## 🔑 Аутентификация

### 1. Регистрация

```http
POST /auth/register
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response 201:
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-02-15T10:30:00.000Z"
}

Errors:
400 - Invalid email or password format
409 - Email already exists
```

---

### 2. Вход

```http
POST /auth/login
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response 200:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}

Errors:
401 - Invalid credentials
```

**Важно:** `access_token` истекает через 15 минут, `refresh_token` - через 7 дней.

---

### 3. Обновление токена

```http
POST /auth/refresh
Content-Type: application/json

Body:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response 200:
{
  "access_token": "new_access_token_here"
}

Errors:
401 - Invalid or expired refresh token
```

---

### 4. Выход

```http
POST /auth/logout
Authorization: Bearer <access_token>

Response 200:
{
  "message": "Logged out successfully"
}
```

---

## 🌐 Серверы

### 5. Получить список всех активных серверов

```http
GET /client/servers
Authorization: Bearer <access_token>

Response 200:
[
  {
    "id": 1,
    "name": "Frankfurt-01",
    "country_code": "DE",
    "city": "Frankfurt",
    "hostname": "206.245.134.32",
    "port": 443,
    "protocol": "vless",
    "load": 25,
    "priority": 1
  },
  {
    "id": 2,
    "name": "US-NewYork-01",
    "country_code": "US",
    "city": "New York",
    "hostname": "192.168.1.100",
    "port": 443,
    "protocol": "vless",
    "load": 40,
    "priority": 2
  }
]

Errors:
401 - Unauthorized (invalid or expired token)
```

**Поля:**
- `id` (number) - уникальный идентификатор сервера
- `name` (string) - название сервера
- `country_code` (string) - двухбуквенный код страны (ISO 3166-1 alpha-2)
- `city` (string) - город
- `hostname` (string) - IP адрес или домен
- `port` (number) - порт VPN
- `protocol` (string) - протокол: `vless`, `wireguard`, `vmess`, `openvpn`
- `load` (number) - нагрузка сервера (0-100%)
- `priority` (number) - приоритет (меньше = выше)

---

### 6. Получить серверы по стране

```http
GET /client/servers/country/:countryCode
Authorization: Bearer <access_token>

Example: GET /client/servers/country/DE

Response 200: (аналогично GET /client/servers)

Errors:
401 - Unauthorized
404 - No servers found in this country
```

---

## 📊 Подписка

### 7. Получить статус подписки

```http
GET /client/subscription/status
Authorization: Bearer <access_token>

Response 200:
{
  "has_active_subscription": true,
  "plan_name": "MONTHLY",
  "start_date": "2026-02-01T00:00:00.000Z",
  "end_date": "2026-03-01T00:00:00.000Z",
  "status": "ACTIVE",
  "auto_renew": true,
  "days_remaining": 14
}

Errors:
401 - Unauthorized
```

**Поля:**
- `has_active_subscription` (boolean) - есть ли активная подписка
- `plan_name` (string | null) - название тарифа: `MONTHLY`, `YEARLY`, `TRIAL`
- `start_date` (string | null) - дата начала подписки (ISO 8601)
- `end_date` (string | null) - дата окончания подписки (ISO 8601)
- `status` (string | null) - статус: `ACTIVE`, `EXPIRED`, `CANCELED`
- `auto_renew` (boolean | null) - автоматическое продление
- `days_remaining` (number | null) - дней до окончания подписки

---

## 🔐 VPN Конфигурация

### 8. Получить VPN конфигурацию ⭐ (ОСНОВНОЙ ENDPOINT)

```http
GET /client/config?server_id=1
Authorization: Bearer <access_token>

Query Parameters:
- server_id (optional, number) - ID конкретного сервера

Response 200:
{
  "id": "config-uuid",
  "config_body": "vless://39dd7a41-732d-48c4-bd46-52a8e4b1cd1f@206.245.134.32:443?type=tcp&encryption=none&security=reality&pbk=OYgSZEQ9zyDtjKHTaPMbF6f-pCUGF-ECSpEAvGW58WM&fp=chrome&sni=github.com&sid=6dfa60e8b26b94&spx=%2F#VLESS-Reality-Main",
  "allocated_ip": "xray-1",
  "expires_at": "2027-02-16T00:00:00.000Z",
  "server_name": "Frankfurt-01",
  "server_country": "DE",
  "server_hostname": "206.245.134.32",
  "server_port": 443
}

Errors:
401 - Unauthorized
403 - No active subscription
404 - Configuration not found
500 - Failed to create configuration
```

**Поля:**
- `id` (string) - уникальный ID конфигурации
- `config_body` (string) - **полная VLESS ссылка** для импорта в клиент
- `allocated_ip` (string) - метка конфигурации
- `expires_at` (string) - дата истечения (ISO 8601)
- `server_name` (string) - название сервера
- `server_country` (string) - код страны
- `server_hostname` (string) - IP адрес/домен сервера
- `server_port` (number) - порт VPN

**Как использовать:**
1. Получите `config_body` (это полная `vless://...` ссылка)
2. Передайте её напрямую в Xray-core клиент
3. Для мобильных: импортируйте через QR-код или Share
4. Для десктопа: парсите ссылку и генерируйте JSON конфиг

---

### 9. Получить все конфигурации пользователя

```http
GET /client/configs
Authorization: Bearer <access_token>

Response 200:
[
  {
    "id": "config-uuid-1",
    "config_body": "vless://...",
    "allocated_ip": "xray-1",
    "expires_at": "2027-02-16T00:00:00.000Z",
    "server_name": "Frankfurt-01",
    "server_country": "DE",
    "server_hostname": "206.245.134.32",
    "server_port": 443
  },
  {
    "id": "config-uuid-2",
    "config_body": "vless://...",
    "allocated_ip": "xray-2",
    "expires_at": "2027-02-16T00:00:00.000Z",
    "server_name": "US-NewYork-01",
    "server_country": "US",
    "server_hostname": "192.168.1.100",
    "server_port": 443
  }
]

Errors:
401 - Unauthorized
403 - No active subscription
```

---

## 💳 Оплата (Stripe)

### 10. Создать Checkout сессию

```http
POST /payments/create-checkout-session
Authorization: Bearer <access_token>
Content-Type: application/json

Body:
{
  "plan_name": "MONTHLY"
}

Response 200:
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}

Errors:
401 - Unauthorized
400 - Invalid plan_name
```

**Планы:**
- `MONTHLY` - ежемесячная подписка
- `YEARLY` - годовая подписка

**Workflow:**
1. Клиент вызывает endpoint
2. Получает `url` для Stripe Checkout
3. Открывает `url` в браузере (WebView на мобильных)
4. Пользователь вводит данные карты
5. После оплаты Stripe webhook активирует подписку
6. Пользователь получает доступ к VPN

---

### 11. Webhook (для сервера, НЕ для клиента)

```http
POST /payments/webhook
Content-Type: application/json
Stripe-Signature: <signature>

Body: (Stripe event payload)

Response 200:
{
  "received": true
}
```

**Внимание:** Этот endpoint вызывает Stripe, не клиентское приложение!

---

## 📱 Примеры использования в клиентах

### iOS (Swift)

```swift
// Получение конфига
func getVPNConfig() async throws -> VPNConfig {
    let url = URL(string: "\(baseURL)/client/config")!
    var request = URLRequest(url: url)
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode(VPNConfig.self, from: data)
}

// Подключение к VPN
func connectToVPN(config: VPNConfig) {
    // config.config_body содержит полную vless:// ссылку
    let vlessURL = config.config_body
    
    // Передайте в Xray-core клиент (FoXray SDK)
    XrayManager.shared.connect(vlessURL: vlessURL)
}
```

---

### Android (Kotlin)

```kotlin
// Retrofit интерфейс
interface VPNApiService {
    @GET("client/config")
    suspend fun getVPNConfig(
        @Header("Authorization") token: String,
        @Query("server_id") serverId: Int? = null
    ): VPNConfig
}

// ViewModel
class VPNViewModel @Inject constructor(
    private val apiService: VPNApiService
) : ViewModel() {
    
    suspend fun connectToVPN(serverId: Int?) {
        try {
            val config = apiService.getVPNConfig("Bearer $token", serverId)
            
            // config.configBody содержит полную vless:// ссылку
            VPNService.start(config.configBody)
        } catch (e: Exception) {
            // Обработка ошибок
        }
    }
}
```

---

### JavaScript/TypeScript (Electron)

```typescript
// API клиент
async function getVPNConfig(serverId?: number): Promise<VPNConfig> {
    const url = serverId 
        ? `${API_BASE_URL}/client/config?server_id=${serverId}`
        : `${API_BASE_URL}/client/config`;
    
    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    
    return response.data;
}

// Подключение
async function connectToVPN(serverId?: number) {
    const config = await getVPNConfig(serverId);
    
    // config.config_body содержит полную vless:// ссылку
    const vlessURL = config.config_body;
    
    // Запускаем Xray-core с конфигурацией
    xrayManager.connect(vlessURL);
}
```

---

## 🔒 Безопасность

### Хранение токенов

**НЕ ДЕЛАЙТЕ:**
- ❌ Хранение токенов в `localStorage` (Web)
- ❌ Хранение в plain text файлах
- ❌ Логирование токенов в консоль

**ДЕЛАЙТЕ:**
- ✅ iOS: Keychain
- ✅ Android: EncryptedSharedPreferences
- ✅ Desktop: electron-store с encryption
- ✅ Web: httpOnly cookies (если есть)

---

### SSL Pinning (рекомендуется)

Защита от MITM атак:

```swift
// iOS
let serverTrustPolicy = ServerTrustPolicy.pinCertificates(
    certificates: ServerTrustPolicy.certificates(),
    validateCertificateChain: true,
    validateHost: true
)
```

```kotlin
// Android
val certificatePinner = CertificatePinner.Builder()
    .add("your-domain.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    .build()

val okHttpClient = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build()
```

---

## 🚨 Обработка ошибок

### Стандартные HTTP коды

| Код | Описание | Действие клиента |
|-----|----------|------------------|
| 200 | Успешно | Обработать данные |
| 201 | Создано | Успешная регистрация |
| 400 | Неверный запрос | Проверить формат данных |
| 401 | Не авторизован | Перелогиниться |
| 403 | Нет доступа | Проверить подписку |
| 404 | Не найдено | Ресурс не существует |
| 409 | Конфликт | Email уже существует |
| 429 | Слишком много запросов | Rate limit, подождать |
| 500 | Ошибка сервера | Повторить позже |

---

### Формат ошибок

```json
{
  "statusCode": 401,
  "timestamp": "2026-02-15T10:30:00.000Z",
  "path": "/client/config",
  "method": "GET",
  "message": "Unauthorized"
}
```

---

## 📈 Rate Limiting

**Лимиты:**
- 100 запросов в минуту на IP
- При превышении: HTTP 429 + заголовок `Retry-After`

**Рекомендации:**
- Кэшируйте список серверов локально
- Обновляйте токен только при истечении
- Используйте debounce для частых запросов

---

## 🔄 Автоматическое обновление токена

Пример middleware для перехвата 401 и refresh:

```typescript
// JavaScript/TypeScript
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            // Токен истек, обновляем
            const newToken = await refreshAccessToken();
            
            // Повторяем оригинальный запрос
            error.config.headers['Authorization'] = `Bearer ${newToken}`;
            return axios.request(error.config);
        }
        
        return Promise.reject(error);
    }
);
```

---

## 📊 Swagger документация

Интерактивная документация доступна по адресу:

```
http://206.245.134.32:3000/api
```

Там вы можете:
- Тестировать все endpoints
- Видеть полные схемы данных
- Генерировать примеры запросов

---

## ✅ Чеклист интеграции

- [ ] Реализована авторизация (login/register)
- [ ] Токены хранятся безопасно
- [ ] Реализовано автоматическое обновление токена
- [ ] Получение списка серверов работает
- [ ] Получение VPN конфига работает
- [ ] VLESS ссылка успешно импортируется в VPN клиент
- [ ] Обработка всех ошибок реализована
- [ ] Rate limiting учтён
- [ ] SSL Pinning настроен (рекомендуется)

---

## 🆘 Troubleshooting

### Проблема: 401 Unauthorized
**Решение:**
1. Проверьте формат токена: `Bearer <token>`
2. Убедитесь что токен не истёк (15 минут для access_token)
3. Обновите токен через `/auth/refresh`

---

### Проблема: 403 No active subscription
**Решение:**
1. Проверьте статус подписки: `GET /client/subscription/status`
2. Убедитесь что `has_active_subscription: true`
3. При необходимости оплатите подписку

---

### Проблема: 500 Failed to create VPN configuration
**Решение:**
1. Проверьте что 3X-UI панель доступна
2. Убедитесь что сервер активен (`is_active: true`)
3. Проверьте логи backend: `docker logs vpn-backend-1`

---

## 📞 Контакты

При возникновении вопросов:
1. Swagger документация: `http://your-api/api`
2. Backend логи: `docker logs vpn-backend-1`
3. 3X-UI панель: `https://206.245.134.32:2053/K6qSHGEjTQ3uwIUSlZ`

---

**Готово!** 🚀 Используйте эту спецификацию для интеграции вашего API с клиентскими приложениями.
