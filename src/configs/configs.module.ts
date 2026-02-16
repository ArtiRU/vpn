import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigsService } from './configs.service';
import { ConfigsController } from './configs.controller';
import { Config } from './entities/config.entity';
import { User } from '../users/entities/user.entity';
import { Server } from '../servers/entities/server.entity';
import { WireguardModule } from '../wireguard/wireguard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Config, User, Server]),
    WireguardModule,
  ],
  controllers: [ConfigsController],
  providers: [ConfigsService],
  exports: [ConfigsService],
})
export class ConfigsModule {}
