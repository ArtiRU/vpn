#!/bin/bash

# ========================================
# WireGuard Installation Script
# Для Ubuntu 20.04/22.04 LTS
# ========================================
# Этот скрипт устанавливает и настраивает WireGuard VPN сервер
# Запуск: sudo bash install-wireguard.sh
# ========================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция вывода
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   log_error "Этот скрипт должен быть запущен с правами root (sudo)"
   exit 1
fi

log_info "=========================================="
log_info "WireGuard VPN Server Installation"
log_info "=========================================="

# ========================================
# 1. Обновление системы
# ========================================
log_info "Обновление системы..."
apt-get update
apt-get upgrade -y

# ========================================
# 2. Установка WireGuard и зависимостей
# ========================================
log_info "Установка WireGuard..."
apt-get install -y wireguard \
                   wireguard-tools \
                   iptables \
                   resolvconf \
                   qrencode \
                   curl \
                   jq

# ========================================
# 3. Включение IP forwarding
# ========================================
log_info "Включение IP forwarding..."
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
sysctl -p

# ========================================
# 4. Генерация ключей сервера
# ========================================
log_info "Генерация ключей сервера..."
mkdir -p /etc/wireguard
cd /etc/wireguard

# Генерация приватного и публичного ключей
umask 077
wg genkey | tee server_private.key | wg pubkey > server_public.key

SERVER_PRIVATE_KEY=$(cat server_private.key)
SERVER_PUBLIC_KEY=$(cat server_public.key)

log_info "Приватный ключ сервера: $SERVER_PRIVATE_KEY"
log_info "Публичный ключ сервера: $SERVER_PUBLIC_KEY"

# ========================================
# 5. Определение сетевого интерфейса
# ========================================
log_info "Определение сетевого интерфейса..."
# Находим основной интерфейс с выходом в интернет
NETWORK_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)
log_info "Используемый интерфейс: $NETWORK_INTERFACE"

# ========================================
# 6. Конфигурация WireGuard
# ========================================
log_info "Создание конфигурации WireGuard..."

# Параметры сервера (можно изменить)
WG_PORT=${WG_PORT:-51820}
WG_NETWORK="10.8.0.0/24"
WG_SERVER_IP="10.8.0.1/24"

# Создание конфигурационного файла
cat > /etc/wireguard/wg0.conf <<EOF
# WireGuard Server Configuration
# Generated: $(date)

[Interface]
# Приватный ключ сервера
PrivateKey = $SERVER_PRIVATE_KEY

# IP адрес сервера в VPN сети
Address = $WG_SERVER_IP

# Порт WireGuard
ListenPort = $WG_PORT

# DNS для клиентов (Cloudflare DNS)
# DNS = 1.1.1.1, 1.0.0.1

# Команды при запуске интерфейса
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -A FORWARD -o wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o $NETWORK_INTERFACE -j MASQUERADE

# Команды при остановке интерфейса
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -D FORWARD -o wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o $NETWORK_INTERFACE -j MASQUERADE

# Здесь будут добавляться клиенты (peers)
# Пример:
# [Peer]
# PublicKey = client_public_key_here
# AllowedIPs = 10.8.0.2/32
EOF

chmod 600 /etc/wireguard/wg0.conf

# ========================================
# 7. Настройка Firewall (UFW)
# ========================================
log_info "Настройка firewall..."

# Установка UFW если не установлен
if ! command -v ufw &> /dev/null; then
    apt-get install -y ufw
fi

# Разрешаем SSH (чтобы не потерять доступ!)
ufw allow 22/tcp

# Разрешаем WireGuard порт
ufw allow $WG_PORT/udp

# Включаем UFW
ufw --force enable

log_info "Firewall настроен (SSH: 22, WireGuard: $WG_PORT)"

# ========================================
# 8. Запуск WireGuard
# ========================================
log_info "Запуск WireGuard сервера..."

# Включаем автозапуск
systemctl enable wg-quick@wg0

# Запускаем сервис
systemctl start wg-quick@wg0

# Проверяем статус
if systemctl is-active --quiet wg-quick@wg0; then
    log_info "WireGuard успешно запущен!"
else
    log_error "Ошибка запуска WireGuard"
    systemctl status wg-quick@wg0
    exit 1
fi

# ========================================
# 9. Получение публичного IP сервера
# ========================================
log_info "Получение публичного IP адреса..."
PUBLIC_IP=$(curl -s ifconfig.me)
log_info "Публичный IP сервера: $PUBLIC_IP"

# ========================================
# 10. Вывод информации
# ========================================
log_info "=========================================="
log_info "✅ WireGuard установлен и настроен!"
log_info "=========================================="
echo ""
log_info "Информация о сервере:"
echo "------------------------------"
echo "Публичный IP: $PUBLIC_IP"
echo "WireGuard порт: $WG_PORT"
echo "Публичный ключ сервера: $SERVER_PUBLIC_KEY"
echo "VPN сеть: $WG_NETWORK"
echo "Сетевой интерфейс: $NETWORK_INTERFACE"
echo ""
log_info "Конфигурационный файл: /etc/wireguard/wg0.conf"
log_info "Ключи сервера: /etc/wireguard/server_*.key"
echo ""
log_info "Полезные команды:"
echo "  wg                           - Показать статус WireGuard"
echo "  wg show                      - Подробная информация"
echo "  systemctl status wg-quick@wg0 - Статус сервиса"
echo "  systemctl restart wg-quick@wg0 - Перезапуск"
echo "  journalctl -u wg-quick@wg0 -f  - Просмотр логов"
echo ""

# ========================================
# 11. Сохранение данных для backend
# ========================================
log_info "Сохранение информации для backend..."

cat > /etc/wireguard/server_info.json <<EOF
{
  "public_ip": "$PUBLIC_IP",
  "port": $WG_PORT,
  "public_key": "$SERVER_PUBLIC_KEY",
  "network": "$WG_NETWORK",
  "interface": "$NETWORK_INTERFACE",
  "next_client_ip": 2
}
EOF

log_info "Данные сохранены в /etc/wireguard/server_info.json"

# ========================================
# 12. Проверка работы
# ========================================
log_info "Проверка работы WireGuard..."
wg show

log_info "=========================================="
log_info "Установка завершена успешно!"
log_info "=========================================="
log_warn "ВАЖНО: Сохраните публичный ключ сервера для добавления в базу данных:"
echo ""
echo "    $SERVER_PUBLIC_KEY"
echo ""
log_info "Следующий шаг: Установите WireGuard Management API"
log_info "Скрипт: ./install-wireguard-api.sh"
