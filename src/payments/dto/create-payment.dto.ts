import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber, IsEnum, Length, Min } from 'class-validator';
import { PaymentProviderType, PaymentStatusType } from '../payments.type';

export class CreatePaymentDto {
    @ApiProperty({
        description: 'User ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: true,
    })
    @IsUUID()
    user_id: string;

    @ApiProperty({
        description: 'Subscription ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: true,
    })
    @IsUUID()
    subscription_id: string;

    @ApiProperty({
        description: 'Payment amount',
        example: 9.99,
        required: true,
    })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({
        description: 'Currency code (ISO 4217)',
        example: 'USD',
        required: true,
    })
    @IsString()
    @Length(3, 3)
    currency: string;

    @ApiProperty({
        description: 'Payment provider',
        enum: PaymentProviderType,
        example: PaymentProviderType.STRIPE,
        required: true,
    })
    @IsEnum(PaymentProviderType)
    provider: PaymentProviderType;

    @ApiProperty({
        description: 'Transaction ID from payment gateway',
        example: 'pi_3Abc123XYZ',
        required: true,
    })
    @IsString()
    @Length(1, 255)
    transaction_id: string;

    @ApiProperty({
        description: 'Payment status',
        enum: PaymentStatusType,
        example: PaymentStatusType.PENDING,
        default: PaymentStatusType.PENDING,
        required: true,
    })
    @IsEnum(PaymentStatusType)
    status: PaymentStatusType;
}
