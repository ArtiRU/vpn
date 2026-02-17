import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSessionResponseDto {
  @ApiProperty({
    example: 'https://checkout.stripe.com/pay/cs_test_...',
    description: 'Stripe Checkout session URL',
  })
  url: string;

  @ApiProperty({
    example: 'cs_test_a1b2c3...',
    description: 'Stripe Checkout session ID',
  })
  sessionId: string;
}
