# 🚀 Руководство по развертыванию Docker

## Быстрый старт

### 1. Подготовка окружения

```bash
# Скопируйте пример конфигурации
cp .env.example .env

# Отредактируйте .env и заполните реальными значениями
# Минимум нужно изменить:
# - DB_PASSWORD
# - JWT_SECRET
# - JWT_REFRESH_SECRET
```

### 2. Генерация безопасных секретных ключей

```bash
# Для JWT_SECRET (выполните в Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Для JWT_REFRESH_SECRET (выполните еще раз)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Запуск приложения

```bash
# Сборка и запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f backend
```

### 4. Проверка работоспособности

Откройте в браузере:
- **API Documentation (Swagger)**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api

## Управление контейнерами

```bash
# Остановка всех сервисов
docker-compose down

# Остановка с удалением volumes (ВНИМАНИЕ: удалит все данные!)
docker-compose down -v

# Перезапуск только backend
docker-compose restart backend

# Пересборка образа (после изменения кода)
docker-compose up -d --build backend

# Просмотр логов конкретного сервиса
docker-compose logs -f postgres

# Выполнение команд внутри контейнера
docker-compose exec backend sh
```

## Структура Docker

```
vpn/
├── Dockerfile              # Образ NestJS приложения
├── docker-compose.yml      # Оркестрация сервисов
├── .dockerignore          # Исключения при сборке
└── .env                   # Переменные окружения (не коммитить!)
```

## Описание сервисов

### 🐘 PostgreSQL (`postgres`)
- **Порт**: 5432
- **Данные**: Сохраняются в volume `postgres_data`
- **Backup**: Директория `./backups` (создайте при необходимости)

### 🚀 Backend (`backend`)
- **Порт**: 3000
- **Зависит от**: postgres
- **Health check**: Каждые 30 секунд

### 🔧 pgAdmin (опционально)
Раскомментируйте секцию в `docker-compose.yml` для веб-интерфейса БД:
- **Порт**: 5050
- **URL**: http://localhost:5050

## Продакшен deployment

### На VPS сервере

```bash
# 1. Установите Docker и Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 2. Клонируйте репозиторий
git clone <your-repo-url>
cd vpn

# 3. Настройте .env для продакшена
cp .env.example .env
nano .env  # Измените NODE_ENV=production, DB_SYNCHRONIZE=false

# 4. Запустите
docker-compose up -d

# 5. Настройте автозапуск
sudo systemctl enable docker
```

### Обновление приложения

```bash
# 1. Получите последние изменения
git pull

# 2. Пересоберите и перезапустите
docker-compose up -d --build

# 3. (Опционально) Выполните миграции
docker-compose exec backend npm run migration:run
```

## Backup базы данных

```bash
# Создание backup
docker-compose exec postgres pg_dump -U postgres vpn > ./backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из backup
docker-compose exec -T postgres psql -U postgres vpn < ./backups/backup_20260215_120000.sql
```

## Мониторинг

```bash
# Использование ресурсов
docker stats

# Логи в реальном времени
docker-compose logs -f

# Проверка health check
docker-compose ps
```

## Troubleshooting

### Backend не запускается
```bash
# Проверьте логи
docker-compose logs backend

# Убедитесь что PostgreSQL запустился
docker-compose logs postgres

# Проверьте health check
docker-compose exec postgres pg_isready -U postgres
```

### Ошибка подключения к БД
```bash
# Проверьте, что в .env правильные параметры
# DB_HOST должен быть 'postgres' (имя сервиса)
# Не 'localhost'!

# Перезапустите сервисы
docker-compose restart
```

### Очистка и пересоздание

```bash
# ВНИМАНИЕ: Удалит все данные!
docker-compose down -v
docker-compose up -d
```

## Безопасность в продакшене

1. **Используйте сильные пароли** во всех переменных окружения
2. **Отключите DB_SYNCHRONIZE** и используйте миграции
3. **Настройте CORS_ORIGIN** на конкретный домен
4. **Используйте HTTPS** через reverse proxy (nginx)
5. **Регулярно делайте backup** базы данных
6. **Ограничьте доступ** к портам через firewall

## Следующие шаги

После успешного запуска backend:
1. ✅ Backend работает на http://localhost:3000
2. 📝 Следующий шаг: Настройка WireGuard серверов
3. 🔗 Затем: Интеграция WireGuard Management API
