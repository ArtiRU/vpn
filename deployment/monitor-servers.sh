#!/bin/bash

# ========================================
# VPN Servers Monitoring Script
# ========================================
# Проверяет состояние всех WireGuard серверов
# и отправляет уведомления при проблемах
# ========================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфигурация
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
JWT_TOKEN="${JWT_TOKEN}"
ALERT_EMAIL="${ALERT_EMAIL}"

log_info() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Проверка наличия необходимых инструментов
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Отсутствуют зависимости: ${missing_deps[*]}"
        log_info "Установите: sudo apt-get install ${missing_deps[*]}"
        exit 1
    fi
}

# Получить список всех серверов из backend
get_servers() {
    local response=$(curl -s -X GET "$BACKEND_URL/servers" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json")
    
    echo "$response"
}

# Проверить health конкретного сервера
check_server_health() {
    local server_url=$1
    local timeout=5
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time $timeout \
        "$server_url/health")
    
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Получить статус WireGuard сервера
get_wireguard_status() {
    local server_url=$1
    local api_key=$2
    
    local response=$(curl -s -X GET "$server_url/api/status" \
        -H "Authorization: Bearer $api_key" \
        --max-time 5)
    
    echo "$response"
}

# Проверить использование ресурсов на сервере (через SSH)
check_server_resources() {
    local server_ip=$1
    
    # Получаем CPU, RAM, Disk
    local stats=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
        root@$server_ip "
        cpu=\$(top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\([0-9.]*\)%* id.*/\1/' | awk '{print 100 - \$1}')
        mem=\$(free | grep Mem | awk '{print (\$3/\$2) * 100.0}')
        disk=\$(df -h / | awk 'NR==2 {print \$5}' | sed 's/%//')
        echo \$cpu,\$mem,\$disk
    " 2>/dev/null)
    
    echo "$stats"
}

# Отправить email уведомление
send_alert() {
    local subject=$1
    local message=$2
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log_info "Отправлено email уведомление на $ALERT_EMAIL"
    fi
}

# Основная функция мониторинга
monitor_servers() {
    log_section "VPN Servers Monitoring"
    log_info "Backend URL: $BACKEND_URL"
    
    # Получаем список серверов
    log_info "Получение списка серверов..."
    local servers=$(get_servers)
    
    if [ -z "$servers" ] || [ "$servers" = "null" ]; then
        log_error "Не удалось получить список серверов"
        exit 1
    fi
    
    local server_count=$(echo "$servers" | jq '. | length')
    log_info "Найдено серверов: $server_count"
    
    echo ""
    
    # Счетчики
    local healthy=0
    local unhealthy=0
    local warnings=0
    
    # Проверяем каждый сервер
    for i in $(seq 0 $(($server_count - 1))); do
        local server=$(echo "$servers" | jq -r ".[$i]")
        local server_id=$(echo "$server" | jq -r '.id')
        local server_name=$(echo "$server" | jq -r '.name')
        local server_hostname=$(echo "$server" | jq -r '.hostname')
        local server_port=$(echo "$server" | jq -r '.port')
        local is_active=$(echo "$server" | jq -r '.is_active')
        local country=$(echo "$server" | jq -r '.country_code')
        
        log_section "Server: $server_name ($country)"
        echo "  ID: $server_id"
        echo "  Hostname: $server_hostname"
        echo "  Port: $server_port"
        echo "  Active: $is_active"
        echo ""
        
        # 1. Проверка Health API
        local api_url="http://$server_hostname:8080"
        log_info "Проверка Health API..."
        
        if check_server_health "$api_url"; then
            log_info "✅ Health API: OK"
            
            # 2. Проверка WireGuard статуса
            log_info "Проверка WireGuard статуса..."
            local wg_status=$(get_wireguard_status "$api_url" "$WIREGUARD_API_KEY")
            
            if [ -n "$wg_status" ] && [ "$wg_status" != "null" ]; then
                local peers_count=$(echo "$wg_status" | jq -r '.peersCount // 0')
                local listen_port=$(echo "$wg_status" | jq -r '.listenPort // 0')
                
                echo "  📊 WireGuard статус:"
                echo "    - Listen Port: $listen_port"
                echo "    - Active Peers: $peers_count"
                
                if [ "$peers_count" -gt 0 ]; then
                    log_info "✅ WireGuard: $peers_count активных подключений"
                else
                    log_warn "⚠️  WireGuard: Нет активных подключений"
                    warnings=$((warnings + 1))
                fi
            else
                log_warn "⚠️  Не удалось получить WireGuard статус"
                warnings=$((warnings + 1))
            fi
            
            # 3. Проверка ресурсов (если доступен SSH)
            log_info "Проверка использования ресурсов..."
            local resources=$(check_server_resources "$server_hostname" 2>/dev/null)
            
            if [ -n "$resources" ]; then
                IFS=',' read -r cpu mem disk <<< "$resources"
                echo "  💻 Ресурсы сервера:"
                echo "    - CPU: ${cpu}%"
                echo "    - RAM: ${mem}%"
                echo "    - Disk: ${disk}%"
                
                # Предупреждения
                if (( $(echo "$cpu > 80" | bc -l) )); then
                    log_warn "⚠️  Высокая загрузка CPU: ${cpu}%"
                    warnings=$((warnings + 1))
                fi
                
                if (( $(echo "$mem > 90" | bc -l) )); then
                    log_warn "⚠️  Высокое использование RAM: ${mem}%"
                    warnings=$((warnings + 1))
                fi
                
                if [ "${disk%.*}" -gt 85 ]; then
                    log_warn "⚠️  Диск заполнен: ${disk}%"
                    warnings=$((warnings + 1))
                fi
            fi
            
            healthy=$((healthy + 1))
        else
            log_error "❌ Health API: НЕДОСТУПЕН"
            log_error "❌ Сервер $server_name не отвечает!"
            unhealthy=$((unhealthy + 1))
            
            # Отправляем уведомление
            send_alert \
                "VPN Server Alert: $server_name DOWN" \
                "Server $server_name ($server_hostname) is not responding!\n\nTime: $(date)\nServer ID: $server_id"
        fi
        
        echo ""
    done
    
    # Итоговая статистика
    log_section "Итоговая статистика"
    echo "✅ Healthy: $healthy"
    echo "❌ Unhealthy: $unhealthy"
    echo "⚠️  Warnings: $warnings"
    echo ""
    
    if [ $unhealthy -gt 0 ]; then
        log_error "Внимание! Обнаружены проблемы с серверами!"
        exit 1
    elif [ $warnings -gt 0 ]; then
        log_warn "Есть предупреждения. Проверьте серверы."
        exit 0
    else
        log_info "Все серверы работают нормально ✅"
        exit 0
    fi
}

# Показать использование
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Показать эту справку"
    echo "  -u, --url URL           URL backend (default: http://localhost:3000)"
    echo "  -t, --token TOKEN       JWT токен для авторизации"
    echo "  -k, --api-key KEY       WireGuard API ключ"
    echo "  -e, --email EMAIL       Email для уведомлений"
    echo ""
    echo "Environment variables:"
    echo "  BACKEND_URL             URL backend"
    echo "  JWT_TOKEN               JWT токен"
    echo "  WIREGUARD_API_KEY       WireGuard API ключ"
    echo "  ALERT_EMAIL             Email для уведомлений"
    echo ""
    echo "Example:"
    echo "  $0 -u http://localhost:3000 -t eyJhbGc... -k abc123"
    echo ""
}

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -u|--url)
            BACKEND_URL="$2"
            shift 2
            ;;
        -t|--token)
            JWT_TOKEN="$2"
            shift 2
            ;;
        -k|--api-key)
            WIREGUARD_API_KEY="$2"
            shift 2
            ;;
        -e|--email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Проверка обязательных параметров
if [ -z "$JWT_TOKEN" ]; then
    log_error "JWT_TOKEN не указан!"
    log_info "Используйте -t TOKEN или установите переменную окружения JWT_TOKEN"
    exit 1
fi

# Запуск мониторинга
check_dependencies
monitor_servers
