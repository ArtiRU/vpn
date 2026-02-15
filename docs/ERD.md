# Entity Relationship Diagram (ERD)

## Визуализация связей

```
users  ───────┬───── subscriptions
  │           ├───── configs
  │           ├───── payments
  │           └───── sessions
              │
servers ───────┼───── configs
              ├───── sessions
              └───── server_metrics
```

## Главные принципы

### 1. **Конфигурация привязана и к пользователю, и к серверу**
- Один пользователь может иметь ключи на разные страны
- Связь: `Config.user_id` → `User.id` и `Config.server_id` → `Server.id`
- Это позволяет гибко управлять доступом к серверам разных локаций

### 2. **Сессия наследует всё через конфиг**
- Сессия получает `user_id` и `server_id` через `Config`
- Связь: `Session.config_id` → `Config.id`
- Дополнительно хранятся прямые ссылки для быстрого доступа
- Это упрощает анализ использования без JOIN-ов

### 3. **Подписка живет отдельно от конфига**
- Подписка контролирует только временной доступ
- Связь: `Subscription.user_id` → `User.id`
- Это позволяет блокировать доступ по дате, не удаляя ключи физически
- При истечении подписки конфигурация остается для возможного возобновления

---

## Детальное описание сущностей

### 👤 **users** (Центральная сущность)
```typescript
{
  id: uuid (PK)
  email: string (unique)
  password: string (encrypted)
  role: enum (USER | ADMIN)
  status: enum (ACTIVE | BLOCKED | DELETED)
  trial_used: boolean
  created_at: timestamp
  last_login: timestamp
}
```

**Связи:**
- `users` **1:N** `subscriptions` - один пользователь может иметь несколько подписок
- `users` **1:N** `configs` - один пользователь может иметь конфигурации для разных серверов
- `users` **1:N** `payments` - история платежей пользователя
- `users` **1:N** `sessions` - активные и завершенные сессии

---

### 🌐 **servers**
```typescript
{
  id: int (PK)
  name: string
  country_code: char(2)
  city: string
  hostname: string
  port: int
  protocol: enum (WIREGUARD | OPENVPN)
  public_key: text
  is_active: boolean
  priority: int
  load: int
  created_at: timestamp
  updated_at: timestamp
}
```

**Связи:**
- `servers` **1:N** `configs` - сервер может обслуживать много конфигураций
- `servers` **1:N** `sessions` - сервер хранит историю подключений
- `servers` **1:N** `server_metrics` - метрики производительности сервера

---

### 🔑 **configs** (Связующая сущность)
```typescript
{
  id: bigint (PK)
  user_id: uuid (FK → users.id)
  server_id: int (FK → servers.id)
  config_body: text (полная конфигурация WireGuard/OpenVPN)
  private_key: text (encrypted)
  allocated_ip: varchar(45)
  created_at: timestamp
  expires_at: timestamp
  last_used: timestamp
}
```

**Особенность:** 
- Двойная привязка: `user_id` + `server_id`
- Позволяет одному пользователю иметь конфиги на разные страны
- Пример: user@example.com может иметь конфиг на DE-Frankfurt и US-NewYork

**Связи:**
- `configs` **N:1** `users` - каждый конфиг принадлежит пользователю
- `configs` **N:1** `servers` - каждый конфиг привязан к серверу
- `configs` **1:N** `sessions` - конфиг может использоваться в нескольких сессиях

---

### 📅 **subscriptions** (Контроль доступа по времени)
```typescript
{
  id: uuid (PK)
  user_id: uuid (FK → users.id)
  plan_name: enum (TRIAL | MONTHLY | YEARLY)
  start_date: timestamp
  end_date: timestamp
  auto_renew: boolean
  status: enum (ACTIVE | EXPIRED | CANCELLED | PAUSED)
  created_at: timestamp
  updated_at: timestamp
}
```

**Философия:**
- НЕ связана напрямую с `configs`
- Контролирует только право доступа, а не сами ключи
- При истечении: `status = EXPIRED`, но конфиги остаются
- При продлении: активируется подписка, старые конфиги снова работают

**Связи:**
- `subscriptions` **N:1** `users` - подписка принадлежит пользователю
- `subscriptions` **1:N** `payments` - подписка может быть оплачена несколько раз

---

### 🔄 **sessions** (Логирование использования)
```typescript
{
  id: bigint (PK)
  user_id: uuid (FK → users.id)
  config_id: bigint (FK → configs.id)
  server_id: int (FK → servers.id)
  client_ip: varchar(45)
  connected_at: timestamp
  disconnected_at: timestamp
  bytes_sent: bigint
  bytes_received: bigint
}
```

**Принцип наследования:**
- `user_id` наследуется через `config.user_id`
- `server_id` наследуется через `config.server_id`
- Хранятся напрямую для производительности запросов

**Связи:**
- `sessions` **N:1** `users` - сессия принадлежит пользователю
- `sessions` **N:1** `configs` - сессия использует конфигурацию
- `sessions` **N:1** `servers` - сессия происходит на сервере

---

### 💳 **payments**
```typescript
{
  id: bigint (PK)
  user_id: uuid (FK → users.id)
  subscription_id: uuid (FK → subscriptions.id, nullable)
  amount: decimal(10,2)
  currency: char(3)
  provider: enum (STRIPE | PAYPAL | CRYPTO)
  transaction_id: string
  status: enum (PENDING | COMPLETED | FAILED | REFUNDED)
  created_at: timestamp
}
```

**Связи:**
- `payments` **N:1** `users` - платеж от пользователя
- `payments` **N:1** `subscriptions` - платеж за подписку (nullable для одноразовых платежей)

---

### 📊 **server_metrics**
```typescript
{
  id: bigint (PK)
  server_id: int (FK → servers.id)
  cpu_usage: float
  mem_usage: float
  active_connections: int
  recorded_at: timestamp
}
```

**Связи:**
- `server_metrics` **N:1** `servers` - метрики для конкретного сервера

---

## Примеры использования

### Сценарий 1: Создание нового пользователя с подпиской
```
1. Создать User
2. Создать Subscription (status: TRIAL)
3. При первом подключении:
   - Выбрать Server по приоритету/нагрузке
   - Создать Config (user_id + server_id)
   - Создать Session (наследует user_id + server_id через config_id)
```

### Сценарий 2: Пользователь хочет подключиться к другой стране
```
1. Проверить активность Subscription
2. Выбрать Server в нужной стране
3. Создать новый Config (тот же user_id, новый server_id)
4. Пользователь теперь имеет 2 конфига для разных локаций
```

### Сценарий 3: Истечение подписки
```
1. Subscription.status → EXPIRED
2. Config НЕ удаляется (остается в БД)
3. При попытке подключения проверяется Subscription.status
4. При продлении: Subscription обновляется, Config снова доступен
```

### Сценарий 4: Анализ использования
```sql
-- Получить все сессии пользователя
SELECT s.* FROM sessions s
WHERE s.user_id = 'user-uuid';

-- Получить использование конкретного конфига
SELECT s.* FROM sessions s
WHERE s.config_id = 123;

-- Загрузка сервера
SELECT COUNT(*) FROM sessions
WHERE server_id = 5 AND disconnected_at IS NULL;
```

---

## Преимущества такой архитектуры

✅ **Гибкость**: Пользователь может иметь конфиги на разные страны  
✅ **Soft Delete**: Истечение подписки не удаляет конфигурацию  
✅ **Производительность**: Денормализация в `sessions` ускоряет запросы  
✅ **Безопасность**: Разделение подписки и конфигурации  
✅ **Масштабируемость**: Легко добавлять новые серверы и локации  

---

## Database Indexes (рекомендации)

```sql
-- users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- configs
CREATE INDEX idx_configs_user_id ON configs(user_id);
CREATE INDEX idx_configs_server_id ON configs(server_id);
CREATE INDEX idx_configs_user_server ON configs(user_id, server_id);

-- sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_config_id ON sessions(config_id);
CREATE INDEX idx_sessions_server_id ON sessions(server_id);
CREATE INDEX idx_sessions_connected_at ON sessions(connected_at);

-- subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);

-- payments
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);

-- server_metrics
CREATE INDEX idx_server_metrics_server_id ON server_metrics(server_id);
CREATE INDEX idx_server_metrics_recorded_at ON server_metrics(recorded_at);
```
