import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { RoleType, StatusType } from '../users.type';

@Entity('users')
export class User {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ApiProperty({ example: 'user@example.com' })
    @Column({ unique: true })
    email: string;

    @ApiHideProperty()
    @Exclude()
    @Column()
    password: string;

    @ApiProperty({ enum: RoleType, example: RoleType.USER })
    @Column({
        type: 'enum',
        enum: RoleType,
        default: RoleType.USER
    })
    role: RoleType;

    @ApiProperty({ enum: StatusType, example: StatusType.ACTIVE })
    @Column({
        type: 'enum',
        enum: StatusType,
        default: StatusType.ACTIVE
    })
    status: StatusType;

    @ApiProperty({ example: false })
    @Column({ default: false })
    trial_used: boolean;

    @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @ApiProperty({ example: '2024-02-12T18:30:00.000Z', nullable: true })
    @Column({ type: 'timestamp', nullable: true })
    last_login: Date;

    // Relations: users ───┬───── subscriptions
    //                     ├───── configs
    //                     ├───── payments
    //                     └───── sessions
    @OneToMany('Subscription', 'user')
    subscriptions: any[];

    @OneToMany('Config', 'user')
    configs: any[];

    @OneToMany('Payment', 'user')
    payments: any[];

    @OneToMany('Session', 'user')
    sessions: any[];
}
