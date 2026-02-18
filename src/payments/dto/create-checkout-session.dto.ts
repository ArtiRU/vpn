import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

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
    example: 'https://example.com/payment/success',
    description: 'URL to redirect after successful payment',
    required: false,
  })
  @IsString()
  @IsOptional()
  return_url?: string;
}
