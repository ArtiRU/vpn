# 📚 Навигация по документации VPN Backend

## 🎯 Начните здесь

Вы находитесь в проекте VPN Backend с **VLESS + Reality** протоколом.

---

## 📖 Документация по развертыванию

### 1️⃣ [VPS_DEPLOYMENT_STEP_BY_STEP.md](./VPS_DEPLOYMENT_STEP_BY_STEP.md) ⭐ **НАЧНИТЕ С ЭТОГО**
**Самая подробная инструкция с пошаговым развертыванием**
- ✅ Полная очистка предыдущей БД и Docker контейнеров
- ✅ Подготовка VPS с нуля
- ✅ Установка всех зависимостей
- ✅ Настройка безопасности
- ✅ Создание .env файла
- ✅ Запуск всех сервисов
- ✅ Настройка 3X-UI панели
- ✅ Тестирование API
- ✅ Troubleshooting

**Используйте этот файл для первого развертывания!**

---

### 2️⃣ [QUICK_COMMANDS.md](./QUICK_COMMANDS.md) ⚡
**Быстрая шпаргалка с командами**
- Все команды в одном месте
- Копируй и выполняй
- Идеально для быстрого развертывания
- Полезные команды для мониторинга

**Используйте для быстрого доступа к командам!**

---

### 3️⃣ [DATABASE_MANAGEMENT.md](./DATABASE_MANAGEMENT.md) 🗄️
**Работа с базой данных PostgreSQL**
- Подключение к БД
- SQL запросы для проверки данных
- **Полная очистка БД (важно!)**
- Backup и восстановление
- Мониторинг и статистика
- Административные задачи

**Используйте когда нужно очистить или проверить БД!**

---

## 📘 Общая документация

### 4️⃣ [DEPLOYMENT_GUIDE_RU.md](./DEPLOYMENT_GUIDE_RU.md) 📚
**Полное руководство по проекту (480 строк)**
- Обзор всех изменений
- Автоматизация для пользователей
- Интеграция с мобильными приложениями
- API эндпоинты
- Конфигурация 3X-UI
- Мониторинг и безопасность

---

### 5️⃣ [QUICK_START.md](./QUICK_START.md) 🚀
**Быстрый старт и обзор проекта**
- Обзор изменений
- Структура констант
- Как работает автоматизация
- Новые возможности
- Резюме проекта

---

### 6️⃣ [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) ✅
**Итоговый отчет о выполненных задачах**
- Список всех изменений
- Статистика проекта
- Созданные файлы
- Проверка качества

---

## 🛠️ Скрипты и конфигурация

### [deploy-vps.sh](./deploy-vps.sh)
**Автоматический скрипт развертывания**
```bash
chmod +x deploy-vps.sh
sudo ./deploy-vps.sh
```

### [docker-compose.full.yml](./docker-compose.full.yml)
**Docker Compose для полного стека**
- PostgreSQL
- Backend API
- 3X-UI Panel

---

## 🎯 Рекомендованный порядок действий

### Для первого развертывания:

1. **Прочитайте:** [VPS_DEPLOYMENT_STEP_BY_STEP.md](./VPS_DEPLOYMENT_STEP_BY_STEP.md)
2. **Используйте команды из:** [QUICK_COMMANDS.md](./QUICK_COMMANDS.md)
3. **При работе с БД:** [DATABASE_MANAGEMENT.md](./DATABASE_MANAGEMENT.md)

### Для быстрого повторного развертывания:

1. **Откройте:** [QUICK_COMMANDS.md](./QUICK_COMMANDS.md)
2. **Выполните раздел:** "Полная очистка"
3. **Затем раздел:** "Установка проекта" и далее

### Для понимания проекта:

1. [QUICK_START.md](./QUICK_START.md) - обзор
2. [DEPLOYMENT_GUIDE_RU.md](./DEPLOYMENT_GUIDE_RU.md) - детали
3. [PROJECT_COMPLETE.md](./PROJECT_COMPLETE.md) - итоги

---

## 🚀 Быстрый старт (TL;DR)

### Вариант 1: Автоматический скрипт

```bash
ssh root@YOUR_VPS_IP
cd /opt
git clone YOUR_REPO vpn-backend
cd vpn-backend
chmod +x deploy-vps.sh
sudo ./deploy-vps.sh
```

### Вариант 2: Ручная установка

```bash
# 1. Очистка
docker system prune -a --volumes -f
rm -rf /opt/vpn-backend

# 2. Клонирование
git clone YOUR_REPO /opt/vpn-backend
cd /opt/vpn-backend

# 3. Создание .env (см. QUICK_COMMANDS.md)

# 4. Запуск
docker compose -f docker-compose.full.yml up -d
```

**Подробности в:** [VPS_DEPLOYMENT_STEP_BY_STEP.md](./VPS_DEPLOYMENT_STEP_BY_STEP.md)

---

## 📊 Что изменилось в проекте

### ✅ Основные изменения:

1. **Удален WireGuard** - полный переход на VLESS + Reality
2. **Добавлено поле price** в таблицу subscriptions
3. **Константы** вместо магических значений
4. **Автоматизация** развертывания

### 📦 Созданные файлы:

- `deploy-vps.sh` - автоматическое развертывание
- `docker-compose.full.yml` - полный стек
- `VPS_DEPLOYMENT_STEP_BY_STEP.md` - пошаговая инструкция
- `QUICK_COMMANDS.md` - быстрые команды
- `DATABASE_MANAGEMENT.md` - управление БД
- `src/subscriptions/subscriptions.constants.ts` - константы

---

## 🔗 Полезные ссылки

### После развертывания:

- **Backend API:** `http://YOUR_IP:3000`
- **API Docs (Swagger):** `http://YOUR_IP:3000/api`
- **3X-UI Panel:** `http://YOUR_IP:2053`

### Credentials:

```bash
cat /root/vpn-credentials.txt
```

---

## 🆘 Помощь

### Проблемы с развертыванием?
👉 [VPS_DEPLOYMENT_STEP_BY_STEP.md](./VPS_DEPLOYMENT_STEP_BY_STEP.md) - раздел "Troubleshooting"

### Нужно очистить БД?
👉 [DATABASE_MANAGEMENT.md](./DATABASE_MANAGEMENT.md) - раздел "Полная очистка БД"

### Нужны быстрые команды?
👉 [QUICK_COMMANDS.md](./QUICK_COMMANDS.md)

---

## 📞 Техническая поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose logs -f`
2. Проверьте статус: `docker compose ps`
3. Просмотрите документацию в порядке выше
4. Проверьте credentials: `cat /root/vpn-credentials.txt`

---

## ✨ Статус проекта

- ✅ Код компилируется без ошибок
- ✅ WireGuard удален
- ✅ VLESS + Reality работает
- ✅ Документация готова
- ✅ Скрипты развертывания готовы
- ✅ Docker конфигурация проверена

**Проект готов к production! 🎉**

---

## 📝 Лицензия

UNLICENSED

---

**Последнее обновление:** 2026-02-17  
**Версия:** 2.0.0  
**Статус:** ✅ Production Ready
