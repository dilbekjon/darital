import { Body, Controller, Delete, Get, Patch, Param, Post, UseGuards, UseInterceptors, UsePipes, ValidationPipe, Query, ForbiddenException, NotFoundException, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { RecordOfflinePaymentDto } from './dto/record-offline-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentProviderEnum } from './dto/payment-intent.dto';
import { PrismaService } from '../prisma.service';
import { Request } from 'express';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Get payments (admin view) with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of payments' })
  async findAll(@Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Post()
  @Permissions('payments.record_offline')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Create payment (general)',
    description: 'Creates a payment record. For online payments, use payment intent flow instead.'
  })
  @ApiResponse({ status: 201, description: 'Payment created' })
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Post('offline')
  @Permissions('payments.record_offline')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Record offline cash payment (Payment Collector)',
    description: 'Records an offline cash payment received from tenant. Payment is immediately confirmed. Accessible by: PAYMENT_COLLECTOR, CASHIER, ADMIN, SUPER_ADMIN.'
  })
  @ApiResponse({ status: 201, description: 'Offline payment recorded and confirmed' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 409, description: 'Invoice already paid' })
  async recordOfflinePayment(
    @Body() dto: RecordOfflinePaymentDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.paymentsService.recordOfflinePayment(dto, user.id);
  }

  @Patch(':id')
  @Permissions('payments.approve')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Update payment status (Cashier only)',
    description: 'Update payment status for approval/cancellation. Accessible by: CASHIER, ADMIN, SUPER_ADMIN only.'
  })
  async update(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(id, dto);
  }

  @Patch(':id/verify/accept')
  @Permissions('payments.approve')
  @ApiOperation({ 
    summary: 'Accept and confirm payment (Cashier verification)',
    description: 'Verifies and approves a payment (online or offline). Only CASHIER, ADMIN, SUPER_ADMIN can approve payments.'
  })
  @ApiResponse({ status: 200, description: 'Payment verified and confirmed' })
  async acceptPayment(@Param('id') id: string) {
    return this.paymentsService.verifyPayment(id, true);
  }

  @Patch(':id/verify/decline')
  @Permissions('payments.approve')
  @ApiOperation({ 
    summary: 'Decline payment (Cashier verification)',
    description: 'Rejects a payment. Only CASHIER, ADMIN, SUPER_ADMIN can decline payments.'
  })
  @ApiResponse({ status: 200, description: 'Payment declined and cancelled' })
  async declinePayment(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.paymentsService.verifyPayment(id, false, body.reason);
  }

  @Patch(':id/capture')
  @Permissions('payments.capture_offline')
  @ApiOperation({ 
    summary: 'Mark offline payment as received (Cashier)',
    description: 'Cashier marks that cash has been received from Payment Collector. Accessible by: CASHIER, ADMIN, SUPER_ADMIN.'
  })
  @ApiResponse({ status: 200, description: 'Payment marked as cash received' })
  async captureOffline(@Param('id') id: string) {
    return this.paymentsService.verifyPayment(id, true);
  }

  @Delete(':id')
  @Permissions('payments.approve')
  @ApiOperation({ 
    summary: 'Delete payment (Admin only)',
    description: 'Delete a payment. Only PENDING or CANCELLED payments can be deleted. CONFIRMED payments cannot be deleted.'
  })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete confirmed payment' })
  async remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }

  @Public()
  @Post('webhook/:provider')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Webhook endpoint for payment providers (Click/Payme/Uzum)' })
  async webhook(@Param('provider') provider: string, @Body() dto: PaymentWebhookDto) {
    // TODO: verify provider signatures before processing
    const normalized = provider.toUpperCase() as PaymentProviderEnum;
    return this.paymentsService.handleWebhook(normalized, { ...dto, provider: normalized });
  }

  @Public()
  @Post('webhook-sim/:provider/:paymentId')
  @ApiOperation({ 
    summary: '[DEV ONLY] Simulate provider webhook callback',
    description: `Development helper to simulate payment provider webhooks. Only available when NODE_ENV !== production.
    
Example usage:
  curl -X POST http://localhost:3001/api/payments/webhook-sim/click/{paymentId}
  
Or use the test script:
  pnpm test:webhook`
  })
  @ApiResponse({ status: 200, description: 'Webhook simulated successfully' })
  @ApiResponse({ status: 403, description: 'Not available in production' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async simulateWebhook(
    @Param('provider') provider: string,
    @Param('paymentId') paymentId: string,
  ) {
    // Guard: only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Webhook simulation is not available in production');
    }

    // Find payment to get its amount
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const normalized = provider.toUpperCase() as PaymentProviderEnum;
    const amount = typeof payment.amount === 'object' && 'toNumber' in payment.amount
      ? payment.amount.toNumber()
      : Number(payment.amount);

    // Construct webhook DTO
    const webhookDto: PaymentWebhookDto = {
      paymentId,
      providerPaymentId: `sim-${paymentId}`,
      status: 'SUCCESS',
      amount,
      paidAt: new Date().toISOString(),
      provider: normalized,
      rawPayload: {
        simulated: true,
        provider: normalized,
        paymentId,
        timestamp: new Date().toISOString(),
      },
    };

    return this.paymentsService.handleWebhook(normalized, webhookDto);
  }
}


