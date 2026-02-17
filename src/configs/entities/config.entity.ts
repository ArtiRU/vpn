import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Server } from '../../servers/entities/server.entity';

@Entity('configs')
export class Config {
  @ApiProperty({ example: '1' })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  // Config привязан И к пользователю, И к серверу
  // Один юзер может иметь ключи на разные страны
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Server, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'server_id' })
  server: Server;

  @ApiProperty({
    example: '[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\n...',
  })
  @Column({ type: 'text' })
  config_body: string;

  @ApiProperty({ example: 'encrypted_private_key_here...' })
  @Column({ type: 'text' })
  private_key: string;

  @ApiProperty({ example: '10.0.0.2' })
  @Column({ type: 'varchar', length: 45 })
  allocated_ip: string;

  @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ApiProperty({ example: '2025-02-12T18:30:00.000Z' })
  @Column({ type: 'timestamp' })
  expires_at: Date;

  @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
  @Column({ type: 'timestamp' })
  last_used: Date;

  // Обратная связь: сессии наследуют всё через конфиг
  @OneToMany('Session', 'config')
  sessions: any[];
}
