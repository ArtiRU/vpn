#!/bin/bash

# ========================================
# WireGuard Management API Installation
# ========================================
# REST API для управления WireGuard сервером
# Позволяет автоматически добавлять/удалять клиентов
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
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
log_info "WireGuard Management API Installation"
log_info "=========================================="

# ========================================
# 1. Установка Node.js (если не установлен)
# ========================================
if ! command -v node &> /dev/null; then
    log_info "Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    log_info "Node.js уже установлен: $(node -v)"
fi

# ========================================
# 2. Создание директории для API
# ========================================
log_info "Создание директории для Management API..."
mkdir -p /opt/wireguard-api
cd /opt/wireguard-api

# ========================================
# 3. Создание package.json
# ========================================
log_info "Создание package.json..."
cat > package.json <<'EOF'
{
  "name": "wireguard-management-api",
  "version": "1.0.0",
  "description": "REST API for WireGuard management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "body-parser": "^1.20.2",
    "uuid": "^9.0.0"
  }
}
EOF

# ========================================
# 4. Установка зависимостей
# ========================================
log_info "Установка зависимостей..."
npm install

# ========================================
# 5. Создание Management API сервера
# ========================================
log_info "Создание API сервера..."

# Генерация API ключа
API_KEY=$(openssl rand -hex 32)

cat > server.js <<'EOFJS'
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const execAsync = promisify(exec);

const app = express();
app.use(bodyParser.json());

const PORT = process.env.API_PORT || 8080;
const API_KEY = process.env.API_KEY;
const WG_CONFIG = '/etc/wireguard/wg0.conf';
const SERVER_INFO = '/etc/wireguard/server_info.json';

// Middleware для проверки API ключа
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Получить следующий доступный IP
async function getNextClientIP() {
    try {
        const data = await fs.readFile(SERVER_INFO, 'utf8');
        const info = JSON.parse(data);
        const nextIP = info.next_client_ip || 2;
        
        // Обновляем счетчик
        info.next_client_ip = nextIP + 1;
        await fs.writeFile(SERVER_INFO, JSON.stringify(info, null, 2));
        
        return `10.8.0.${nextIP}`;
    } catch (error) {
        console.error('Error getting next IP:', error);
        return `10.8.0.2`;
    }
}

// Генерация ключей клиента
async function generateKeys() {
    const { stdout: privateKey } = await execAsync('wg genkey');
    const { stdout: publicKey } = await execAsync(`echo "${privateKey.trim()}" | wg pubkey`);
    
    return {
        privateKey: privateKey.trim(),
        publicKey: publicKey.trim()
    };
}

// Добавить клиента
async function addPeer(publicKey, allowedIP) {
    const command = `wg set wg0 peer ${publicKey} allowed-ips ${allowedIP}/32`;
    await execAsync(command);
    
    // Добавляем в конфиг для сохранения после перезагрузки
    const peerConfig = `\n[Peer]\nPublicKey = ${publicKey}\nAllowedIPs = ${allowedIP}/32\n`;
    await fs.appendFile(WG_CONFIG, peerConfig);
}

// Удалить клиента
async function removePeer(publicKey) {
    const command = `wg set wg0 peer ${publicKey} remove`;
    await execAsync(command);
    
    // Удаляем из конфига
    let config = await fs.readFile(WG_CONFIG, 'utf8');
    const peerRegex = new RegExp(`\\n\\[Peer\\]\\nPublicKey = ${publicKey}\\nAllowedIPs = [^\\n]+\\n`, 'g');
    config = config.replace(peerRegex, '');
    await fs.writeFile(WG_CONFIG, config);
}

// ========================================
// API Endpoints
// ========================================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Получить информацию о сервере
app.get('/api/server/info', authenticate, async (req, res) => {
    try {
        const data = await fs.readFile(SERVER_INFO, 'utf8');
        const info = JSON.parse(data);
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать конфигурацию для клиента
app.post('/api/clients/create', authenticate, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        // Генерируем ключи
        const keys = await generateKeys();
        
        // Получаем IP адрес
        const clientIP = await getNextClientIP();
        
        // Добавляем peer в WireGuard
        await addPeer(keys.publicKey, clientIP);
        
        // Получаем информацию о сервере
        const serverData = await fs.readFile(SERVER_INFO, 'utf8');
        const serverInfo = JSON.parse(serverData);
        
        // Создаем конфигурацию для клиента
        const clientConfig = `[Interface]
PrivateKey = ${keys.privateKey}
Address = ${clientIP}/32
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = ${serverInfo.public_key}
Endpoint = ${serverInfo.public_ip}:${serverInfo.port}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;
        
        res.json({
            success: true,
            client: {
                userId,
                publicKey: keys.publicKey,
                privateKey: keys.privateKey,
                allocatedIP: clientIP,
                config: clientConfig
            }
        });
        
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить клиента
app.delete('/api/clients/:publicKey', authenticate, async (req, res) => {
    try {
        const { publicKey } = req.params;
        
        if (!publicKey) {
            return res.status(400).json({ error: 'publicKey is required' });
        }
        
        await removePeer(publicKey);
        
        res.json({
            success: true,
            message: 'Client removed successfully'
        });
        
    } catch (error) {
        console.error('Error removing client:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить статус WireGuard
app.get('/api/status', authenticate, async (req, res) => {
    try {
        const { stdout } = await execAsync('wg show wg0 dump');
        const lines = stdout.trim().split('\n');
        
        // Первая строка - информация об интерфейсе
        const [iface, privateKey, publicKey, listenPort] = lines[0].split('\t');
        
        // Остальные строки - peers
        const peers = lines.slice(1).map(line => {
            const [pubKey, presharedKey, endpoint, allowedIPs, latestHandshake, rxBytes, txBytes] = line.split('\t');
            return {
                publicKey: pubKey,
                endpoint: endpoint || null,
                allowedIPs: allowedIPs,
                latestHandshake: latestHandshake !== '0' ? new Date(parseInt(latestHandshake) * 1000).toISOString() : null,
                rxBytes: parseInt(rxBytes),
                txBytes: parseInt(txBytes)
            };
        });
        
        res.json({
            interface: 'wg0',
            listenPort: parseInt(listenPort),
            peersCount: peers.length,
            peers
        });
        
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`WireGuard Management API running on port ${PORT}`);
    console.log(`API Key: ${API_KEY}`);
});
EOFJS

# ========================================
# 6. Создание .env файла
# ========================================
log_info "Создание .env файла..."
cat > .env <<EOF
API_PORT=8080
API_KEY=$API_KEY
EOF

# ========================================
# 7. Создание systemd сервиса
# ========================================
log_info "Создание systemd сервиса..."
cat > /etc/systemd/system/wireguard-api.service <<EOF
[Unit]
Description=WireGuard Management API
After=network.target wg-quick@wg0.service
Requires=wg-quick@wg0.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/wireguard-api
EnvironmentFile=/opt/wireguard-api/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# ========================================
# 8. Настройка firewall
# ========================================
log_info "Настройка firewall для API..."
ufw allow 8080/tcp

# ========================================
# 9. Запуск сервиса
# ========================================
log_info "Запуск WireGuard Management API..."
systemctl daemon-reload
systemctl enable wireguard-api
systemctl start wireguard-api

# Проверка статуса
sleep 2
if systemctl is-active --quiet wireguard-api; then
    log_info "✅ WireGuard Management API успешно запущен!"
else
    log_error "Ошибка запуска API"
    systemctl status wireguard-api
    exit 1
fi

# ========================================
# 10. Вывод информации
# ========================================
PUBLIC_IP=$(curl -s ifconfig.me)

log_info "=========================================="
log_info "✅ Installation Complete!"
log_info "=========================================="
echo ""
echo "API URL: http://$PUBLIC_IP:8080"
echo "API Key: $API_KEY"
echo ""
log_info "Сохраните API Key в безопасном месте!"
log_info "Добавьте в .env вашего backend:"
echo ""
echo "WIREGUARD_API_URL=http://$PUBLIC_IP:8080"
echo "WIREGUARD_API_KEY=$API_KEY"
echo ""
log_info "Проверка работы:"
echo "curl -H 'Authorization: Bearer $API_KEY' http://$PUBLIC_IP:8080/health"
echo ""
log_info "Полезные команды:"
echo "  systemctl status wireguard-api  - Статус API"
echo "  journalctl -u wireguard-api -f  - Логи API"
echo "  systemctl restart wireguard-api - Перезапуск API"
