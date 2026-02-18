import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface XrayClient {
  id: string;
  email: string;
  enable: boolean;
  expiryTime: number;
  totalGB: number;
  flow: string;
}

export interface XrayInbound {
  id: number;
  remark: string;
  protocol: string;
  port: number;
  enable: boolean;
  settings: any;
  streamSettings: any;
  clientStats: any[];
}

export interface CreateClientResponse {
  success: boolean;
  msg: string;
  obj: {
    email: string;
    link: string;
    qrCode: string;
  };
}

@Injectable()
export class XrayService {
  private readonly logger = new Logger(XrayService.name);
  private axiosInstance: AxiosInstance;
  private readonly panelUrl: string | undefined;
  private readonly username: string | undefined;
  private readonly password: string | undefined;
  private sessionCookie: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.panelUrl = this.configService.get<string>('XRAY_PANEL_URL');
    this.username = this.configService.get<string>('XRAY_PANEL_USERNAME');
    this.password = this.configService.get<string>('XRAY_PANEL_PASSWORD');

    if (!this.panelUrl || !this.username || !this.password) {
      this.logger.warn(
        'Xray Panel credentials not configured. VLESS integration will not work.',
      );
    }

    this.axiosInstance = axios.create({
      baseURL: this.panelUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Авторизация в 3X-UI панели
   */
  private async login(): Promise<string> {
    try {
      const response = await this.axiosInstance.post('/login', {
        username: this.username,
        password: this.password,
      });

      // Извлекаем session cookie
      const cookies = response.headers['set-cookie'];
      if (cookies && cookies.length > 0) {
        this.sessionCookie = cookies[0].split(';')[0];
        return this.sessionCookie;
      }

      throw new Error('Failed to get session cookie');
    } catch (error) {
      this.logger.error('Failed to login to Xray panel:', error.message);
      throw new HttpException(
        'Failed to authenticate with Xray panel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получить session cookie (с переавторизацией если нужно)
   */
  private async getSession(): Promise<string> {
    if (!this.sessionCookie) {
      return await this.login();
    }
    return this.sessionCookie;
  }

  /**
   * Получить список inbounds
   */
  async getInbounds(): Promise<XrayInbound[]> {
    try {
      const session = await this.getSession();

      const response = await this.axiosInstance.get(
        '/panel/api/inbounds/list',
        {
          headers: {
            Cookie: session,
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.msg || 'Failed to get inbounds');
      }

      return response.data.obj || [];
    } catch (error) {
      this.logger.error('Failed to get inbounds:', error.message);
      throw new HttpException(
        'Failed to get Xray inbounds',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Найти VLESS Reality inbound
   */
  async findVlessRealityInbound(): Promise<XrayInbound | null> {
    const inbounds = await this.getInbounds();

    // Ищем включенный VLESS inbound с Reality
    const vlessInbound = inbounds.find(
      (inbound) =>
        inbound.enable &&
        inbound.protocol === 'vless' &&
        inbound.streamSettings?.security === 'reality',
    );

    return vlessInbound || null;
  }

  /**
   * Добавить клиента в существующий inbound
   */
  async addClient(
    inboundId: number,
    email: string,
    uuid?: string,
    expiryDays?: number,
  ): Promise<CreateClientResponse> {
    try {
      const session = await this.getSession();

      // UUID генерируется автоматически если не указан
      const clientData: any = {
        id: inboundId,
        settings: JSON.stringify({
          clients: [
            {
              id: uuid || this.generateUUID(),
              email: email,
              flow: 'xtls-rprx-vision',
              limitIp: 0,
              totalGB: 0,
              expiryTime: expiryDays ? Date.now() + expiryDays * 86400000 : 0,
              enable: true,
              tgId: '',
              subId: '',
            },
          ],
        }),
      };

      const response = await this.axiosInstance.post(
        '/panel/api/inbounds/addClient',
        clientData,
        {
          headers: {
            Cookie: session,
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.msg || 'Failed to add client');
      }

      this.logger.log(`Added VLESS client: ${email}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to add client:', error.message);

      // Попробуем переавторизоваться
      if (error.response?.status === 401) {
        this.sessionCookie = undefined;
        return await this.addClient(inboundId, email, uuid, expiryDays);
      }

      throw new HttpException(
        'Failed to add VLESS client',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получить конфигурацию клиента (ссылку vless://)
   */
  async getClientConfig(inboundId: number, email: string): Promise<string> {
    try {
      const inbounds = await this.getInbounds();
      const inbound = inbounds.find((i) => i.id === inboundId);

      if (!inbound) {
        throw new Error('Inbound not found');
      }

      // Парсим настройки
      const settings = JSON.parse(inbound.settings);
      const client = settings.clients?.find((c: any) => c.email === email);

      if (!client) {
        throw new Error('Client not found');
      }

      // Формируем vless:// ссылку
      const streamSettings = inbound.streamSettings;
      const realitySettings = streamSettings.realitySettings;

      const params = new URLSearchParams({
        type: streamSettings.network || 'tcp',
        encryption: 'none',
        security: 'reality',
        pbk: realitySettings.publicKey,
        fp: realitySettings.fingerprint || 'chrome',
        sni: realitySettings.serverNames?.[0] || 'github.com',
        sid: realitySettings.shortIds?.[0] || '',
        spx: realitySettings.spiderX || '/',
      });

      const vlessLink = `vless://${client.id}@${this.getPublicIP()}:${inbound.port}?${params.toString()}#${inbound.remark}-${email}`;

      return vlessLink;
    } catch (error) {
      this.logger.error('Failed to get client config:', error.message);
      throw new HttpException(
        'Failed to get client configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Удалить клиента
   */
  async removeClient(inboundId: number, clientUUID: string): Promise<void> {
    try {
      const session = await this.getSession();

      const response = await this.axiosInstance.post(
        `/panel/api/inbounds/${inboundId}/delClient/${clientUUID}`,
        {},
        {
          headers: {
            Cookie: session,
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.msg || 'Failed to remove client');
      }

      this.logger.log(`Removed VLESS client: ${clientUUID}`);
    } catch (error) {
      this.logger.error('Failed to remove client:', error.message);

      if (error.response?.status === 401) {
        this.sessionCookie = undefined;
        return await this.removeClient(inboundId, clientUUID);
      }

      throw new HttpException(
        'Failed to remove VLESS client',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Получить статистику клиента
   */
  async getClientStats(email: string): Promise<any> {
    try {
      const session = await this.getSession();

      const response = await this.axiosInstance.post(
        '/panel/api/inbounds/clientStats',
        { email },
        {
          headers: {
            Cookie: session,
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.msg || 'Failed to get client stats');
      }

      return response.data.obj;
    } catch (error) {
      this.logger.error('Failed to get client stats:', error.message);
      return null;
    }
  }

  /**
   * Проверка доступности панели
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.panelUrl}/`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      this.logger.error('Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Генерация UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Получить публичный IP сервера
   */
  private getPublicIP(): string {
    // Извлекаем IP из URL панели
    const url = new URL(this.panelUrl || 'http://localhost');
    return url.hostname;
  }
}
