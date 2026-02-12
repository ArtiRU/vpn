import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Subscription } from './entities/subscription.entity';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription successfully created', type: Subscription })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiResponse({ status: 200, description: 'Return all subscriptions', type: [Subscription] })
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ status: 200, description: 'Subscription found', type: Subscription })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription by ID' })
  @ApiResponse({ status: 200, description: 'Subscription successfully updated', type: Subscription })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  update(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete subscription by ID' })
  @ApiResponse({ status: 200, description: 'Subscription successfully deleted', type: Subscription })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }
}
