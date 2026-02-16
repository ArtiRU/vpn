import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from '../configs/entities/config.entity';
import { User } from '../users/entities/user.entity';
import { Server } from '../servers/entities/server.entity';
import { WireguardService } from './wireguard.service';
import * as crypto from 'crypto';

@Injectable()
export class WireguardManagerService {
  private readonly logger = new Logger(WireguardManagerService.name);

  constructor(
    @InjectRepository(Config)
    private readonly configsRepository: Repository<Config>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Server)
    private readonly serversRepository: Repository<Server>,
    private readonly wireguardService: WireguardService,
  ) {}

  /**
   * Автоматически создать WireGuard конфигурацию для пользователя
   * Выбирает оптимальный сервер на основе нагрузки и приоритета
   */
  async createAutoConfig(
    userId: string,
    countryCode?: string,
  ): Promise<Config> {
    // Проверяем существование пользователя
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['subscriptions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверяем активную подписку
    const activeSubscription = user.subscriptions?.find(
      (sub: any) => sub.status === 'active'
    );
    
    if (!activeSubscription) {
      throw new BadRequestException('User does not have an active subscription');
    }

    // Выбираем оптимальный сервер
    const server = await this.selectOptimalServer(countryCode);

    if (!server) {
      throw new NotFoundException('No available servers found');
    }

    // Создаем конфигурацию через WireGuard API
    const serverUrl = this.wireguardService.createServerApiUrl(
      server.hostname,
      8080,
    );

    let wireguardConfig;
    try {
      wireguardConfig = await this.wireguardService.createClientConfig(
        userId,
        serverUrl,
      );
    } catch (error) {
      this.logger.error(`Failed to create WireGuard config: ${error.message}`);
      throw new BadRequestException(
        'Failed to create VPN configuration on server',
      );
    }

    // Шифруем приватный ключ перед сохранением
    const encryptedPrivateKey = this.encryptPrivateKey(
      wireguardConfig.privateKey,
    );

    // Вычисляем дату истечения (на основе подписки)
    const expiresAt = new Date(activeSubscription.end_date);

    // Сохраняем в базу данных
    const config = this.configsRepository.create({
      user: user,
      server: server,
      config_body: wireguardConfig.config,
      private_key: encryptedPrivateKey,
      allocated_ip: wireguardConfig.allocatedIP,
      expires_at: expiresAt,
      last_used: new Date(),
      created_at: new Date(),
    });

    const savedConfig = await this.configsRepository.save(config);

    // Обновляем нагрузку сервера
    await this.updateServerLoad(server.id);

    this.logger.log(
      `Created auto config for user ${userId} on server ${server.name}`,
    );

    return savedConfig;
  }

  /**
   * Выбрать оптимальный сервер на основе:
   * 1. Страна (если указана)
   * 2. Активность сервера
   * 3. Нагрузка
   * 4. Приоритет
   */
  private async selectOptimalServer(
    countryCode?: string,
  ): Promise<Server | null> {
    const queryBuilder = this.serversRepository
      .createQueryBuilder('server')
      .where('server.is_active = :isActive', { isActive: true });

    if (countryCode) {
      queryBuilder.andWhere('server.country_code = :countryCode', {
        countryCode: countryCode.toUpperCase(),
      });
    }

    const servers = await queryBuilder
      .orderBy('server.load', 'ASC')
      .addOrderBy('server.priority', 'ASC')
      .getMany();

    if (servers.length === 0) {
      return null;
    }

    // Выбираем сервер с наименьшей нагрузкой
    return servers[0];
  }

  /**
   * Обновить нагрузку сервера на основе количества активных подключений
   */
  async updateServerLoad(serverId: number): Promise<void> {
    const server = await this.serversRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      return;
    }

    try {
      const serverUrl = this.wireguardService.createServerApiUrl(
        server.hostname,
        8080,
      );

      const activeConnections =
        await this.wireguardService.getActiveConnectionsCount(serverUrl);

      // Вычисляем процент нагрузки (предполагаем максимум 100 подключений)
      const maxConnections = 100;
      const load = Math.min(
        100,
        Math.round((activeConnections / maxConnections) * 100),
      );

      server.load = load;
      await this.serversRepository.save(server);

      this.logger.log(`Updated server ${server.name} load: ${load}%`);
    } catch (error) {
      this.logger.error(
        `Failed to update server load for ${server.name}: ${error.message}`,
      );
    }
  }

  /**
   * Обновить нагрузку всех серверов
   */
  async updateAllServersLoad(): Promise<void> {
    const servers = await this.serversRepository.find({
      where: { is_active: true },
    });

    for (const server of servers) {
      await this.updateServerLoad(server.id);
    }

    this.logger.log(`Updated load for ${servers.length} servers`);
  }

  /**
   * Проверить здоровье всех серверов
   */
  async checkServersHealth(): Promise<
    Array<{ serverId: number; name: string; isHealthy: boolean }>
  > {
    const servers = await this.serversRepository.find();
    const results: Array<{ serverId: number; name: string; isHealthy: boolean }> = [];

    for (const server of servers) {
      const serverUrl = this.wireguardService.createServerApiUrl(
        server.hostname,
        8080,
      );

      const isHealthy = await this.wireguardService.healthCheck(serverUrl);

      results.push({
        serverId: server.id,
        name: server.name,
        isHealthy,
      });

      // Автоматически деактивируем нездоровые серверы
      if (!isHealthy && server.is_active) {
        this.logger.warn(
          `Server ${server.name} is unhealthy, deactivating...`,
        );
        server.is_active = false;
        await this.serversRepository.save(server);
      }
    }

    return results;
  }

  /**
   * Получить конфигурацию для пользователя (или создать новую)
   */
  async getOrCreateConfig(
    userId: string,
    serverId?: number,
    countryCode?: string,
  ): Promise<Config> {
    // Пытаемся найти существующую активную конфигурацию
    let config: Config | null = null;

    if (serverId) {
      config = await this.configsRepository.findOne({
        where: {
          user: { id: userId },
          server: { id: serverId },
        },
        relations: ['user', 'server'],
      });
    } else if (countryCode) {
      config = await this.configsRepository.findOne({
        where: {
          user: { id: userId },
          server: { country_code: countryCode.toUpperCase() },
        },
        relations: ['user', 'server'],
        order: { created_at: 'DESC' },
      });
    } else {
      config = await this.configsRepository.findOne({
        where: {
          user: { id: userId },
        },
        relations: ['user', 'server'],
        order: { created_at: 'DESC' },
      });
    }

    // Если конфигурация существует и не истекла, возвращаем её
    if (config && new Date(config.expires_at) > new Date()) {
      // Обновляем last_used
      config.last_used = new Date();
      await this.configsRepository.save(config);
      return config;
    }

    // Иначе создаем новую
    return await this.createAutoConfig(userId, countryCode);
  }

  /**
   * Шифрование приватного ключа (базовое, для примера)
   * В продакшене используйте более надежное шифрование
   */
  private encryptPrivateKey(privateKey: string): string {
    // Простое base64 кодирование (замените на реальное шифрование!)
    return Buffer.from(privateKey).toString('base64');
  }

  /**
   * Расшифровка приватного ключа
   */
  private decryptPrivateKey(encryptedKey: string): string {
    return Buffer.from(encryptedKey, 'base64').toString('utf-8');
  }
}
