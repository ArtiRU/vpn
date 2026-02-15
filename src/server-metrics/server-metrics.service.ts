import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual } from 'typeorm';
import { CreateServerMetricDto } from './dto/create-server-metric.dto';
import { UpdateServerMetricDto } from './dto/update-server-metric.dto';
import { ServerMetric } from './entities/server-metric.entity';
import { Server } from '../servers/entities/server.entity';

@Injectable()
export class ServerMetricsService {
  constructor(
    @InjectRepository(ServerMetric)
    private readonly serverMetricsRepository: Repository<ServerMetric>,
    @InjectRepository(Server)
    private readonly serversRepository: Repository<Server>,
  ) {}

  async create(createServerMetricDto: CreateServerMetricDto): Promise<ServerMetric> {
    const { server_id, ...metricData } = createServerMetricDto;

    // Проверяем существование сервера
    const server = await this.serversRepository.findOne({
      where: { id: server_id },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Создаем метрику
    const metric = this.serverMetricsRepository.create({
      ...metricData,
      recorded_at: new Date(metricData.recorded_at),
    });

    // Устанавливаем связь
    metric.server = server;

    return this.serverMetricsRepository.save(metric);
  }

  async findAll(): Promise<ServerMetric[]> {
    return this.serverMetricsRepository.find({
      relations: ['server'],
      order: {
        recorded_at: 'DESC',
      },
    });
  }

  async findByServerId(serverId: number): Promise<ServerMetric[]> {
    return this.serverMetricsRepository.find({
      where: { server: { id: serverId } },
      relations: ['server'],
      order: {
        recorded_at: 'DESC',
      },
    });
  }

  async findLatestByServerId(serverId: number): Promise<ServerMetric> {
    const metric = await this.serverMetricsRepository.findOne({
      where: { server: { id: serverId } },
      relations: ['server'],
      order: {
        recorded_at: 'DESC',
      },
    });

    if (!metric) {
      throw new NotFoundException('No metrics found for this server');
    }

    return metric;
  }

  async findByServerIdAndTimeRange(
    serverId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<ServerMetric[]> {
    return this.serverMetricsRepository.find({
      where: {
        server: { id: serverId },
        recorded_at: MoreThanOrEqual(startDate),
      },
      relations: ['server'],
      order: {
        recorded_at: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<ServerMetric> {
    const metric = await this.serverMetricsRepository.findOne({
      where: { id },
      relations: ['server'],
    });

    if (!metric) {
      throw new NotFoundException('Server metric not found');
    }

    return metric;
  }

  async update(id: string, updateServerMetricDto: UpdateServerMetricDto): Promise<ServerMetric> {
    const metric = await this.serverMetricsRepository.findOne({
      where: { id },
      relations: ['server'],
    });

    if (!metric) {
      throw new NotFoundException('Server metric not found');
    }

    // Если обновляется server_id, проверяем существование сервера
    if (updateServerMetricDto.server_id && updateServerMetricDto.server_id !== metric.server?.id) {
      const server = await this.serversRepository.findOne({
        where: { id: updateServerMetricDto.server_id },
      });

      if (!server) {
        throw new NotFoundException('Server not found');
      }

      metric.server = server;
      delete updateServerMetricDto.server_id;
    }

    // Конвертируем дату
    if (updateServerMetricDto.recorded_at) {
      updateServerMetricDto.recorded_at = new Date(updateServerMetricDto.recorded_at);
    }

    const updatedMetric = Object.assign(metric, updateServerMetricDto);

    return this.serverMetricsRepository.save(updatedMetric);
  }

  async remove(id: string): Promise<ServerMetric> {
    const metric = await this.serverMetricsRepository.findOne({
      where: { id },
      relations: ['server'],
    });

    if (!metric) {
      throw new NotFoundException('Server metric not found');
    }

    await this.serverMetricsRepository.delete(id);

    return metric;
  }

  async removeOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldMetrics = await this.serverMetricsRepository.find({
      where: {
        recorded_at: LessThan(cutoffDate),
      },
    });

    if (oldMetrics.length === 0) {
      return 0;
    }

    await this.serverMetricsRepository.remove(oldMetrics);
    return oldMetrics.length;
  }
}
