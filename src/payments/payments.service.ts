import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PaymentStatusType } from './payments.type';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
  ) {}

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
      throw new ConflictException('Payment with this transaction ID already exists');
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

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['user', 'subscription'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (updatePaymentDto.user_id && updatePaymentDto.user_id !== payment.user?.id) {
      const user = await this.usersRepository.findOne({
        where: { id: updatePaymentDto.user_id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      payment.user = user;
      delete updatePaymentDto.user_id;
    }

    if (updatePaymentDto.subscription_id && updatePaymentDto.subscription_id !== payment.subscription?.id) {
      const subscription = await this.subscriptionsRepository.findOne({
        where: { id: updatePaymentDto.subscription_id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      payment.subscription = subscription;
      delete updatePaymentDto.subscription_id;
    }

    if (updatePaymentDto.transaction_id && updatePaymentDto.transaction_id !== payment.transaction_id) {
      const existingPayment = await this.paymentsRepository.findOne({
        where: { transaction_id: updatePaymentDto.transaction_id },
      });

      if (existingPayment && existingPayment.id !== id) {
        throw new ConflictException('Payment with this transaction ID already exists');
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
}
