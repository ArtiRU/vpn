import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlanType, SubscriptionStatusType } from '../subscriptions.type';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
export class Subscription {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ApiProperty({ enum: SubscriptionPlanType, example: SubscriptionPlanType.MONTHLY })
    @Column({
        type: 'enum',
        enum: SubscriptionPlanType,
        default: SubscriptionPlanType.MONTHLY
    })
    plan_name: SubscriptionPlanType;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    @Column({ type: 'timestamp' })
    start_date: Date;

    @ApiProperty({ example: '2024-02-01T00:00:00.000Z' })
    @Column({ type: 'timestamp' })
    end_date: Date;

    @ApiProperty({ example: false })
    @Column({ default: false })
    auto_renew: boolean;

    @ApiProperty({ enum: SubscriptionStatusType, example: SubscriptionStatusType.ACTIVE })
    @Column({
        type: 'enum',
        enum: SubscriptionStatusType,
        default: SubscriptionStatusType.ACTIVE
    })
    status: SubscriptionStatusType;

    @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    // Подписка живет отдельно от конфига
    // Это позволяет блокировать доступ по дате, не удаляя ключи физически
    @OneToMany('Payment', 'subscription')
    payments: any[];
}
