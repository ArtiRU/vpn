import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ServersModule } from '../servers/servers.module';
import { ConfigsModule } from '../configs/configs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [ServersModule, ConfigsModule, SubscriptionsModule],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
