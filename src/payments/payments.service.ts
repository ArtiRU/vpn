import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PaymentStatusType, PaymentProviderType } from './payments.type';
import {
  CreateCheckoutSessionDto,
  CheckoutPlanType,
} from './dto/create-checkout-session.dto';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import {
  SubscriptionPlanType,
  SubscriptionStatusType,
} from '../subscriptions/subscriptions.type';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly configService: ConfigService,
  ) {
    const stripeApiKey = this.configService.get<string>('stripe.apiKey');
    if (stripeApiKey) {
      this.stripe = new Stripe(stripeApiKey, {
        apiVersion: '2026-01-28.clover',
      });
    }
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { user_id, subscription_id, ...paymentData } = createPaymentDto;

    const user = await this.usersRepository.findOne({
      where: { id: user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.subscriptionsRepository.findOne({
      where: { id: subscription_id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const existingPayment = await this.paymentsRepository.findOne({
      where: { transaction_id: paymentData.transaction_id },
    });

    if (existingPayment) {
      throw new ConflictException(
        'Payment with this transaction ID already exists',
      );
    }

    const payment = this.paymentsRepository.create(paymentData);

    payment.user = user;
    payment.subscription = subscription;

    return this.paymentsRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: ['user', 'subscription'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { user: { id: userId } },
      relations: ['user', 'subscription'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { subscription: { id: subscriptionId } },
      relations: ['user', 'subscription'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findByStatus(status: PaymentStatusType): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { status },
      relations: ['user', 'subscription'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['user', 'subscription'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { transaction_id: transactionId },
      relations: ['user', 'subscription'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['user', 'subscription'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      updatePaymentDto.user_id &&
      updatePaymentDto.user_id !== payment.user?.id
    ) {
      const user = await this.usersRepository.findOne({
        where: { id: updatePaymentDto.user_id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      payment.user = user;
      delete updatePaymentDto.user_id;
    }

    if (
      updatePaymentDto.subscription_id &&
      updatePaymentDto.subscription_id !== payment.subscription?.id
    ) {
      const subscription = await this.subscriptionsRepository.findOne({
        where: { id: updatePaymentDto.subscription_id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      payment.subscription = subscription;
      delete updatePaymentDto.subscription_id;
    }

    if (
      updatePaymentDto.transaction_id &&
      updatePaymentDto.transaction_id !== payment.transaction_id
    ) {
      const existingPayment = await this.paymentsRepository.findOne({
        where: { transaction_id: updatePaymentDto.transaction_id },
      });

      if (existingPayment && existingPayment.id !== id) {
        throw new ConflictException(
          'Payment with this transaction ID already exists',
        );
      }
    }

    const updatedPayment = Object.assign(payment, updatePaymentDto);

    return this.paymentsRepository.save(updatedPayment);
  }

  async updateStatus(id: string, status: PaymentStatusType): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = status;
    return this.paymentsRepository.save(payment);
  }

  async remove(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['user', 'subscription'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.paymentsRepository.delete(id);

    return payment;
  }

  // Stripe Integration Methods

  async createCheckoutSession(
    userId: string,
    createCheckoutDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get price ID based on plan
    const priceId =
      createCheckoutDto.plan === CheckoutPlanType.MONTHLY
        ? this.configService.get<string>('stripe.monthlyPriceId')
        : this.configService.get<string>('stripe.yearlyPriceId');

    if (!priceId) {
      throw new BadRequestException(
        `Price ID not configured for ${createCheckoutDto.plan} plan`,
      );
    }

    // Create Stripe Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url:
        createCheckoutDto.success_url ||
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        createCheckoutDto.cancel_url ||
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        plan: createCheckoutDto.plan,
      },
    });

    return {
      url: session.url || '',
      sessionId: session.id,
    };
  }

  async handleStripeWebhook(signature: string, rawBody: Buffer): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err.message}`,
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as CheckoutPlanType;

    if (!userId || !plan) {
      console.error('Missing metadata in checkout session');
      return;
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Create subscription
    const planType =
      plan === CheckoutPlanType.MONTHLY
        ? SubscriptionPlanType.MONTHLY
        : SubscriptionPlanType.YEARLY;
    const duration = plan === CheckoutPlanType.MONTHLY ? 30 : 365;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    const subscription = this.subscriptionsRepository.create({
      user: user,
      plan_name: planType,
      start_date: startDate,
      end_date: endDate,
      auto_renew: true,
      status: SubscriptionStatusType.ACTIVE,
    });

    const savedSubscription =
      await this.subscriptionsRepository.save(subscription);

    // Create payment record
    const payment = this.paymentsRepository.create({
      user: user,
      subscription: savedSubscription,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: (session.currency || 'usd').toUpperCase(),
      provider: PaymentProviderType.STRIPE,
      transaction_id: (session.payment_intent as string) || session.id,
      status: PaymentStatusType.COMPLETED,
    });

    await this.paymentsRepository.save(payment);
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    // Handle recurring payment success
    console.log('Invoice payment succeeded:', invoice.id);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    // Handle payment failure
    console.log('Invoice payment failed:', invoice.id);
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    // Handle subscription cancellation
    console.log('Subscription deleted:', subscription.id);
  }
}
