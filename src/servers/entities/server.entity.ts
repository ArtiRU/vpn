import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ProtocolType } from '../servers.type';

@Entity('servers')
export class Server {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Frankfurt-01' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'DE' })
  @Column({ type: 'char', length: 2 })
  country_code: string;

  @ApiProperty({ example: 'Frankfurt' })
  @Column({ type: 'varchar', length: 255 })
  city: string;

  @ApiProperty({ example: 'vpn.example.com' })
  @Column({ type: 'varchar', length: 255 })
  hostname: string;

  @ApiProperty({ example: 51820 })
  @Column({ type: 'int' })
  port: number;

  @ApiProperty({ enum: ProtocolType, example: ProtocolType.WIREGUARD })
  @Column({
    type: 'enum',
    enum: ProtocolType,
  })
  protocol: ProtocolType;

  @ApiProperty({ example: 'public_key_here...', nullable: true })
  @Column({ type: 'text', nullable: true })
  public_key: string;

  @ApiProperty({ example: true })
  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int', default: 10 })
  priority: number;

  @ApiProperty({ example: 45 })
  @Column({ type: 'int', default: 0 })
  load: number;

  @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Relations: servers ───┬───── configs
  //                       ├───── sessions
  //                       └───── server_metrics
  @OneToMany('Config', 'server')
  configs: any[];

  @OneToMany('Session', 'server')
  sessions: any[];

  @OneToMany('ServerMetric', 'server')
  serverMetrics: any[];
}
