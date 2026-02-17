import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ServersModule } from '../servers/servers.module';
import { ConfigsModule } from '../configs/configs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { WireguardModule } from '../wireguard/wireguard.module';
import { XrayModule } from '../xray/xray.module';
import { Config } from '../configs/entities/config.entity';
import { User } from '../users/entities/user.entity';
import { Server } from '../servers/entities/server.entity';
import { XrayManagerService } from '../xray/xray-manager.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Config, User, Server]),
    ServersModule,
    ConfigsModule,
    SubscriptionsModule,
    WireguardModule,
    XrayModule,
  ],
  controllers: [ClientController],
  providers: [ClientService, XrayManagerService],
})
export class ClientModule {}
