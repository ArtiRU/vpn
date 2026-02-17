import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from '../configs/entities/config.entity';
import { User } from '../users/entities/user.entity';
import { Server } from '../servers/entities/server.entity';
import { XrayService } from './xray.service';

@Injectable()
export class XrayManagerService {
  private readonly logger = new Logger(XrayManagerService.name);

  constructor(
    @InjectRepository(Config)
    private readonly configsRepository: Repository<Config>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Server)
    private readonly serversRepository: Repository<Server>,
    private readonly xrayService: XrayService,
  ) {}

  /**
   * Автоматически создать VLESS Reality конфигурацию для пользователя
   */
  async createVlessConfig(
    userId: string,
    serverId?: number,
  ): Promise<{ configLink: string; config: Config }> {
    // Проверяем пользователя
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['subscriptions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверяем активную подписку
    const activeSubscription = user.subscriptions?.find(
      (sub: any) => sub.status === 'ACTIVE',
    );

    if (!activeSubscription) {
      throw new BadRequestException('User does not have an active subscription');
    }

    // Выбираем сервер
    let server: Server;
    if (serverId) {
      server = await this.serversRepository.findOne({
        where: { id: serverId, is_active: true },
      });
      if (!server) {
        throw new NotFoundException('Server not found or inactive');
      }
    } else {
      // Выбираем оптимальный сервер
      server = await this.selectOptimalServer();
      if (!server) {
        throw new NotFoundException('No available servers');
      }
    }

    // Находим VLESS Reality inbound
    const inbound = await this.xrayService.findVlessRealityInbound();
    if (!inbound) {
      throw new BadRequestException('No VLESS Reality inbound configured');
    }

    // Создаем email для клиента
    const clientEmail = `user-${userId.substring(0, 8)}-${Date.now()}`;

    // Вычисляем дату истечения
    const expiryDate = new Date(activeSubscription.end_date);
    const expiryDays = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    // Добавляем клиента в 3X-UI
    const result = await this.xrayService.addClient(
      inbound.id,
      clientEmail,
      undefined,
      expiryDays,
    );

    if (!result.success) {
      throw new BadRequestException('Failed to create VLESS client');
    }

    // Получаем конфигурационную ссылку
    const vlessLink = await this.xrayService.getClientConfig(
      inbound.id,
      clientEmail,
    );

    // Сохраняем в базу данных
    const config = this.configsRepository.create({
      user: user,
      server: server,
      config_body: vlessLink, // Сохраняем vless:// ссылку
      private_key: clientEmail, // Сохраняем email для идентификации
      allocated_ip: `xray-${inbound.id}`, // Помечаем что это Xray конфиг
      expires_at: expiryDate,
      last_used: new Date(),
    });

    const savedConfig = await this.configsRepository.save(config);

    this.logger.log(`Created VLESS config for user ${userId}`);

    return {
      configLink: vlessLink,
      config: savedConfig,
    };
  }

  /**
   * Получить или создать VLESS конфигурацию
   */
  async getOrCreateVlessConfig(
    userId: string,
    serverId?: number,
  ): Promise<{ configLink: string; config: Config }> {
    // Проверяем существующую конфигурацию
    let config: Config | null;

    if (serverId) {
      config = await this.configsRepository.findOne({
        where: {
          user: { id: userId },
          server: { id: serverId },
          allocated_ip: { $like: 'xray-%' } as any,
        },
        relations: ['user', 'server'],
        order: { created_at: 'DESC' },
      });
    } else {
      config = await this.configsRepository.findOne({
        where: {
          user: { id: userId },
          allocated_ip: { $like: 'xray-%' } as any,
        },
        relations: ['user', 'server'],
        order: { created_at: 'DESC' },
      });
    }

    // Если конфигурация существует и не истекла
    if (config && new Date(config.expires_at) > new Date()) {
      config.last_used = new Date();
      await this.configsRepository.save(config);

      return {
        configLink: config.config_body,
        config: config,
      };
    }

    // Создаем новую
    return await this.createVlessConfig(userId, serverId);
  }

  /**
   * Удалить VLESS конфигурацию
   */
  async removeVlessConfig(configId: string): Promise<void> {
    const config = await this.configsRepository.findOne({
      where: { id: configId },
      relations: ['server'],
    });

    if (!config) {
      throw new NotFoundException('Config not found');
    }

    // Удаляем из 3X-UI
    try {
      const inbound = await this.xrayService.findVlessRealityInbound();
      if (inbound) {
        const clientEmail = config.private_key;
        
        // Получаем список клиентов из inbound
        const settings = JSON.parse(inbound.settings);
        const client = settings.clients?.find((c: any) => c.email === clientEmail);
        
        if (client) {
          await this.xrayService.removeClient(inbound.id, client.id);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to remove client from Xray: ${error.message}`);
    }

    // Удаляем из БД
    await this.configsRepository.delete(configId);
  }

  /**
   * Выбрать оптимальный сервер
   */
  private async selectOptimalServer(): Promise<Server | null> {
    const servers = await this.serversRepository.find({
      where: { is_active: true, protocol: 'vless' as any },
      order: { load: 'ASC', priority: 'ASC' },
    });

    return servers[0] || null;
  }

  /**
   * Получить статистику использования
   */
  async getClientStats(email: string): Promise<any> {
    return await this.xrayService.getClientStats(email);
  }
}
