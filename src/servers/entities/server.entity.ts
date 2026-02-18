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

  @ApiProperty({ example: 'de1.vpn.example.com' })
  @Column({ type: 'varchar', length: 255 })
  hostname: string;

  @ApiProperty({ example: 443, description: 'VLESS Reality port (usually 443)' })
  @Column({ type: 'int', default: 443 })
  port: number;

  @ApiProperty({ enum: ProtocolType, example: ProtocolType.VLESS })
  @Column({
    type: 'enum',
    enum: ProtocolType,
    default: ProtocolType.VLESS,
  })
  protocol: ProtocolType;

  @ApiProperty({ 
    example: 'github.com:443', 
    description: 'Reality destination (SNI:port)',
    nullable: true 
  })
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
  //                       └───── sessions
  @OneToMany('Config', 'server')
  configs: any[];

  @OneToMany('Session', 'server')
  sessions: any[];
}
