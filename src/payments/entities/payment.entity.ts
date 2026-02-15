import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { PaymentProviderType, PaymentStatusType } from '../payments.type';

@Entity('payments')
export class Payment {
    @ApiProperty({ example: '1' })
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Subscription, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'subscription_id' })
    subscription: Subscription;

    @ApiProperty({ example: 9.99 })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @ApiProperty({ example: 'USD' })
    @Column({ type: 'char', length: 3 })
    currency: string;

    @ApiProperty({ enum: PaymentProviderType, example: PaymentProviderType.STRIPE })
    @Column({
        type: 'enum',
        enum: PaymentProviderType,
    })
    provider: PaymentProviderType;

    @ApiProperty({ example: 'pi_3Abc123XYZ' })
    @Column({ type: 'varchar', length: 255 })
    transaction_id: string;

    @ApiProperty({ enum: PaymentStatusType, example: PaymentStatusType.COMPLETED })
    @Column({
        type: 'enum',
        enum: PaymentStatusType,
        default: PaymentStatusType.PENDING,
    })
    status: PaymentStatusType;

    @ApiProperty({ example: '2024-02-12T18:30:00.000Z' })
    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
