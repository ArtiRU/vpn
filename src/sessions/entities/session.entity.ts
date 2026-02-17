import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Config } from '../../configs/entities/config.entity';
import { Server } from '../../servers/entities/server.entity';

@Entity('sessions')
export class Session {
  @ApiProperty({ example: '1' })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Config, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'config_id' })
  config: Config;

  @ManyToOne(() => Server, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'server_id' })
  server: Server;

  @ApiProperty({ example: '192.168.1.100' })
  @Column({ type: 'varchar', length: 45 })
  client_ip: string;

  @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
  @Column({ type: 'timestamp' })
  connected_at: Date;

  @ApiProperty({ example: '2024-02-12T20:30:00.000Z' })
  @Column({ type: 'timestamp' })
  disconnected_at: Date;

  @ApiProperty({ example: 1048576 })
  @Column({ type: 'bigint', default: 0 })
  bytes_sent: string;

  @ApiProperty({ example: 2097152 })
  @Column({ type: 'bigint', default: 0 })
  bytes_received: string;
}
