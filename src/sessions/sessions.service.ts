import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';
import { Config } from '../configs/entities/config.entity';
import { Server } from '../servers/entities/server.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Config)
    private readonly configsRepository: Repository<Config>,
    @InjectRepository(Server)
    private readonly serversRepository: Repository<Server>,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const { user_id, config_id, server_id, ...sessionData } = createSessionDto;

    // Проверяем существование пользователя
    const user = await this.usersRepository.findOne({
      where: { id: user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверяем существование конфигурации
    const config = await this.configsRepository.findOne({
      where: { id: config_id },
    });

    if (!config) {
      throw new NotFoundException('Config not found');
    }

    // Проверяем существование сервера
    const server = await this.serversRepository.findOne({
      where: { id: server_id },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Создаем сессию
    const session = this.sessionsRepository.create({
      ...sessionData,
      connected_at: new Date(sessionData.connected_at),
      disconnected_at: new Date(sessionData.disconnected_at),
      bytes_sent: sessionData.bytes_sent?.toString() || '0',
      bytes_received: sessionData.bytes_received?.toString() || '0',
    });

    // Устанавливаем связи
    session.user = user;
    session.config = config;
    session.server = server;

    return this.sessionsRepository.save(session);
  }

  async findAll(): Promise<Session[]> {
    return this.sessionsRepository.find({
      relations: ['user', 'config', 'server'],
      order: {
        connected_at: 'DESC',
      },
    });
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.sessionsRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'config', 'server'],
      order: {
        connected_at: 'DESC',
      },
    });
  }

  async findByServerId(serverId: number): Promise<Session[]> {
    return this.sessionsRepository.find({
      where: { server: { id: serverId } },
      relations: ['user', 'config', 'server'],
      order: {
        connected_at: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['user', 'config', 'server'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async update(id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['user', 'config', 'server'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Если обновляется user_id, проверяем существование пользователя
    if (updateSessionDto.user_id && updateSessionDto.user_id !== session.user?.id) {
      const user = await this.usersRepository.findOne({
        where: { id: updateSessionDto.user_id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      session.user = user;
      delete updateSessionDto.user_id;
    }

    // Если обновляется config_id, проверяем существование конфигурации
    if (updateSessionDto.config_id && updateSessionDto.config_id !== session.config?.id) {
      const config = await this.configsRepository.findOne({
        where: { id: updateSessionDto.config_id },
      });

      if (!config) {
        throw new NotFoundException('Config not found');
      }

      session.config = config;
      delete updateSessionDto.config_id;
    }

    // Если обновляется server_id, проверяем существование сервера
    if (updateSessionDto.server_id && updateSessionDto.server_id !== session.server?.id) {
      const server = await this.serversRepository.findOne({
        where: { id: updateSessionDto.server_id },
      });

      if (!server) {
        throw new NotFoundException('Server not found');
      }

      session.server = server;
      delete updateSessionDto.server_id;
    }

    // Конвертируем даты и bigint
    if (updateSessionDto.connected_at) {
      updateSessionDto.connected_at = new Date(updateSessionDto.connected_at);
    }
    if (updateSessionDto.disconnected_at) {
      updateSessionDto.disconnected_at = new Date(updateSessionDto.disconnected_at);
    }
    if (updateSessionDto.bytes_sent !== undefined) {
      session.bytes_sent = updateSessionDto.bytes_sent.toString();
      delete updateSessionDto.bytes_sent;
    }
    if (updateSessionDto.bytes_received !== undefined) {
      session.bytes_received = updateSessionDto.bytes_received.toString();
      delete updateSessionDto.bytes_received;
    }

    const updatedSession = Object.assign(session, updateSessionDto);

    return this.sessionsRepository.save(updatedSession);
  }

  async disconnect(id: string): Promise<Session> {
    const session = await this.findOne(id);
    session.disconnected_at = new Date();
    return this.sessionsRepository.save(session);
  }

  async updateTraffic(id: string, bytesSent: number, bytesReceived: number): Promise<Session> {
    const session = await this.findOne(id);
    session.bytes_sent = bytesSent.toString();
    session.bytes_received = bytesReceived.toString();
    return this.sessionsRepository.save(session);
  }

  async remove(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['user', 'config', 'server'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.sessionsRepository.delete(id);

    return session;
  }
}
