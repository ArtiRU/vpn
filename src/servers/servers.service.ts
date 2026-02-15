import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { Server } from './entities/server.entity';

@Injectable()
export class ServersService {
  constructor(
    @InjectRepository(Server)
    private readonly serversRepository: Repository<Server>,
  ) {}

  async create(createServerDto: CreateServerDto): Promise<Server> {
    const { hostname, port } = createServerDto;

    const existingServer = await this.serversRepository.findOne({
      where: { hostname, port },
    });

    if (existingServer) {
      throw new ConflictException('Server with this hostname and port already exists');
    }

    const server = this.serversRepository.create(createServerDto);

    return this.serversRepository.save(server);
  }

  async findAll(): Promise<Server[]> {
    return this.serversRepository.find({
      order: {
        priority: 'ASC',
        created_at: 'DESC',
      },
    });
  }

  async findActive(): Promise<Server[]> {
    return this.serversRepository.find({
      where: { is_active: true },
      order: {
        priority: 'ASC',
        load: 'ASC',
      },
    });
  }

  async findByCountry(countryCode: string): Promise<Server[]> {
    return this.serversRepository.find({
      where: { 
        country_code: countryCode.toUpperCase(),
        is_active: true,
      },
      order: {
        priority: 'ASC',
        load: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Server> {
    const server = await this.serversRepository.findOne({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }

  async update(id: number, updateServerDto: UpdateServerDto): Promise<Server> {
    const server = await this.serversRepository.findOne({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (updateServerDto.hostname || updateServerDto.port) {
      const hostname = updateServerDto.hostname || server.hostname;
      const port = updateServerDto.port || server.port;

      const existingServer = await this.serversRepository.findOne({
        where: { hostname, port },
      });

      if (existingServer && existingServer.id !== id) {
        throw new ConflictException('Server with this hostname and port already exists');
      }
    }

    const updatedServer = Object.assign(server, updateServerDto);

    return this.serversRepository.save(updatedServer);
  }

  async updateLoad(id: number, load: number): Promise<Server> {
    const server = await this.findOne(id);
    server.load = load;
    return this.serversRepository.save(server);
  }

  async remove(id: number): Promise<Server> {
    const server = await this.serversRepository.findOne({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    await this.serversRepository.delete(id);

    return server;
  }
}
