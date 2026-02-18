import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSessionResponseDto {
  @ApiProperty({
    example: 'https://yoomoney.ru/checkout/payments/v2/contract?orderId=...',
    description: 'YooKassa payment page URL',
  })
  url: string;

  @ApiProperty({
    example: '2d07ec3e-0006-5000-8000-1a60e1b52db6',
    description: 'YooKassa payment ID',
  })
  sessionId: string;
}
