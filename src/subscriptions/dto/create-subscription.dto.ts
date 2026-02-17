import {
  SubscriptionPlanType,
  SubscriptionStatusType,
} from '../subscriptions.type';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Plan name',
    enum: SubscriptionPlanType,
    example: SubscriptionPlanType.MONTHLY,
    default: SubscriptionPlanType.MONTHLY,
    required: true,
  })
  @IsEnum(SubscriptionPlanType)
  plan_name: SubscriptionPlanType;

  @ApiProperty({
    description: 'Subscription start date',
    example: '2024-01-01T00:00:00.000Z',
    required: true,
  })
  @IsDateString()
  start_date: Date;

  @ApiProperty({
    description: 'Subscription end date',
    example: '2024-02-01T00:00:00.000Z',
    required: true,
  })
  @IsDateString()
  end_date: Date;

  @ApiProperty({
    description: 'Auto renew',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @ApiProperty({
    description: 'Status name',
    enum: SubscriptionStatusType,
    example: SubscriptionStatusType.ACTIVE,
    default: SubscriptionStatusType.ACTIVE,
    required: true,
  })
  @IsEnum(SubscriptionStatusType)
  status: SubscriptionStatusType;
}
