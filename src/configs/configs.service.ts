import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { Config } from './entities/config.entity';
import { User } from '../users/entities/user.entity';
import { Server } from '../servers/entities/server.entity';

@Injectable()
export class ConfigsService {
  constructor(
    @InjectRepository(Config)
    private readonly configsRepository: Repository<Config>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Server)
    private readonly serversRepository: Repository<Server>,
  ) {}

  async create(createConfigDto: CreateConfigDto): Promise<Config> {
    const { user_id, server_id, ...configData } = createConfigDto;

    const user = await this.usersRepository.findOne({
      where: { id: user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const server = await this.serversRepository.findOne({
      where: { id: server_id },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const existingConfig = await this.configsRepository.findOne({
      where: { 
        allocated_ip: configData.allocated_ip,
        server: { id: server_id },
      },
    });

    if (existingConfig) {
      throw new ConflictException('This IP address is already allocated on this server');
    }

    const config = this.configsRepository.create({
      ...configData,
      expires_at: new Date(configData.expires_at),
      last_used: new Date(configData.last_used),
    });

    config.user = user;
    config.server = server;

    return this.configsRepository.save(config);
  }

  async findAll(): Promise<Config[]> {
    return this.configsRepository.find({
      relations: ['user', 'server'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findByUserId(userId: string): Promise<Config[]> {
    return this.configsRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'server'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findByServerId(serverId: number): Promise<Config[]> {
    return this.configsRepository.find({
      where: { server: { id: serverId } },
      relations: ['user', 'server'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Config> {
    const config = await this.configsRepository.findOne({
      where: { id },
      relations: ['user', 'server'],
    });

    if (!config) {
      throw new NotFoundException('Config not found');
    }

    return config;
  }

  async update(id: string, updateConfigDto: UpdateConfigDto): Promise<Config> {
    const config = await this.configsRepository.findOne({
      where: { id },
      relations: ['user', 'server'],
    });

    if (!config) {
      throw new NotFoundException('Config not found');
    }

    // Если обновляется user_id, проверяем существование пользователя
    if (updateConfigDto.user_id && updateConfigDto.user_id !== config.user?.id) {
      const user = await this.usersRepository.findOne({
        where: { id: updateConfigDto.user_id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      config.user = user;
      delete updateConfigDto.user_id;
    }

    // Если обновляется server_id, проверяем существование сервера
    if (updateConfigDto.server_id && updateConfigDto.server_id !== config.server?.id) {
      const server = await this.serversRepository.findOne({
        where: { id: updateConfigDto.server_id },
      });

      if (!server) {
        throw new NotFoundException('Server not found');
      }

      config.server = server;
      delete updateConfigDto.server_id;
    }

    // Если обновляется allocated_ip, проверяем уникальность
    if (updateConfigDto.allocated_ip && updateConfigDto.allocated_ip !== config.allocated_ip) {
      const existingConfig = await this.configsRepository.findOne({
        where: { 
          allocated_ip: updateConfigDto.allocated_ip,
          server: { id: config.server.id },
        },
      });

      if (existingConfig && existingConfig.id !== id) {
        throw new ConflictException('This IP address is already allocated on this server');
      }
    }

    // Конвертируем даты
    if (updateConfigDto.expires_at) {
      updateConfigDto.expires_at = new Date(updateConfigDto.expires_at);
    }
    if (updateConfigDto.last_used) {
      updateConfigDto.last_used = new Date(updateConfigDto.last_used);
    }

    const updatedConfig = Object.assign(config, updateConfigDto);

    return this.configsRepository.save(updatedConfig);
  }

  async updateLastUsed(id: string): Promise<Config> {
    const config = await this.findOne(id);
    config.last_used = new Date();
    return this.configsRepository.save(config);
  }

  async remove(id: string): Promise<Config> {
    const config = await this.configsRepository.findOne({
      where: { id },
      relations: ['user', 'server'],
    });

    if (!config) {
      throw new NotFoundException('Config not found');
    }

    await this.configsRepository.delete(id);

    return config;
  }

  async removeExpired(): Promise<number> {
    const expiredConfigs = await this.configsRepository.find({
      where: {
        expires_at: LessThan(new Date()),
      },
    });

    if (expiredConfigs.length === 0) {
      return 0;
    }

    await this.configsRepository.remove(expiredConfigs);
    return expiredConfigs.length;
  }

  async removeInactive(daysInactive: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const inactiveConfigs = await this.configsRepository.find({
      where: {
        last_used: LessThan(cutoffDate),
      },
    });

    if (inactiveConfigs.length === 0) {
      return 0;
    }

    await this.configsRepository.remove(inactiveConfigs);
    return inactiveConfigs.length;
  }
}
