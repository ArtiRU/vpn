import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { PaymentStatusType } from './payments.type';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment successfully created', type: Payment })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'User or Subscription not found' })
  @ApiResponse({ status: 409, description: 'Payment with this transaction ID already exists' })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Return all payments', type: [Payment] })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'subscriptionId', required: false, description: 'Filter by subscription ID' })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatusType, description: 'Filter by status' })
  findAll(
    @Query('userId') userId?: string,
    @Query('subscriptionId') subscriptionId?: string,
    @Query('status') status?: PaymentStatusType,
  ) {
    if (userId) {
      return this.paymentsService.findByUserId(userId);
    }
    if (subscriptionId) {
      return this.paymentsService.findBySubscriptionId(subscriptionId);
    }
    if (status) {
      return this.paymentsService.findByStatus(status);
    }
    return this.paymentsService.findAll();
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Get payment by transaction ID' })
  @ApiResponse({ status: 200, description: 'Payment found', type: Payment })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID from payment gateway' })
  findByTransactionId(@Param('transactionId') transactionId: string) {
    return this.paymentsService.findByTransactionId(transactionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment found', type: Payment })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment successfully updated', type: Payment })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 409, description: 'Payment with this transaction ID already exists' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiResponse({ status: 200, description: 'Payment status updated', type: Payment })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: PaymentStatusType,
  ) {
    return this.paymentsService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment successfully deleted', type: Payment })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
