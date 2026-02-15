import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Server } from '../../servers/entities/server.entity';

@Entity('server_metrics')
export class ServerMetric {
    @ApiProperty({ example: '1' })
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @ManyToOne(() => Server, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'server_id' })
    server: Server;

    @ApiProperty({ example: 45.5 })
    @Column({ type: 'float' })
    cpu_usage: number;

    @ApiProperty({ example: 67.8 })
    @Column({ type: 'float' })
    mem_usage: number;

    @ApiProperty({ example: 150 })
    @Column({ type: 'int' })
    active_connections: number;

    @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
    @Column({ type: 'timestamp' })
    recorded_at: Date;
}
