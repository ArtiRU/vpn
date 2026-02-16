# 🛠️ Руководство по развертыванию WireGuard серверов

## Предварительные требования

### VPS сервер:
- Ubuntu 20.04 или 22.04 LTS
- Минимум 1 CPU, 1 GB RAM
- Root доступ или sudo
- Публичный IP адрес

### Рекомендуемые провайдеры:
- **DigitalOcean** - $6/месяц
- **Hetzner Cloud** - €4.15/месяц (отличное соотношение цена/качество)
- **Vultr** - $6/месяц
- **Linode** - $5/месяц

## Шаг 1: Подготовка VPS сервера

### 1.1 Подключение к серверу

```bash
ssh root@your_server_ip
```

### 1.2 Базовая настройка безопасности (рекомендуется)

```bash
# Обновление системы
apt update && apt upgrade -y

# Настройка hostname (например: vpn-de-01)
hostnamectl set-hostname vpn-de-01

# Создание пользователя (опционально)
adduser vpnadmin
usermod -aG sudo vpnadmin
```

## Шаг 2: Установка WireGuard

### 2.1 Загрузка скрипта

```bash
# Скачайте скрипт установки
wget https://your-repo/deployment/install-wireguard.sh

# Или скопируйте вручную
nano install-wireguard.sh
# Вставьте содержимое скрипта
```

### 2.2 Запуск установки

```bash
# Сделайте скрипт исполняемым
chmod +x install-wireguard.sh

# Запустите установку
sudo bash install-wireguard.sh
```

### 2.3 Проверка установки

После завершения установки вы увидите:
```
✅ WireGuard установлен и настроен!
==========================================
Публичный IP: 123.45.67.89
WireGuard порт: 51820
Публичный ключ сервера: abc123xyz...
```

**ВАЖНО:** Сохраните публичный ключ сервера - он понадобится для базы данных!

### 2.4 Проверка работы WireGuard

```bash
# Статус сервиса
systemctl status wg-quick@wg0

# Информация об интерфейсе
wg show

# Просмотр логов
journalctl -u wg-quick@wg0 -f
```

## Шаг 3: Установка Management API

### 3.1 Загрузка скрипта

```bash
# Скачайте скрипт
wget https://your-repo/deployment/install-wireguard-api.sh

# Сделайте исполняемым
chmod +x install-wireguard-api.sh
```

### 3.2 Запуск установки

```bash
sudo bash install-wireguard-api.sh
```

### 3.3 Сохранение учетных данных

После установки вы получите:
```
API URL: http://123.45.67.89:8080
API Key: 1234567890abcdef...
```

**КРИТИЧЕСКИ ВАЖНО:** Сохраните API Key в безопасном месте!

### 3.4 Проверка работы API

```bash
# Test health endpoint
curl http://123.45.67.89:8080/health

# Test с авторизацией
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://123.45.67.89:8080/api/server/info
```

## Шаг 4: Добавление сервера в базу данных

### 4.1 Подключитесь к вашему backend

Используйте Swagger UI (http://localhost:3000/api) или curl.

### 4.2 Авторизуйтесь

```bash
# Получите JWT токен
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

### 4.3 Добавьте сервер

```bash
curl -X POST http://localhost:3000/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Frankfurt-01",
    "country_code": "DE",
    "city": "Frankfurt",
    "hostname": "123.45.67.89",
    "port": 51820,
    "protocol": "wireguard",
    "public_key": "YOUR_SERVER_PUBLIC_KEY",
    "is_active": true,
    "priority": 10
  }'
```

## Шаг 5: Настройка множественных серверов

Повторите шаги 1-4 для каждого сервера в разных локациях.

### Рекомендуемая схема:

```
1. Европа (Германия) - vpn-de-01
   - Hetzner Frankfurt
   - IP: 1.2.3.4
   
2. США (Нью-Йорк) - vpn-us-01
   - DigitalOcean New York
   - IP: 5.6.7.8
   
3. Азия (Сингапур) - vpn-sg-01
   - Vultr Singapore
   - IP: 9.10.11.12
```

## Управление серверами

### Мониторинг WireGuard

```bash
# Статус интерфейса
wg show

# Активные подключения
wg show wg0 peers

# Трафик по клиентам
wg show wg0 transfer
```

### Управление сервисом

```bash
# Перезапуск WireGuard
systemctl restart wg-quick@wg0

# Перезапуск API
systemctl restart wireguard-api

# Просмотр логов
journalctl -u wg-quick@wg0 -f
journalctl -u wireguard-api -f
```

### Ручное добавление клиента (для тестирования)

```bash
# Генерация ключей
wg genkey | tee client_private.key | wg pubkey > client_public.key

# Добавление peer
wg set wg0 peer $(cat client_public.key) allowed-ips 10.8.0.2/32

# Создание конфигурации для клиента
cat > client.conf <<EOF
[Interface]
PrivateKey = $(cat client_private.key)
Address = 10.8.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = $(cat /etc/wireguard/server_public.key)
Endpoint = YOUR_SERVER_IP:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF

# QR код для мобильных приложений
qrencode -t ansiutf8 < client.conf
```

## Безопасность

### Настройка firewall

```bash
# Проверка правил UFW
ufw status

# Разрешенные порты:
# - 22/tcp (SSH)
# - 51820/udp (WireGuard)
# - 8080/tcp (Management API)
```

### Защита Management API

⚠️ **ВАЖНО:** Management API открыт для всех! В продакшене:

1. **Ограничьте доступ по IP:**
```bash
# Разрешите только ваш backend сервер
ufw delete allow 8080/tcp
ufw allow from YOUR_BACKEND_IP to any port 8080
```

2. **Используйте VPN или приватную сеть** между backend и WireGuard серверами

3. **Настройте HTTPS** с помощью nginx reverse proxy

### Регулярные обновления

```bash
# Настройте автоматические обновления безопасности
apt install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## Резервное копирование

### Backup конфигурации WireGuard

```bash
# Создание backup
tar -czf wireguard-backup-$(date +%Y%m%d).tar.gz \
    /etc/wireguard/

# Скачивание на локальную машину
scp root@server:/root/wireguard-backup-*.tar.gz ./backups/
```

### Восстановление

```bash
# Распаковка backup
tar -xzf wireguard-backup-20260215.tar.gz -C /

# Перезапуск сервисов
systemctl restart wg-quick@wg0
systemctl restart wireguard-api
```

## Troubleshooting

### WireGuard не запускается

```bash
# Проверка логов
journalctl -u wg-quick@wg0 -n 50

# Проверка конфигурации
wg-quick strip wg0

# Ручной запуск для отладки
wg-quick up wg0
```

### API не отвечает

```bash
# Проверка статуса
systemctl status wireguard-api

# Просмотр логов
journalctl -u wireguard-api -f

# Проверка порта
netstat -tulpn | grep 8080

# Ручной запуск для отладки
cd /opt/wireguard-api
node server.js
```

### Клиенты не могут подключиться

```bash
# 1. Проверка IP forwarding
sysctl net.ipv4.ip_forward
# Должно быть: net.ipv4.ip_forward = 1

# 2. Проверка firewall
ufw status
iptables -L -n -v

# 3. Проверка WireGuard
wg show

# 4. Тест подключения
ping 10.8.0.1  # С клиента
```

## Следующие шаги

После успешного развертывания WireGuard серверов:

1. ✅ WireGuard сервера работают
2. ✅ Management API установлен
3. ✅ Серверы добавлены в базу данных
4. 📝 **Следующий шаг:** Интеграция Management API с вашим NestJS backend
5. 🔗 **Затем:** Создание модуля автоматического управления конфигурациями

Переходите к файлу `WIREGUARD_INTEGRATION.md` для следующего шага.
