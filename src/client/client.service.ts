import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ServersService } from '../servers/servers.service';
import { ConfigsService } from '../configs/configs.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { XrayManagerService } from '../xray/xray-manager.service';
import { ServerInfoDto } from './dto/server-info.dto';
import { SubscriptionStatusDto } from './dto/subscription-status.dto';
import { VpnConfigDto } from './dto/vpn-config.dto';
import { ProtocolType } from '../servers/servers.type';

@Injectable()
export class ClientService {
  constructor(
    private readonly serversService: ServersService,
    private readonly configsService: ConfigsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly xrayManager: XrayManagerService,
  ) {}

  async getAvailableServers(): Promise<ServerInfoDto[]> {
    const servers = await this.serversService.findActive();

    return servers.map((server) => ({
      id: server.id,
      name: server.name,
      country_code: server.country_code,
      city: server.city,
      hostname: server.hostname,
      port: server.port,
      protocol: server.protocol,
      load: server.load,
      priority: server.priority,
    }));
  }

  async getServersByCountry(countryCode: string): Promise<ServerInfoDto[]> {
    const servers = await this.serversService.findByCountry(countryCode);

    return servers.map((server) => ({
      id: server.id,
      name: server.name,
      country_code: server.country_code,
      city: server.city,
      hostname: server.hostname,
      port: server.port,
      protocol: server.protocol,
      load: server.load,
      priority: server.priority,
    }));
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusDto> {
    const subscription =
      await this.subscriptionsService.findActiveByUserId(userId);

    if (!subscription) {
      return {
        has_active_subscription: false,
        plan_name: null,
        start_date: null,
        end_date: null,
        status: null,
        auto_renew: null,
        days_remaining: null,
      };
    }

    const now = new Date();
    const isActive =
      subscription.end_date > now && subscription.start_date <= now;
    const daysRemaining = isActive
      ? Math.ceil(
          (subscription.end_date.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      has_active_subscription: isActive,
      plan_name: subscription.plan_name,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      status: subscription.status,
      auto_renew: subscription.auto_renew,
      days_remaining: daysRemaining,
    };
  }

  async getVpnConfig(
    userId: string,
    serverId?: number,
    countryCode?: string,
  ): Promise<VpnConfigDto> {
    // Check if user has active subscription
    const hasSubscription =
      await this.subscriptionsService.hasActiveSubscription(userId);
    if (!hasSubscription) {
      throw new ForbiddenException(
        'Active subscription required to get VPN configuration',
      );
    }

    // Определяем протокол сервера
    if (serverId) {
      const server = await this.serversService.findOne(serverId);
      if (!server) {
        throw new NotFoundException('Server not found');
      }
    }

    // Используем только VLESS + Reality для всех подключений
    const result = await this.xrayManager.getOrCreateVlessConfig(
      userId,
      serverId,
    );
    const config = result.config;

    // Check if config is expired
    if (config.expires_at < new Date()) {
      throw new ForbiddenException(
        'Your VPN configuration has expired. Please contact support.',
      );
    }

    return {
      id: config.id,
      config_body: config.config_body,
      allocated_ip: config.allocated_ip,
      expires_at: config.expires_at,
      server_name: config.server.name,
      server_country: config.server.country_code,
      server_hostname: config.server.hostname,
      server_port: config.server.port,
    };
  }

  async getUserConfigs(userId: string): Promise<VpnConfigDto[]> {
    const hasSubscription =
      await this.subscriptionsService.hasActiveSubscription(userId);
    if (!hasSubscription) {
      throw new ForbiddenException('Active subscription required');
    }

    const configs = await this.configsService.findByUserId(userId);
    const now = new Date();

    return configs
      .filter((config) => config.expires_at > now)
      .map((config) => ({
        id: config.id,
        config_body: config.config_body,
        allocated_ip: config.allocated_ip,
        expires_at: config.expires_at,
        server_name: config.server.name,
        server_country: config.server.country_code,
        server_hostname: config.server.hostname,
        server_port: config.server.port,
      }));
  }
}
