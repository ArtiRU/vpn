import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionStatusDto {
    @ApiProperty({ example: true, description: 'Whether user has active subscription' })
    has_active_subscription: boolean;

    @ApiProperty({ example: 'monthly', description: 'Current plan name', nullable: true })
    plan_name: string | null;

    @ApiProperty({ example: '2024-02-01T00:00:00.000Z', description: 'Subscription start date', nullable: true })
    start_date: Date | null;

    @ApiProperty({ example: '2024-03-01T00:00:00.000Z', description: 'Subscription end date', nullable: true })
    end_date: Date | null;

    @ApiProperty({ example: 'active', description: 'Subscription status', nullable: true })
    status: string | null;

    @ApiProperty({ example: true, description: 'Auto renew enabled', nullable: true })
    auto_renew: boolean | null;

    @ApiProperty({ example: 15, description: 'Days remaining until expiration', nullable: true })
    days_remaining: number | null;
}
