import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

export enum CheckoutPlanType {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    enum: CheckoutPlanType,
    example: CheckoutPlanType.MONTHLY,
    description: 'Subscription plan type',
  })
  @IsNotEmpty()
  @IsEnum(CheckoutPlanType)
  plan: CheckoutPlanType;

  @ApiProperty({
    example: 'https://example.com/success',
    description: 'URL to redirect after successful payment',
    required: false,
  })
  @IsString()
  success_url?: string;

  @ApiProperty({
    example: 'https://example.com/cancel',
    description: 'URL to redirect after cancelled payment',
    required: false,
  })
  @IsString()
  cancel_url?: string;
}
