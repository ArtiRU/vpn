# 📱 Руководство по разработке клиентских приложений для VPN

## 🎯 Обзор

Данное руководство поможет вам разработать **мобильные** (iOS/Android) и **десктоп** (Windows/Mac/Linux) приложения для вашего VPN-сервиса.

---

## 📋 Содержание

1. [Архитектура решения](#архитектура-решения)
2. [API Спецификация](#api-спецификация)
3. [Мобильные приложения](#мобильные-приложения)
4. [Десктоп приложения](#десктоп-приложения)
5. [Рекомендуемый стек технологий](#рекомендуемый-стек-технологий)
6. [Пошаговая разработка](#пошаговая-разработка)

---

## 🏗️ Архитектура решения

```
┌──────────────────────┐
│   Клиентское         │
│   Приложение         │
│   (iOS/Android/PC)   │
└──────────┬───────────┘
           │
           │ HTTPS REST API
           ▼
┌──────────────────────┐
│   NestJS Backend     │
│   (ваш API)          │
└──────────┬───────────┘
           │
           │ Управление
           ▼
┌──────────────────────┐
│   3X-UI Panel        │
│   (Xray-core)        │
└──────────────────────┘
           │
           │ VLESS + Reality
           ▼
┌──────────────────────┐
│   VPN Сервера        │
└──────────────────────┘
```

### Основные компоненты:

1. **Backend API** (NestJS) - ваш существующий бэкенд
2. **Xray Module** - интеграция с 3X-UI для автоматического создания VLESS конфигураций
3. **Client Apps** - мобильные и десктоп приложения
4. **VPN Core** - библиотеки для подключения (Xray-core, Wireguard)

---

## 🔌 API Спецификация

### Base URL
```
https://your-api-domain.com
```

### Authentication
Все запросы требуют JWT токен в заголовке:
```http
Authorization: Bearer <access_token>
```

---

### 📍 Endpoints для клиентских приложений

#### 1. **Регистрация**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Ответ:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-02-15T10:30:00.000Z"
}
```

---

#### 2. **Вход**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Ответ:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

---

#### 3. **Обновление токена**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

**Ответ:**
```json
{
  "access_token": "new_token_here"
}
```

---

#### 4. **Получить список серверов**
```http
GET /client/servers
Authorization: Bearer <token>
```

**Ответ:**
```json
[
  {
    "id": 1,
    "name": "Frankfurt-01",
    "country_code": "DE",
    "city": "Frankfurt",
    "hostname": "206.245.134.32",
    "port": 443,
    "protocol": "vless",
    "load": 25,
    "priority": 1
  },
  {
    "id": 2,
    "name": "US-NewYork-01",
    "country_code": "US",
    "city": "New York",
    "hostname": "192.168.1.100",
    "port": 443,
    "protocol": "vless",
    "load": 40,
    "priority": 2
  }
]
```

---

#### 5. **Получить серверы по стране**
```http
GET /client/servers/country/:countryCode
Authorization: Bearer <token>

Пример: GET /client/servers/country/DE
```

**Ответ:** (аналогично списку серверов)

---

#### 6. **Получить статус подписки**
```http
GET /client/subscription/status
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "has_active_subscription": true,
  "plan_name": "MONTHLY",
  "start_date": "2026-02-01T00:00:00.000Z",
  "end_date": "2026-03-01T00:00:00.000Z",
  "status": "ACTIVE",
  "auto_renew": true,
  "days_remaining": 14
}
```

---

#### 7. **Получить VPN конфигурацию** ⭐
```http
GET /client/config?server_id=1
Authorization: Bearer <token>
```

**Ответ:**
```json
{
  "id": "config-uuid",
  "config_body": "vless://39dd7a41-732d-48c4-bd46-52a8e4b1cd1f@206.245.134.32:443?type=tcp&encryption=none&security=reality&pbk=OYgSZEQ9zyDtjKHTaPMbF6f-pCUGF-ECSpEAvGW58WM&fp=chrome&sni=github.com&sid=6dfa60e8b26b94&spx=%2F#VLESS-Reality-Main",
  "allocated_ip": "xray-1",
  "expires_at": "2027-02-16T00:00:00.000Z",
  "server_name": "Frankfurt-01",
  "server_country": "DE",
  "server_hostname": "206.245.134.32",
  "server_port": 443
}
```

> **Важно:** `config_body` содержит **полную VLESS ссылку**, которую можно напрямую передать в Xray-core!

---

#### 8. **Получить все конфигурации пользователя**
```http
GET /client/configs
Authorization: Bearer <token>
```

**Ответ:** Массив конфигураций (аналогично `/client/config`)

---

## 📱 Мобильные приложения

### iOS (Swift + SwiftUI)

#### Рекомендуемые библиотеки:
- **Alamofire** - HTTP клиент для взаимодействия с API
- **KeychainAccess** - безопасное хранение токенов
- **Xray-core iOS** - встроенная VPN библиотека
  - Repository: [xray-core-ios](https://github.com/XTLS/Xray-core)
  - Или используйте готовые SDK: **FoXray**, **ShadowLink**

#### Архитектура:
```swift
VPNApp (SwiftUI)
├── Models/
│   ├── User.swift
│   ├── Server.swift
│   └── VPNConfig.swift
├── Services/
│   ├── APIService.swift          // Работа с вашим API
│   ├── AuthService.swift         // Авторизация
│   └── VPNManager.swift          // Управление VPN подключением
├── Views/
│   ├── LoginView.swift
│   ├── ServerListView.swift
│   ├── ConnectionView.swift
│   └── SettingsView.swift
└── Utils/
    ├── KeychainHelper.swift
    └── NetworkMonitor.swift
```

#### Основной флоу:

1. **Авторизация:**
```swift
// AuthService.swift
func login(email: String, password: String) async throws -> AuthResponse {
    let url = URL(string: "\(baseURL)/auth/login")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body = ["email": email, "password": password]
    request.httpBody = try JSONEncoder().encode(body)
    
    let (data, _) = try await URLSession.shared.data(for: request)
    let response = try JSONDecoder().decode(AuthResponse.self, from: data)
    
    // Сохраняем токены в Keychain
    KeychainHelper.save(token: response.access_token, key: "access_token")
    KeychainHelper.save(token: response.refresh_token, key: "refresh_token")
    
    return response
}
```

2. **Получение списка серверов:**
```swift
// APIService.swift
func fetchServers() async throws -> [Server] {
    let url = URL(string: "\(baseURL)/client/servers")!
    var request = URLRequest(url: url)
    request.setValue("Bearer \(getAccessToken())", forHTTPHeaderField: "Authorization")
    
    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONDecoder().decode([Server].self, from: data)
}
```

3. **Подключение к VPN:**
```swift
// VPNManager.swift
import NetworkExtension

class VPNManager: ObservableObject {
    @Published var isConnected = false
    private let manager = NEVPNManager.shared()
    
    func connect(config: VPNConfig) async throws {
        // Парсим VLESS ссылку
        let vlessURL = URL(string: config.config_body)!
        
        // Настраиваем Xray-core с конфигурацией
        // (используйте wrapper или готовый SDK)
        let xrayConfig = parseVlessURL(vlessURL)
        
        // Запускаем VPN туннель
        try await startVPNTunnel(with: xrayConfig)
        
        isConnected = true
    }
    
    func disconnect() {
        manager.connection.stopVPNTunnel()
        isConnected = false
    }
}
```

#### Требования:
- **Xcode 15+**
- **iOS 15+**
- **Network Extension entitlement** для VPN
- **Apple Developer Account** ($99/year)

---

### Android (Kotlin + Jetpack Compose)

#### Рекомендуемые библиотеки:
- **Retrofit** + **OkHttp** - HTTP клиент
- **Hilt** - Dependency Injection
- **Room** - локальное хранение данных
- **Xray-core Android** - VPN библиотека
  - Repository: [V2rayNG](https://github.com/2dust/v2rayNG)
  - Или: [Matsuri](https://github.com/MatsuriDayo/Matsuri)

#### Архитектура (MVVM):
```
VPNApp (Android)
├── data/
│   ├── api/
│   │   └── VPNApiService.kt      // Retrofit интерфейс
│   ├── repository/
│   │   └── VPNRepository.kt
│   └── model/
│       ├── User.kt
│       ├── Server.kt
│       └── VPNConfig.kt
├── ui/
│   ├── login/
│   │   └── LoginScreen.kt
│   ├── servers/
│   │   └── ServerListScreen.kt
│   ├── connection/
│   │   └── ConnectionScreen.kt
│   └── theme/
│       └── Theme.kt
├── viewmodel/
│   ├── AuthViewModel.kt
│   └── VPNViewModel.kt
└── service/
    └── VPNService.kt              // Фоновый сервис для VPN
```

#### Основной флоу:

1. **Retrofit API интерфейс:**
```kotlin
// VPNApiService.kt
interface VPNApiService {
    @POST("auth/login")
    suspend fun login(@Body credentials: LoginRequest): AuthResponse
    
    @GET("client/servers")
    suspend fun getServers(
        @Header("Authorization") token: String
    ): List<Server>
    
    @GET("client/config")
    suspend fun getVPNConfig(
        @Header("Authorization") token: String,
        @Query("server_id") serverId: Int
    ): VPNConfig
}
```

2. **ViewModel для VPN:**
```kotlin
// VPNViewModel.kt
@HiltViewModel
class VPNViewModel @Inject constructor(
    private val repository: VPNRepository
) : ViewModel() {
    
    private val _servers = MutableStateFlow<List<Server>>(emptyList())
    val servers: StateFlow<List<Server>> = _servers
    
    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState
    
    fun fetchServers() {
        viewModelScope.launch {
            try {
                _servers.value = repository.getServers()
            } catch (e: Exception) {
                // Обработка ошибок
            }
        }
    }
    
    fun connectToVPN(serverId: Int) {
        viewModelScope.launch {
            try {
                val config = repository.getVPNConfig(serverId)
                VPNService.start(config.config_body) // Запуск VPN сервиса
                _connectionState.value = ConnectionState.CONNECTED
            } catch (e: Exception) {
                _connectionState.value = ConnectionState.ERROR
            }
        }
    }
}
```

3. **VPN сервис (фоновый):**
```kotlin
// VPNService.kt
class VPNService : VpnService() {
    
    companion object {
        fun start(vlessConfig: String) {
            // Парсим VLESS ссылку и запускаем Xray-core
            V2RayCore.start(vlessConfig)
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val config = intent?.getStringExtra("config")
        
        // Создаем VPN интерфейс
        val builder = Builder()
            .setSession("VPN Session")
            .addAddress("10.0.0.2", 32)
            .addRoute("0.0.0.0", 0)
            .addDnsServer("1.1.1.1")
        
        val vpnInterface = builder.establish()
        
        // Запускаем Xray-core с конфигурацией
        startXrayCore(config, vpnInterface.fd)
        
        return START_STICKY
    }
    
    private fun startXrayCore(config: String?, fd: Int) {
        // Интеграция с Xray-core библиотекой
        // Используйте V2rayNG или Matsuri SDK
    }
}
```

#### UI (Jetpack Compose):
```kotlin
// ConnectionScreen.kt
@Composable
fun ConnectionScreen(viewModel: VPNViewModel) {
    val connectionState by viewModel.connectionState.collectAsState()
    
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Кнопка подключения
        Button(
            onClick = { 
                if (connectionState == ConnectionState.DISCONNECTED) {
                    viewModel.connectToVPN(selectedServerId)
                } else {
                    viewModel.disconnect()
                }
            }
        ) {
            Text(
                text = if (connectionState == ConnectionState.CONNECTED) 
                    "Disconnect" else "Connect"
            )
        }
        
        // Индикатор статуса
        ConnectionStatusIndicator(state = connectionState)
    }
}
```

#### Требования:
- **Android Studio Hedgehog+**
- **Min SDK 21** (Android 5.0)
- **Target SDK 34** (Android 14)
- **VPN permission** в `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.BIND_VPN_SERVICE" />
```

---

## 🖥️ Десктоп приложения

### Кросс-платформенное решение: **Electron + React**

#### Архитектура:
```
VPNApp (Electron)
├── main/                          # Electron Main Process
│   ├── index.ts                   # Точка входа
│   ├── vpn/
│   │   └── xray-manager.ts        # Управление Xray-core
│   └── api/
│       └── api-client.ts          # HTTP клиент
├── renderer/                      # React Frontend
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── Servers.tsx
│   ├── components/
│   │   ├── ServerCard.tsx
│   │   └── ConnectionButton.tsx
│   └── hooks/
│       └── useVPN.ts
└── shared/
    └── types.ts
```

#### Технологии:
- **Electron** - для десктоп приложения
- **React** + **TypeScript** - UI
- **Tailwind CSS** - стилизация
- **Xray-core binary** - для VPN подключения

#### Основной флоу:

1. **API клиент (main process):**
```typescript
// main/api/api-client.ts
import axios from 'axios';

const API_BASE_URL = 'https://your-api-domain.com';

export class APIClient {
    private accessToken: string | null = null;
    
    async login(email: string, password: string) {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
        });
        
        this.accessToken = response.data.access_token;
        // Сохраняем в electron-store
        return response.data;
    }
    
    async getServers() {
        const response = await axios.get(`${API_BASE_URL}/client/servers`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });
        
        return response.data;
    }
    
    async getVPNConfig(serverId: number) {
        const response = await axios.get(
            `${API_BASE_URL}/client/config?server_id=${serverId}`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }
        );
        
        return response.data;
    }
}
```

2. **Xray-core интеграция:**
```typescript
// main/vpn/xray-manager.ts
import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export class XrayManager {
    private xrayProcess: ChildProcess | null = null;
    private readonly xrayPath: string;
    
    constructor() {
        // Путь к Xray-core binary
        this.xrayPath = path.join(
            app.getAppPath(),
            'resources',
            'xray-core',
            process.platform === 'win32' ? 'xray.exe' : 'xray'
        );
    }
    
    async connect(vlessURL: string) {
        // Конвертируем VLESS ссылку в конфиг JSON
        const config = this.parseVlessToConfig(vlessURL);
        
        // Сохраняем конфиг во временный файл
        const configPath = path.join(app.getPath('temp'), 'xray-config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        // Запускаем Xray-core
        this.xrayProcess = spawn(this.xrayPath, ['-config', configPath], {
            stdio: 'pipe'
        });
        
        this.xrayProcess.stdout?.on('data', (data) => {
            console.log(`Xray: ${data}`);
        });
        
        this.xrayProcess.stderr?.on('data', (data) => {
            console.error(`Xray Error: ${data}`);
        });
        
        return true;
    }
    
    disconnect() {
        if (this.xrayProcess) {
            this.xrayProcess.kill();
            this.xrayProcess = null;
        }
    }
    
    private parseVlessToConfig(vlessURL: string): any {
        // Парсим vless:// ссылку в JSON конфиг для Xray
        const url = new URL(vlessURL);
        const params = new URLSearchParams(url.search);
        
        return {
            log: {
                loglevel: "info"
            },
            inbounds: [{
                port: 10808,
                protocol: "socks",
                settings: {
                    udp: true
                }
            }],
            outbounds: [{
                protocol: "vless",
                settings: {
                    vnext: [{
                        address: url.hostname,
                        port: parseInt(url.port),
                        users: [{
                            id: url.username,
                            encryption: params.get('encryption') || 'none',
                            flow: ""
                        }]
                    }]
                },
                streamSettings: {
                    network: params.get('type') || 'tcp',
                    security: params.get('security') || 'reality',
                    realitySettings: {
                        publicKey: params.get('pbk'),
                        fingerprint: params.get('fp') || 'chrome',
                        serverName: params.get('sni') || 'github.com',
                        shortId: params.get('sid') || '',
                        spiderX: params.get('spx') || '/'
                    }
                }
            }]
        };
    }
}
```

3. **IPC связь (main ↔ renderer):**
```typescript
// main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { APIClient } from './api/api-client';
import { XrayManager } from './vpn/xray-manager';

const apiClient = new APIClient();
const xrayManager = new XrayManager();

// Обработчики для IPC
ipcMain.handle('api:login', async (event, email, password) => {
    return await apiClient.login(email, password);
});

ipcMain.handle('api:get-servers', async () => {
    return await apiClient.getServers();
});

ipcMain.handle('vpn:connect', async (event, serverId) => {
    const config = await apiClient.getVPNConfig(serverId);
    return await xrayManager.connect(config.config_body);
});

ipcMain.handle('vpn:disconnect', async () => {
    xrayManager.disconnect();
    return true;
});
```

4. **React UI:**
```tsx
// renderer/hooks/useVPN.ts
import { useState, useCallback } from 'react';

export const useVPN = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [servers, setServers] = useState([]);
    
    const loadServers = useCallback(async () => {
        const result = await window.electron.invoke('api:get-servers');
        setServers(result);
    }, []);
    
    const connect = useCallback(async (serverId: number) => {
        const success = await window.electron.invoke('vpn:connect', serverId);
        setIsConnected(success);
    }, []);
    
    const disconnect = useCallback(async () => {
        await window.electron.invoke('vpn:disconnect');
        setIsConnected(false);
    }, []);
    
    return {
        isConnected,
        servers,
        loadServers,
        connect,
        disconnect
    };
};
```

```tsx
// renderer/pages/Dashboard.tsx
import React, { useEffect } from 'react';
import { useVPN } from '../hooks/useVPN';

export const Dashboard: React.FC = () => {
    const { isConnected, servers, loadServers, connect, disconnect } = useVPN();
    
    useEffect(() => {
        loadServers();
    }, [loadServers]);
    
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">VPN Dashboard</h1>
            
            <div className="mb-6">
                <button
                    onClick={() => isConnected ? disconnect() : connect(servers[0]?.id)}
                    className={`px-6 py-3 rounded-lg ${
                        isConnected 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-green-500 hover:bg-green-600'
                    } text-white font-semibold`}
                >
                    {isConnected ? 'Disconnect' : 'Connect'}
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                {servers.map(server => (
                    <ServerCard 
                        key={server.id} 
                        server={server}
                        onConnect={() => connect(server.id)}
                    />
                ))}
            </div>
        </div>
    );
};
```

#### Сборка приложения:
```bash
# Установка зависимостей
npm install electron electron-builder

# Конфигурация в package.json
{
  "build": {
    "appId": "com.yourvpn.app",
    "productName": "YourVPN",
    "files": [
      "dist/**/*",
      "resources/**/*"
    ],
    "extraResources": [
      {
        "from": "xray-binaries/",
        "to": "xray-core/",
        "filter": ["**/*"]
      }
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "build/icon.png"
    }
  }
}

# Сборка для всех платформ
npm run build
electron-builder -mwl
```

---

## 🛠️ Рекомендуемый стек технологий

### Мобильные (Native):
| Платформа | Язык | UI Framework | VPN Library |
|-----------|------|--------------|-------------|
| iOS | Swift | SwiftUI | Xray-core / FoXray SDK |
| Android | Kotlin | Jetpack Compose | V2rayNG / Matsuri SDK |

### Мобильные (Cross-platform):
- **Flutter** + **Dart**
  - Преимущества: один код для iOS и Android
  - VPN: `flutter_xray` или custom plugin
  - API: `dio` + `retrofit`
  
- **React Native**
  - Преимущества: используете React как на Web
  - VPN: Native Modules для Xray-core
  - API: `axios`

### Десктоп:
- **Electron** (рекомендуется)
  - Кросс-платформенность
  - Web-технологии (React/Vue)
  - Простая интеграция с Xray-core

- **Tauri** (легковесная альтернатива Electron)
  - Rust backend + Web frontend
  - Меньший размер приложения

---

## 📝 Пошаговая разработка

### Фаза 1: Подготовка (1-2 недели)

1. **Настройте .env на VPS для Xray интеграции:**
```bash
# Добавьте в .env
XRAY_PANEL_URL=https://206.245.134.32:2053/K6qSHGEjTQ3uwIUSlZ
XRAY_PANEL_USERNAME=admin
XRAY_PANEL_PASSWORD=admin
```

2. **Пересоберите backend:**
```bash
docker-compose down
docker-compose up -d --build
```

3. **Протестируйте API:**
```bash
# Получите токен
curl -X POST http://206.245.134.32:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}'

# Получите VLESS конфиг
curl -X GET "http://206.245.134.32:3000/client/config?server_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Документируйте API с Swagger:**
Ваш backend уже использует `@nestjs/swagger`, поэтому документация доступна по адресу:
```
http://206.245.134.32:3000/api
```

---

### Фаза 2: MVP мобильного приложения (3-4 недели)

#### Для iOS:
1. Создайте новый проект в Xcode
2. Реализуйте экраны:
   - Login/Register
   - Server List
   - Connection Status
3. Интегрируйте API через `Alamofire`
4. Добавьте VPN функциональность (используйте FoXray SDK)
5. Тестирование на физическом устройстве

#### Для Android:
1. Создайте проект в Android Studio
2. Настройте Hilt для DI
3. Реализуйте UI с Jetpack Compose
4. Интегрируйте Retrofit для API
5. Добавьте VPN сервис (используйте V2rayNG SDK)
6. Тестирование на эмуляторе и физическом устройстве

---

### Фаза 3: MVP десктоп приложения (2-3 недели)

1. Инициализируйте Electron проект:
```bash
npm create electron-app@latest my-vpn-app
```

2. Настройте React + TypeScript
3. Скачайте Xray-core binaries для Windows/Mac/Linux:
   - [Xray Releases](https://github.com/XTLS/Xray-core/releases)
4. Реализуйте UI компоненты
5. Интегрируйте Xray-core через `child_process`
6. Тестирование на всех платформах

---

### Фаза 4: Публикация (2-3 недели)

#### iOS:
1. Зарегистрируйтесь в Apple Developer Program ($99/год)
2. Создайте App ID и Provisioning Profiles
3. Настройте App Store Connect
4. Загрузите билд через Xcode
5. Пройдите App Review

#### Android:
1. Зарегистрируйтесь в Google Play Console ($25 единовременно)
2. Подготовьте signed APK/AAB
3. Создайте store listing
4. Загрузите релиз
5. Пройдите модерацию

#### Desktop:
1. Настройте автоматические обновления (electron-updater)
2. Подпишите приложение (Windows: Authenticode, macOS: Developer ID)
3. Опубликуйте на вашем сайте или в Microsoft Store / Mac App Store

---

## 🎨 UI/UX рекомендации

### Главный экран:
```
┌─────────────────────────────┐
│  [Logo]    YourVPN          │
├─────────────────────────────┤
│                             │
│    ⚪ DISCONNECTED           │
│                             │
│   [🌍 Connect to VPN]       │
│                             │
│   Selected Server:          │
│   🇩🇪 Frankfurt-01           │
│   Ping: 25ms | Load: 30%    │
│                             │
│   [Change Server ▼]         │
│                             │
├─────────────────────────────┤
│  🌐 Servers  ⚙️ Settings    │
└─────────────────────────────┘
```

### Список серверов:
```
┌─────────────────────────────┐
│  🔍 Search servers...        │
├─────────────────────────────┤
│  🇩🇪 Germany                 │
│   • Frankfurt-01 | 25ms ⭐   │
│   • Berlin-02    | 30ms      │
├─────────────────────────────┤
│  🇺🇸 United States           │
│   • New York-01  | 120ms     │
│   • LA-01        | 150ms     │
└─────────────────────────────┘
```

---

## 🔐 Безопасность

### Обязательные меры:
1. **Хранение токенов:**
   - iOS: Keychain
   - Android: EncryptedSharedPreferences
   - Desktop: electron-store + encryption

2. **SSL Pinning** для защиты от MITM атак

3. **Обфускация кода** перед релизом

4. **Логирование:**
   - НЕ логируйте токены и пароли
   - Используйте уровни логирования (DEBUG только в dev)

---

## 📊 Мониторинг и аналитика

Рекомендуется добавить:
- **Firebase Analytics** (мобильные)
- **Sentry** (отслеживание ошибок)
- **Mixpanel** (аналитика поведения пользователей)

---

## 🚀 Готовые решения (альтернатива разработке с нуля)

Если хотите быстрее выйти на рынок, рассмотрите:

1. **V2rayNG (Android)** - форк и кастомизация
2. **FoXray (iOS)** - интеграция вашего API
3. **Qv2ray (Desktop)** - белый лейбл

---

## 📞 Поддержка и вопросы

Если возникнут вопросы в процессе разработки:
1. Проверьте API документацию: `http://your-api/api`
2. Изучите логи backend: `docker logs vpn-backend-1`
3. Тестируйте API через Postman/Insomnia

---

## ✅ Чеклист перед запуском

- [ ] Backend API работает и доступен извне
- [ ] SSL сертификаты настроены
- [ ] 3X-UI интегрирован с backend
- [ ] Токены авторизации защищены
- [ ] VPN подключение работает на тестовых устройствах
- [ ] Обработка ошибок реализована
- [ ] UI/UX протестирован на реальных пользователях
- [ ] Приложения подписаны и готовы к публикации

---

## 📚 Полезные ресурсы

### Документация:
- [Xray-core](https://xtls.github.io/)
- [NestJS](https://docs.nestjs.com/)
- [SwiftUI](https://developer.apple.com/xcode/swiftui/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Electron](https://www.electronjs.org/docs/latest)

### Примеры кода:
- [V2rayNG](https://github.com/2dust/v2rayNG) - Android VPN клиент
- [FoXray](https://github.com/FoXZilla/Xray-core) - iOS VPN клиент
- [Qv2ray](https://github.com/Qv2ray/Qv2ray) - Desktop VPN клиент

---

**Готово!** 🎉 Теперь у вас есть полное руководство для разработки клиентских приложений!
