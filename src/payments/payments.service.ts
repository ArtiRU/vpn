import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { YooCheckout, ICreatePayment } from '@a2seven/yoo-checkout';
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
  private yooCheckout: YooCheckout;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly configService: ConfigService,
  ) {
    const shopId = this.configService.get<string>('yookassa.shopId');
    const secretKey = this.configService.get<string>('yookassa.secretKey');
    
    if (shopId && secretKey) {
      this.yooCheckout = new YooCheckout({
        shopId,
        secretKey,
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

  // YooKassa Integration Methods

  async createCheckoutSession(
    userId: string,
    createCheckoutDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    if (!this.yooCheckout) {
      throw new BadRequestException('YooKassa is not configured');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get price based on plan
    const amount =
      createCheckoutDto.plan === CheckoutPlanType.MONTHLY
        ? parseFloat(this.configService.get<string>('yookassa.monthlyPrice') || '500')
        : parseFloat(this.configService.get<string>('yookassa.yearlyPrice') || '5000');

    const currency = this.configService.get<string>('yookassa.currency') || 'RUB';

    // Create payment in YooKassa
    const idempotenceKey = `${userId}-${Date.now()}`;
    
    const createPayload: ICreatePayment = {
      amount: {
        value: amount.toFixed(2),
        currency: currency,
      },
      confirmation: {
        type: 'redirect',
        return_url:
          createCheckoutDto.return_url ||
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
      },
      capture: true,
      description: `Subscription ${createCheckoutDto.plan} plan for user ${user.email}`,
      metadata: {
        user_id: userId,
        plan: createCheckoutDto.plan,
        email: user.email,
      },
    };

    try {
      const payment = await this.yooCheckout.createPayment(
        createPayload,
        idempotenceKey,
      );

      // Create payment record in database with pending status
      await this.paymentsRepository.save(
        this.paymentsRepository.create({
          user: user,
          amount: amount,
          currency: currency,
          provider: PaymentProviderType.YOOKASSA,
          transaction_id: payment.id,
          status: PaymentStatusType.PENDING,
        }),
      );

      return {
        url: payment.confirmation?.confirmation_url || '',
        sessionId: payment.id,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to create payment: ${error.message}`,
      );
    }
  }

  async handleYooKassaWebhook(payload: any): Promise<void> {
    if (!this.yooCheckout) {
      throw new BadRequestException('YooKassa is not configured');
    }

    const event = payload.event;
    const paymentObject = payload.object;

    switch (event) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(paymentObject);
        break;
      case 'payment.waiting_for_capture':
        await this.handlePaymentWaitingForCapture(paymentObject);
        break;
      case 'payment.canceled':
        await this.handlePaymentCanceled(paymentObject);
        break;
      default:
        console.log(`Unhandled event type: ${event}`);
    }
  }

  private async handlePaymentSucceeded(paymentObject: any): Promise<void> {
    const paymentId = paymentObject.id;
    const metadata = paymentObject.metadata;

    if (!metadata?.user_id || !metadata?.plan) {
      console.error('Missing metadata in payment object');
      return;
    }

    const userId = metadata.user_id;
    const plan = metadata.plan as CheckoutPlanType;

    // Find and update payment record
    const payment = await this.paymentsRepository.findOne({
      where: { transaction_id: paymentId },
      relations: ['user'],
    });

    if (!payment) {
      console.error(`Payment not found: ${paymentId}`);
      return;
    }

    payment.status = PaymentStatusType.COMPLETED;
    await this.paymentsRepository.save(payment);

    // Create or extend subscription
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['subscriptions'],
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    const planType =
      plan === CheckoutPlanType.MONTHLY
        ? SubscriptionPlanType.MONTHLY
        : SubscriptionPlanType.YEARLY;
    const duration = plan === CheckoutPlanType.MONTHLY ? 30 : 365;

    // Check if user has an active subscription
    const activeSubscription = await this.subscriptionsRepository.findOne({
      where: {
        user: { id: userId },
        status: SubscriptionStatusType.ACTIVE,
      },
      order: {
        end_date: 'DESC',
      },
    });

    let startDate: Date;
    let endDate: Date;

    if (activeSubscription && activeSubscription.end_date > new Date()) {
      // Extend existing subscription
      startDate = activeSubscription.end_date;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      activeSubscription.end_date = endDate;
      await this.subscriptionsRepository.save(activeSubscription);

      // Update payment to link with existing subscription
      payment.subscription = activeSubscription;
      await this.paymentsRepository.save(payment);
    } else {
      // Create new subscription
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const subscription = this.subscriptionsRepository.create({
        user: user,
        plan_name: planType,
        start_date: startDate,
        end_date: endDate,
        auto_renew: false,
        status: SubscriptionStatusType.ACTIVE,
      });

      const savedSubscription =
        await this.subscriptionsRepository.save(subscription);

      // Update payment to link with new subscription
      payment.subscription = savedSubscription;
      await this.paymentsRepository.save(payment);
    }
  }

  private async handlePaymentWaitingForCapture(
    paymentObject: any,
  ): Promise<void> {
    const paymentId = paymentObject.id;

    const payment = await this.paymentsRepository.findOne({
      where: { transaction_id: paymentId },
    });

    if (payment) {
      payment.status = PaymentStatusType.WAITING_FOR_CAPTURE;
      await this.paymentsRepository.save(payment);
    }
  }

  private async handlePaymentCanceled(paymentObject: any): Promise<void> {
    const paymentId = paymentObject.id;

    const payment = await this.paymentsRepository.findOne({
      where: { transaction_id: paymentId },
    });

    if (payment) {
      payment.status = PaymentStatusType.CANCELED;
      await this.paymentsRepository.save(payment);
    }
  }

  // Get payment status from YooKassa
  async getPaymentStatus(paymentId: string): Promise<any> {
    if (!this.yooCheckout) {
      throw new BadRequestException('YooKassa is not configured');
    }

    try {
      return await this.yooCheckout.getPayment(paymentId);
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to get payment status: ${error.message}`,
      );
    }
  }
}
