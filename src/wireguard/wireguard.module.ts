import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WireguardService } from './wireguard.service';
import { WireguardManagerService } from './wireguard-manager.service';
import { Config } from '../configs/entities/config.entity';
import { User } from '../users/entities/user.entity';
import { Server } from '../servers/entities/server.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Config, User, Server])],
  providers: [WireguardService, WireguardManagerService],
  exports: [WireguardService, WireguardManagerService],
})
export class WireguardModule {}
