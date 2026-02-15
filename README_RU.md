# VPN-сервис Backend

Комплексный бэкенд на базе NestJS для управления VPN-сервисом с аутентификацией пользователей, управлением подписками, обработкой платежей и управлением VPN-серверами.

## Возможности

- 🔐 **JWT Аутентификация** - Безопасная аутентификация пользователей с access и refresh токенами
- 👥 **Управление пользователями** - Регистрация, вход, управление профилем
- 💳 **Интеграция платежей** - Интеграция Stripe для подписок
- 📱 **Клиентский API** - Специальные эндпоинты для VPN клиентских приложений
- 🌐 **Управление серверами** - Управление VPN-серверами с балансировкой нагрузки
- 📊 **Система подписок** - Месячные/годовые тарифные планы
- 🔒 **Безопасность** - Ограничение запросов, валидация ввода, обработка ошибок
- 📝 **Документация API** - Документация Swagger/OpenAPI
- 🗄️ **База данных** - PostgreSQL с TypeORM

## Технологический стек

- **Фреймворк**: NestJS 11
- **База данных**: PostgreSQL + TypeORM
- **Аутентификация**: Passport JWT
- **Платежи**: Stripe
- **Валидация**: class-validator, class-transformer
- **Документация**: Swagger/OpenAPI
- **Безопасность**: Throttler (ограничение запросов)

## Требования

- Node.js (v18 или выше)
- PostgreSQL (v14 или выше)
- npm или yarn

## Установка

1. Клонируйте репозиторий:
```bash
git clone <url-репозитория>
cd vpn
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env`:
```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env`:
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
STRIPE_SECRET_KEY=sk_test_ваш_ключ
STRIPE_WEBHOOK_SECRET=whsec_ваш_секрет
STRIPE_MONTHLY_PRICE_ID=price_месячный
STRIPE_YEARLY_PRICE_ID=price_годовой

# URL фронтенда
FRONTEND_URL=http://localhost:3000
```

5. Настройте базу данных PostgreSQL:
```bash
createdb vpn
```

## Запуск приложения

### Разработка
```bash
npm run start:dev
```

### Продакшен
```bash
npm run build
npm run start:prod
```

### Тестирование
```bash
# Модульные тесты
npm run test

# E2E тесты
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

## Документация API

После запуска приложения доступно:

- **Swagger UI**: http://localhost:3000/api
- **Полная документация API**: См. [API_DOCUMENTATION_RU.md](./API_DOCUMENTATION_RU.md)

## Структура проекта

```
src/
├── auth/                 # Модуль аутентификации (JWT, стратегии, guards)
├── users/                # Управление пользователями
├── subscriptions/        # Управление подписками
├── servers/              # Управление VPN-серверами
├── configs/              # Управление VPN конфигурациями
├── sessions/             # Отслеживание активных VPN сессий
├── payments/             # Обработка платежей (Stripe)
├── client/               # Клиентские API эндпоинты
├── server-metrics/       # Метрики и мониторинг серверов
├── common/               # Общие утилиты
│   ├── decorators/       # Кастомные декораторы
│   ├── dto/              # Общие DTO
│   ├── filters/          # Фильтры исключений
│   ├── guards/           # Кастомные guards
│   ├── interceptors/     # Перехватчики (логирование, трансформация)
│   ├── pipes/            # Кастомные pipes
│   └── validators/       # Кастомные валидаторы
└── config/               # Конфигурация приложения
```

## Ключевые эндпоинты

### Аутентификация
- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/login` - Вход пользователя
- `POST /auth/refresh` - Обновление access токена
- `GET /auth/me` - Получение профиля текущего пользователя

### Клиентский API (для VPN приложений)
- `GET /client/servers` - Получить доступные VPN серверы
- `GET /client/servers/country/:code` - Получить серверы по стране
- `GET /client/subscription/status` - Проверить статус подписки
- `GET /client/config?server_id=1` - Получить VPN конфигурацию
- `GET /client/configs` - Получить все конфигурации пользователя

### Платежи
- `POST /payments/checkout/create-session` - Создать оформление заказа Stripe
- `POST /payments/webhook/stripe` - Обработчик webhook Stripe

## Схема базы данных

Приложение использует следующие основные сущности:

- **Users** - Учетные записи пользователей
- **Subscriptions** - Записи подписок пользователей
- **Servers** - VPN серверы
- **Configs** - VPN конфигурации для каждого пользователя/сервера
- **Sessions** - Активные VPN сессии
- **Payments** - Платежные транзакции
- **ServerMetrics** - Метрики производительности серверов

## Функции безопасности

- **JWT Аутентификация** - Безопасная токен-based аутентификация
- **Хеширование паролей** - bcrypt для безопасности паролей
- **Ограничение запросов** - 100 запросов/минута на IP
- **Валидация ввода** - Комплексная валидация всех входных данных
- **CORS** - Настраиваемая политика CORS
- **Обработка ошибок** - Глобальный фильтр исключений
- **Логирование** - Логирование запросов/ответов

## Разработка

### Стиль кода
```bash
npm run format
npm run lint
```

### Сборка
```bash
npm run build
```

## Развертывание

### Использование Docker (рекомендуется)

1. Создайте `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

2. Создайте `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=vpn
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=ваш_пароль
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

3. Запустите:
```bash
docker-compose up -d
```

### Конфигурации для разных сред

- Разработка: Используйте файл `.env`
- Продакшен: Устанавливайте переменные окружения безопасно
- Никогда не коммитьте файл `.env` в систему контроля версий

## Мониторинг

Приложение включает:
- Логирование HTTP запросов
- Логирование ошибок со stack trace
- Метрики производительности (время ответа)

## Дорожная карта

- [ ] Поддержка WebSocket для статуса подключения в реальном времени
- [ ] Двухфакторная аутентификация (2FA)
- [ ] Административная панель
- [ ] Аналитика использования
- [ ] Поддержка нескольких протоколов (OpenVPN, IKEv2)
- [ ] Автоматизированное развертывание серверов
- [ ] Мониторинг трафика и лимиты

## Участие в разработке

1. Форкните репозиторий
2. Создайте ветку с новой функцией
3. Закоммитьте ваши изменения
4. Отправьте в ветку
5. Создайте Pull Request

## Лицензия

UNLICENSED

## Поддержка

По вопросам поддержки обращайтесь к команде разработки.

---

**Создано с ❤️ используя NestJS**
