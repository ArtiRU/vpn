# 🔗 Руководство по интеграции WireGuard с Backend

## Обзор архитектуры

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  VPN Client     │────────▶│  NestJS Backend  │────────▶│  WireGuard API  │
│  (Mobile/Web)   │         │  (Port 3000)     │         │  (Port 8080)    │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │                             │
                                    │                             │
                                    ▼                             ▼
                            ┌──────────────────┐         ┌─────────────────┐
                            │                  │         │                 │
                            │   PostgreSQL     │         │   WireGuard     │
                            │   Database       │         │   Server        │
                            │                  │         │   (Port 51820)  │
                            └──────────────────┘         └─────────────────┘
```

## Что было создано

### 1. WireGuard Module (`src/wireguard/`)

#### `wireguard.service.ts`
Базовый сервис для взаимодействия с WireGuard Management API:
- ✅ Создание клиентских конфигураций
- ✅ Удаление клиентов (peers)
- ✅ Получение статуса сервера
- ✅ Проверка активности peers
- ✅ Мониторинг трафика

#### `wireguard-manager.service.ts`
Высокоуровневый сервис для автоматизации:
- ✅ Автоматический выбор оптимального сервера
- ✅ Создание конфигураций "на лету"
- ✅ Обновление нагрузки серверов
- ✅ Health checks серверов
- ✅ Управление жизненным циклом конфигураций

### 2. Интеграция с существующими модулями

#### Обновлен `ConfigsService`:
- Автоматическое удаление peers из WireGuard при удалении конфигурации

#### Обновлен `ClientService`:
- Автоматическое создание конфигураций для пользователей
- Поддержка выбора сервера по стране
- Интеллектуальный выбор оптимального сервера

## Установка и настройка

### Шаг 1: Установка зависимостей

```bash
npm install axios
```

✅ **Уже выполнено!**

### Шаг 2: Настройка переменных окружения

Добавьте в ваш `.env` файл:

```env
# WireGuard Management API
WIREGUARD_API_URL=http://your-wireguard-server-ip:8080
WIREGUARD_API_KEY=your-api-key-from-installation
```

**Где взять эти данные?**
- После установки WireGuard Management API (скрипт `install-wireguard-api.sh`)
- API Key выводится в конце установки

### Шаг 3: Проверка работы

```bash
# Запустите backend в dev режиме
npm run start:dev

# Backend должен успешно запуститься без ошибок
```

## Использование API

### 1. Автоматическое получение конфигурации

**Клиент запрашивает конфигурацию:**

```bash
# GET /client/config
# Автоматически выберет оптимальный сервер и создаст конфигурацию

curl -X GET http://localhost:3000/client/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Ответ:**
```json
{
  "id": "123",
  "config_body": "[Interface]\nPrivateKey = ...\n[Peer]\nPublicKey = ...",
  "allocated_ip": "10.8.0.2",
  "expires_at": "2027-02-15T00:00:00.000Z",
  "server_name": "Frankfurt-01",
  "server_country": "DE",
  "server_hostname": "123.45.67.89",
  "server_port": 51820
}
```

### 2. Выбор конфигурации по стране

```bash
# GET /client/config?country=DE
curl -X GET "http://localhost:3000/client/config?country=DE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Выбор конкретного сервера

```bash
# GET /client/config?server_id=1
curl -X GET "http://localhost:3000/client/config?server_id=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Получить все конфигурации пользователя

```bash
# GET /client/configs
curl -X GET http://localhost:3000/client/configs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Как это работает

### Процесс создания конфигурации:

1. **Пользователь запрашивает конфигурацию**
   - Через endpoint `/client/config`
   
2. **Backend проверяет подписку**
   - Есть ли активная подписка?
   - Не истекла ли она?

3. **Выбор сервера**
   - Если указана страна → ищет в этой стране
   - Если указан server_id → использует его
   - Иначе → выбирает оптимальный (минимальная нагрузка + приоритет)

4. **Проверка существующей конфигурации**
   - Есть ли уже конфигурация для этого сервера?
   - Если да и не истекла → возвращает её
   - Если нет → создает новую

5. **Создание через WireGuard API**
   - Отправляет запрос на WireGuard Management API
   - API генерирует ключи
   - API добавляет peer в WireGuard
   - API возвращает готовую конфигурацию

6. **Сохранение в базу данных**
   - Сохраняет конфигурацию
   - Шифрует приватный ключ
   - Устанавливает дату истечения (= дата окончания подписки)

7. **Возврат клиенту**
   - Клиент получает готовую WireGuard конфигурацию
   - Можно сразу использовать в приложении

## Автоматизация

### Обновление нагрузки серверов (Cron job)

Создайте файл `src/tasks/tasks.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WireguardManagerService } from '../wireguard/wireguard-manager.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly wireguardManager: WireguardManagerService,
  ) {}

  // Каждые 5 минут
  @Cron('*/5 * * * *')
  async updateServersLoad() {
    this.logger.log('Updating servers load...');
    await this.wireguardManager.updateAllServersLoad();
  }

  // Каждые 10 минут
  @Cron('*/10 * * * *')
  async checkServersHealth() {
    this.logger.log('Checking servers health...');
    const results = await this.wireguardManager.checkServersHealth();
    
    const unhealthy = results.filter(r => !r.isHealthy);
    if (unhealthy.length > 0) {
      this.logger.warn(`Unhealthy servers: ${unhealthy.map(s => s.name).join(', ')}`);
    }
  }
}
```

Установите зависимость:
```bash
npm install @nestjs/schedule
```

Добавьте в `app.module.ts`:
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... остальные модули
  ],
})
```

## Мониторинг и отладка

### Логи

Backend логирует все важные операции:

```bash
# Просмотр логов
npm run start:dev

# Что логируется:
# - Создание конфигураций
# - Удаление peers
# - Ошибки подключения к WireGuard API
# - Обновление нагрузки серверов
# - Health checks
```

### Проверка статуса через API

Создайте admin endpoint для проверки:

```typescript
// admin.controller.ts
@Get('admin/wireguard/status/:serverId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async getWireguardStatus(@Param('serverId') serverId: number) {
  const server = await this.serversService.findOne(serverId);
  const serverUrl = this.wireguardService.createServerApiUrl(
    server.hostname,
    8080,
  );
  return await this.wireguardService.getStatus(serverUrl);
}
```

## Troubleshooting

### Ошибка: "WireGuard API credentials not configured"

**Проблема:** Не настроены переменные окружения.

**Решение:**
```bash
# Проверьте .env файл
cat .env | grep WIREGUARD

# Должно быть:
WIREGUARD_API_URL=http://...
WIREGUARD_API_KEY=...
```

### Ошибка: "Failed to communicate with WireGuard server"

**Проблема:** Backend не может подключиться к WireGuard API.

**Проверка:**
```bash
# 1. Проверьте доступность API
curl http://your-server-ip:8080/health

# 2. Проверьте firewall
ufw status

# 3. Проверьте что API запущен
ssh root@your-server
systemctl status wireguard-api
```

### Конфигурации не создаются

**Проблема:** Ошибки при создании конфигураций.

**Отладка:**
```bash
# 1. Проверьте логи backend
npm run start:dev

# 2. Проверьте логи WireGuard API на сервере
journalctl -u wireguard-api -f

# 3. Проверьте WireGuard сервер
wg show
```

## Безопасность

### 🔒 Важные меры безопасности:

1. **Защита API ключа**
   ```bash
   # Никогда не коммитьте .env в git!
   echo ".env" >> .gitignore
   ```

2. **Ограничение доступа к WireGuard API**
   ```bash
   # На WireGuard сервере:
   ufw delete allow 8080/tcp
   ufw allow from YOUR_BACKEND_IP to any port 8080
   ```

3. **HTTPS для Production**
   - Используйте nginx reverse proxy
   - Настройте SSL сертификаты (Let's Encrypt)

4. **Шифрование приватных ключей**
   - Текущая реализация использует base64 (пример)
   - В продакшене используйте AES-256 или подобное

## Следующие шаги

✅ **Завершено:**
1. Docker конфигурация
2. WireGuard установка и Management API
3. Интеграция с backend
4. Автоматическое создание конфигураций

📝 **Осталось:**
1. Развернуть реальные VPS серверы
2. Настроить мониторинг (Grafana + Prometheus)
3. Создать frontend приложение
4. Тестирование end-to-end

Переходите к файлу `DEPLOYMENT_GUIDE.md` для полного руководства по развертыванию.
