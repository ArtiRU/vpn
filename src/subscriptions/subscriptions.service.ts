import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { SubscriptionStatusType } from './subscriptions.type';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    const { user_id, start_date, end_date, ...rest } = createSubscriptionDto;

    // Проверяем существование пользователя
    const user = await this.usersRepository.findOne({
      where: { id: user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const subscription = this.subscriptionsRepository.create({
      ...rest,
      user: user, // Устанавливаем объект user, а не user_id
      start_date: startDate,
      end_date: endDate,
    });

    return this.subscriptionsRepository.save(subscription);
  }

  async findAll(): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      relations: ['user'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Если обновляется user_id, проверяем существование пользователя и устанавливаем объект user
    if (updateSubscriptionDto.user_id && updateSubscriptionDto.user_id !== subscription.user?.id) {
      const user = await this.usersRepository.findOne({
        where: { id: updateSubscriptionDto.user_id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      subscription.user = user;
      delete updateSubscriptionDto.user_id; // Удаляем user_id из DTO, т.к. установили user
    }

    // Валидация дат
    const startDate = updateSubscriptionDto.start_date 
      ? new Date(updateSubscriptionDto.start_date)
      : subscription.start_date;
    const endDate = updateSubscriptionDto.end_date
      ? new Date(updateSubscriptionDto.end_date)
      : subscription.end_date;

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (updateSubscriptionDto.start_date) {
      updateSubscriptionDto.start_date = startDate;
    }
    if (updateSubscriptionDto.end_date) {
      updateSubscriptionDto.end_date = endDate;
    }

    const updatedSubscription = Object.assign(subscription, updateSubscriptionDto);

    return this.subscriptionsRepository.save(updatedSubscription);
  }

  async remove(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.subscriptionsRepository.delete(id);

    return subscription;
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const now = new Date();
    return this.subscriptionsRepository.findOne({
      where: {
        user: { id: userId },
        status: SubscriptionStatusType.ACTIVE,
      },
      relations: ['user'],
      order: {
        end_date: 'DESC',
      },
    });
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.findActiveByUserId(userId);
    if (!subscription) {
      return false;
    }
    const now = new Date();
    return subscription.end_date > now && subscription.start_date <= now;
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.subscriptionsRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: {
        created_at: 'DESC',
      },
    });
  }
}
