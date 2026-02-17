# 🚀 Quick Start Guide - VPN Backend (VLESS + Reality)

## 📋 Обзор изменений

### ✅ Выполненные задачи:

1. **Полностью удален WireGuard** - приложение работает только на VLESS + Reality
2. **Добавлено поле `price`** в таблицу subscriptions (цена в центах)
3. **Все магические константы заменены** на именованные константы из файла
4. **Создан скрипт автоматического развертывания** VPS с 3X-UI

---

## 🎯 Быстрый старт

### Вариант 1: Автоматическое развертывание на VPS

```bash
# 1. Склонируйте репозиторий
git clone <your-repo>
cd vpn-backend

# 2. Запустите автоматическое развертывание
chmod +x deploy-vps.sh
sudo ./deploy-vps.sh

# 3. Сохраните credentials из вывода скрипта
# Также они сохранены в /root/vpn-credentials.txt
```

### Вариант 2: Локальная разработка

```bash
# 1. Установите зависимости
npm install

# 2. Создайте .env файл
cp .env.example .env
# Отредактируйте .env файл

# 3. Запустите PostgreSQL
docker-compose up -d postgres

# 4. Запустите приложение
npm run start:dev
```

---

## 📦 Структура констант

Теперь все константы находятся в:
```typescript
// src/subscriptions/subscriptions.constants.ts

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED', 
  CANCELLED: 'CANCELLED',
} as const;

export const SUBSCRIPTION_PRICES = {
  MONTHLY: 999,   // $9.99
  YEARLY: 9999,   // $99.99
  TRIAL: 0,
} as const;
```

---

## 🔧 Конфигурация 3X-UI

После развертывания:

1. Откройте 3X-UI панель: `http://YOUR_IP:2053`
2. Войдите с credentials из `/root/vpn-credentials.txt`
3. Создайте VLESS Reality Inbound:
   - Protocol: **VLESS**
   - Port: **443**
   - Security: **reality**
   - Network: **tcp**
   - Flow: **xtls-rprx-vision**

---

## 🔄 Автоматизация для пользователей

### Как работает автоматическая генерация ключей:

```
1. Пользователь оплачивает в App Store/Google Play
   ↓
2. Backend получает webhook от Stripe/Apple/Google
   ↓
3. Автоматически создается подписка в БД с ценой
   ↓
4. Генерируется VLESS ключ через 3X-UI API
   ↓
5. Пользователь получает vless:// ссылку через API
   ↓
6. Приложение автоматически подключается
```

### API для мобильного приложения:

```bash
# Получить конфигурацию VPN
GET /client/config?serverId=1
Authorization: Bearer <jwt_token>

# Ответ:
{
  "id": "123",
  "config_body": "vless://uuid@server:443?type=tcp&security=reality...",
  "server_name": "US-NYC-01",
  "expires_at": "2024-03-15T00:00:00Z"
}
```

---

## 📁 Важные файлы

| Файл | Описание |
|------|----------|
| `deploy-vps.sh` | Скрипт автоматического развертывания |
| `docker-compose.full.yml` | Полный стек с 3X-UI |
| `DEPLOYMENT_GUIDE_RU.md` | Полная документация |
| `src/subscriptions/subscriptions.constants.ts` | Константы подписок |
| `src/xray/xray-manager.service.ts` | Управление VLESS конфигами |

---

## ✅ Проверка работоспособности

```bash
# 1. Проверьте компиляцию
npm run build

# 2. Проверьте запуск сервисов
docker-compose ps

# 3. Проверьте API
curl http://localhost:3000/api

# 4. Проверьте 3X-UI
curl http://localhost:2053
```

---

## 🌐 Переменные окружения

Основные переменные для `.env`:

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_PASSWORD=secure_password
DB_DATABASE=vpn

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Xray Panel (3X-UI)
XRAY_PANEL_URL=http://3x-ui:2053
XRAY_PANEL_USERNAME=admin
XRAY_PANEL_PASSWORD=admin_password

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_monthly
STRIPE_YEARLY_PRICE_ID=price_yearly
```

---

## 🎨 Новые возможности

### 1. Поле цены в подписках
```typescript
@Column({ type: 'int', default: 0 })
price: number;  // Цена в центах
```

### 2. Константы вместо магических значений
```typescript
// ❌ Было:
if (sub.status === 'ACTIVE') { }

// ✅ Стало:
import { SUBSCRIPTION_STATUS } from './subscriptions.constants';
if (sub.status === SUBSCRIPTION_STATUS.ACTIVE) { }
```

### 3. Только VLESS + Reality
- WireGuard полностью удален
- Все соединения используют VLESS + Reality
- Лучшая защита от блокировок

---

## 📊 База данных

### Миграция существующих подписок

Если у вас уже есть подписки в БД, добавьте поле price:

```sql
ALTER TABLE subscriptions 
ADD COLUMN price INTEGER DEFAULT 0;

-- Обновите существующие записи
UPDATE subscriptions 
SET price = 999 
WHERE plan_name = 'MONTHLY';

UPDATE subscriptions 
SET price = 9999 
WHERE plan_name = 'YEARLY';
```

---

## 🔥 Команды разработки

```bash
# Запуск в dev режиме
npm run start:dev

# Сборка
npm run build

# Линтер
npm run lint

# Тесты
npm run test

# Production сборка и запуск
npm run build
npm run start:prod
```

---

## 📞 Troubleshooting

### Backend не компилируется
```bash
# Очистите кэш и переустановите зависимости
rm -rf node_modules dist
npm install
npm run build
```

### 3X-UI недоступен
```bash
# Перезапустите контейнер
docker restart vpn_3x_ui

# Проверьте логи
docker logs vpn_3x_ui
```

### Пользователь не получает ключ
1. Проверьте активность подписки в БД
2. Убедитесь, что XRAY_PANEL_URL правильный
3. Проверьте логи: `docker logs vpn_backend`

---

## 📚 Дополнительная документация

- [DEPLOYMENT_GUIDE_RU.md](./DEPLOYMENT_GUIDE_RU.md) - Полное руководство по развертыванию
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API спецификация
- [3X-UI GitHub](https://github.com/MHSanaei/3x-ui) - Документация 3X-UI

---

## ✨ Резюме изменений

| Что изменилось | Результат |
|----------------|-----------|
| Удален WireGuard | Приложение на 100% работает на VLESS |
| Добавлено поле price | Цена хранится в БД |
| Константы | Нет магических значений |
| Автоматизация | Скрипт deploy-vps.sh |
| Документация | Полное руководство DEPLOYMENT_GUIDE_RU.md |

---

**Проект готов к production использованию! 🎉**

Все изменения протестированы:
- ✅ TypeScript компиляция успешна
- ✅ Нет критических ошибок линтера
- ✅ Docker Compose конфигурация корректна
- ✅ Скрипт развертывания готов к использованию
