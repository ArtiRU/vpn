import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WireGuardServerInfo {
  public_ip: string;
  port: number;
  public_key: string;
  network: string;
  interface: string;
  next_client_ip: number;
}

export interface WireGuardClientConfig {
  userId: string;
  publicKey: string;
  privateKey: string;
  allocatedIP: string;
  config: string;
}

export interface WireGuardPeer {
  publicKey: string;
  endpoint: string | null;
  allowedIPs: string;
  latestHandshake: string | null;
  rxBytes: number;
  txBytes: number;
}

export interface WireGuardStatus {
  interface: string;
  listenPort: number;
  peersCount: number;
  peers: WireGuardPeer[];
}

@Injectable()
export class WireguardService {
  private readonly logger = new Logger(WireguardService.name);
  private axiosInstance: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WIREGUARD_API_URL');
    this.apiKey = this.configService.get<string>('WIREGUARD_API_KEY');

    if (!this.apiUrl || !this.apiKey) {
      this.logger.warn(
        'WireGuard API credentials not configured. WireGuard integration will not work.',
      );
    }

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Проверка доступности WireGuard Management API
   */
  async healthCheck(serverUrl?: string): Promise<boolean> {
    try {
      const url = serverUrl || this.apiUrl;
      const response = await axios.get(`${url}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Health check failed for ${serverUrl || this.apiUrl}:`, error.message);
      return false;
    }
  }

  /**
   * Получить информацию о WireGuard сервере
   */
  async getServerInfo(serverUrl?: string): Promise<WireGuardServerInfo> {
    try {
      const url = serverUrl || this.apiUrl;
      const response = await axios.get(`${url}/api/server/info`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get server info:', error.message);
      throw new HttpException(
        'Failed to communicate with WireGuard server',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Создать конфигурацию для клиента
   */
  async createClientConfig(
    userId: string,
    serverUrl?: string,
  ): Promise<WireGuardClientConfig> {
    try {
      const url = serverUrl || this.apiUrl;
      const response = await axios.post(
        `${url}/api/clients/create`,
        { userId },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 10000,
        },
      );

      if (!response.data.success) {
        throw new Error('Failed to create client config');
      }

      this.logger.log(`Created WireGuard config for user ${userId}`);
      return response.data.client;
    } catch (error) {
      this.logger.error('Failed to create client config:', error.message);
      throw new HttpException(
        'Failed to create WireGuard configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Удалить клиента (peer) из WireGuard
   */
  async removeClient(publicKey: string, serverUrl?: string): Promise<void> {
    try {
      const url = serverUrl || this.apiUrl;
      const response = await axios.delete(`${url}/api/clients/${publicKey}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });

      if (!response.data.success) {
        throw new Error('Failed to remove client');
      }

      this.logger.log(`Removed WireGuard peer with public key ${publicKey}`);
    } catch (error) {
      this.logger.error('Failed to remove client:', error.message);
      throw new HttpException(
        'Failed to remove WireGuard peer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получить статус WireGuard сервера и всех peers
   */
  async getStatus(serverUrl?: string): Promise<WireGuardStatus> {
    try {
      const url = serverUrl || this.apiUrl;
      const response = await axios.get(`${url}/api/status`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get WireGuard status:', error.message);
      throw new HttpException(
        'Failed to get WireGuard server status',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Проверить, активен ли peer (по публичному ключу)
   */
  async isPeerActive(publicKey: string, serverUrl?: string): Promise<boolean> {
    try {
      const status = await this.getStatus(serverUrl);
      const peer = status.peers.find((p) => p.publicKey === publicKey);

      if (!peer) {
        return false;
      }

      // Считаем peer активным, если handshake был в последние 3 минуты
      if (peer.latestHandshake) {
        const handshakeTime = new Date(peer.latestHandshake);
        const now = new Date();
        const diffMinutes = (now.getTime() - handshakeTime.getTime()) / 1000 / 60;
        return diffMinutes < 3;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check peer status:', error.message);
      return false;
    }
  }

  /**
   * Получить использование трафика для peer
   */
  async getPeerTraffic(
    publicKey: string,
    serverUrl?: string,
  ): Promise<{ rxBytes: number; txBytes: number } | null> {
    try {
      const status = await this.getStatus(serverUrl);
      const peer = status.peers.find((p) => p.publicKey === publicKey);

      if (!peer) {
        return null;
      }

      return {
        rxBytes: peer.rxBytes,
        txBytes: peer.txBytes,
      };
    } catch (error) {
      this.logger.error('Failed to get peer traffic:', error.message);
      return null;
    }
  }

  /**
   * Получить количество активных подключений на сервере
   */
  async getActiveConnectionsCount(serverUrl?: string): Promise<number> {
    try {
      const status = await this.getStatus(serverUrl);
      
      // Считаем активными peers с handshake в последние 3 минуты
      const now = new Date();
      const activePeers = status.peers.filter((peer) => {
        if (!peer.latestHandshake) return false;
        
        const handshakeTime = new Date(peer.latestHandshake);
        const diffMinutes = (now.getTime() - handshakeTime.getTime()) / 1000 / 60;
        return diffMinutes < 3;
      });

      return activePeers.length;
    } catch (error) {
      this.logger.error('Failed to get active connections count:', error.message);
      return 0;
    }
  }

  /**
   * Создать URL для подключения к конкретному серверу
   */
  createServerApiUrl(hostname: string, port: number = 8080): string {
    return `http://${hostname}:${port}`;
  }
}
