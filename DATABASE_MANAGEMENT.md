# 🗄️ Работа с базой данных PostgreSQL

## 📊 Подключение к базе данных

### Вариант 1: Из контейнера (самый простой)

```bash
# Подключиться к PostgreSQL
docker exec -it vpn_postgres psql -U postgres -d vpn

# Теперь вы в psql консоли
```

### Вариант 2: С хоста VPS

```bash
# Если нужно подключиться с хоста
docker exec -it vpn_postgres psql -U postgres -d vpn -c "SELECT version();"
```

## 🔍 Полезные SQL команды

### Просмотр структуры БД

```sql
-- Показать все таблицы
\dt

-- Показать структуру таблицы
\d subscriptions
\d users
\d configs

-- Показать все базы данных
\l

-- Выйти
\q
```

### Проверка данных

```sql
-- Показать всех пользователей
SELECT id, username, email, role, created_at FROM users;

-- Показать все подписки
SELECT id, plan_name, price, status, start_date, end_date FROM subscriptions;

-- Показать активные подписки
SELECT 
    u.username, 
    s.plan_name, 
    s.price/100.0 as price_usd,
    s.status, 
    s.end_date 
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'ACTIVE';

-- Показать все VPN конфиги
SELECT 
    c.id,
    u.username,
    s.name as server_name,
    c.allocated_ip,
    c.expires_at
FROM configs c
JOIN users u ON c.user_id = u.id
JOIN servers s ON c.server_id = s.id;

-- Показать серверы
SELECT id, name, country_code, protocol, is_active, load FROM servers;
```

## 🧹 Полная очистка БД (ОСТОРОЖНО!)

### Удалить все данные из таблиц

```bash
# Подключиться к БД
docker exec -it vpn_postgres psql -U postgres -d vpn

# В psql выполнить:
```

```sql
-- ВНИМАНИЕ: Это удалит ВСЕ данные!

-- Удалить все конфиги (зависимые данные)
TRUNCATE TABLE configs CASCADE;

-- Удалить все сессии
TRUNCATE TABLE sessions CASCADE;

-- Удалить все метрики серверов
TRUNCATE TABLE server_metrics CASCADE;

-- Удалить все платежи
TRUNCATE TABLE payments CASCADE;

-- Удалить все подписки
TRUNCATE TABLE subscriptions CASCADE;

-- Удалить всех пользователей
TRUNCATE TABLE users CASCADE;

-- Удалить все серверы
TRUNCATE TABLE servers CASCADE;

-- Проверить что всё пусто
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'configs', COUNT(*) FROM configs
UNION ALL
SELECT 'servers', COUNT(*) FROM servers;

-- Выйти
\q
```

### Альтернатива: Пересоздать БД полностью

```bash
# Остановить backend (он использует БД)
docker stop vpn_backend

# Подключиться к PostgreSQL как superuser
docker exec -it vpn_postgres psql -U postgres

# В psql:
```

```sql
-- Отключить всех пользователей от БД
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'vpn'
  AND pid <> pg_backend_pid();

-- Удалить БД
DROP DATABASE IF EXISTS vpn;

-- Создать заново
CREATE DATABASE vpn;

-- Выйти
\q
```

```bash
# Запустить backend (он пересоздаст таблицы)
docker start vpn_backend

# Проверить логи
docker logs -f vpn_backend
```

## 🔄 Backup и Restore

### Создать backup

```bash
# Создать директорию для backup
mkdir -p /opt/backups

# Создать backup
docker exec vpn_postgres pg_dump -U postgres vpn > /opt/backups/vpn_backup_$(date +%Y%m%d_%H%M%S).sql

# Список backup'ов
ls -lh /opt/backups/
```

### Восстановить из backup

```bash
# Остановить backend
docker stop vpn_backend

# Восстановить БД
cat /opt/backups/vpn_backup_20240101_120000.sql | docker exec -i vpn_postgres psql -U postgres vpn

# Запустить backend
docker start vpn_backend
```

## 📊 Мониторинг БД

### Размер базы данных

```sql
-- Размер БД
SELECT pg_size_pretty(pg_database_size('vpn')) as database_size;

-- Размер каждой таблицы
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Активные подключения

```sql
-- Показать активные подключения
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query
FROM pg_stat_activity
WHERE datname = 'vpn';
```

### Статистика таблиц

```sql
-- Количество записей в каждой таблице
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserted,
    n_tup_upd as updated,
    n_tup_del as deleted
FROM pg_stat_user_tables
WHERE schemaname = 'public';
```

## 🛠️ Административные задачи

### Создать нового администратора

```sql
-- Вставить нового admin пользователя (пароль будет хеширован приложением)
INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin',
    'admin@example.com',
    '$2b$10$...',  -- Нужно хешировать через приложение
    'ADMIN',
    NOW(),
    NOW()
);
```

### Изменить цену подписки

```sql
-- Обновить цену для конкретной подписки
UPDATE subscriptions 
SET price = 1999  -- $19.99
WHERE id = 'subscription_id_here';

-- Обновить все месячные подписки
UPDATE subscriptions 
SET price = 999
WHERE plan_name = 'MONTHLY';
```

### Продлить подписку

```sql
-- Продлить подписку на 30 дней
UPDATE subscriptions 
SET end_date = end_date + INTERVAL '30 days'
WHERE id = 'subscription_id_here';

-- Активировать истекшую подписку
UPDATE subscriptions 
SET 
    status = 'ACTIVE',
    end_date = NOW() + INTERVAL '30 days'
WHERE id = 'subscription_id_here';
```

## 🔍 Полезные запросы для отладки

### Найти пользователя и его подписки

```sql
-- По email
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    COUNT(s.id) as subscriptions_count
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.username, u.email, u.role;

-- Детали подписок пользователя
SELECT 
    s.id,
    s.plan_name,
    s.price/100.0 as price_usd,
    s.status,
    s.start_date,
    s.end_date,
    CASE 
        WHEN s.end_date > NOW() THEN 'Active'
        ELSE 'Expired'
    END as is_valid
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE u.email = 'user@example.com';
```

### Найти пользователей без активной подписки

```sql
SELECT 
    u.id,
    u.username,
    u.email,
    u.created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 
    FROM subscriptions s 
    WHERE s.user_id = u.id 
    AND s.status = 'ACTIVE'
    AND s.end_date > NOW()
);
```

### Статистика по подпискам

```sql
-- Общая статистика
SELECT 
    plan_name,
    status,
    COUNT(*) as count,
    SUM(price)/100.0 as total_revenue_usd,
    AVG(price)/100.0 as avg_price_usd
FROM subscriptions
GROUP BY plan_name, status
ORDER BY plan_name, status;

-- Выручка за последние 30 дней
SELECT 
    DATE(created_at) as date,
    COUNT(*) as subscriptions,
    SUM(price)/100.0 as revenue_usd
FROM subscriptions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🚀 Быстрые команды для проверки

```bash
# Количество пользователей
docker exec vpn_postgres psql -U postgres -d vpn -c "SELECT COUNT(*) FROM users;"

# Количество активных подписок
docker exec vpn_postgres psql -U postgres -d vpn -c "SELECT COUNT(*) FROM subscriptions WHERE status='ACTIVE';"

# Количество VPN конфигов
docker exec vpn_postgres psql -U postgres -d vpn -c "SELECT COUNT(*) FROM configs;"

# Последние 5 пользователей
docker exec vpn_postgres psql -U postgres -d vpn -c "SELECT username, email, created_at FROM users ORDER BY created_at DESC LIMIT 5;"
```

## 📝 Экспорт данных

```bash
# Экспорт только структуры (без данных)
docker exec vpn_postgres pg_dump -U postgres -s vpn > /opt/backups/schema.sql

# Экспорт только данных
docker exec vpn_postgres pg_dump -U postgres -a vpn > /opt/backups/data.sql

# Экспорт конкретной таблицы
docker exec vpn_postgres pg_dump -U postgres -t subscriptions vpn > /opt/backups/subscriptions.sql
```

---

**Полезный совет:** Всегда делайте backup перед очисткой БД!

```bash
# Создать backup перед очисткой
docker exec vpn_postgres pg_dump -U postgres vpn > /opt/backups/before_cleanup_$(date +%Y%m%d).sql
```
