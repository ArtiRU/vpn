import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerMetricsService } from './server-metrics.service';
import { ServerMetricsController } from './server-metrics.controller';
import { ServerMetric } from './entities/server-metric.entity';
import { Server } from '../servers/entities/server.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServerMetric, Server])],
  controllers: [ServerMetricsController],
  providers: [ServerMetricsService],
  exports: [ServerMetricsService],
})
export class ServerMetricsModule {}
