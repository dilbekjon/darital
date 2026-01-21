import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get('payment/:paymentId')
  @ApiOperation({ summary: 'Get receipt data for a payment' })
  getReceiptData(@Param('paymentId') paymentId: string) {
    return this.receiptsService.generateReceiptData(paymentId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history with receipt numbers for current tenant' })
  getPaymentHistory(@Req() req: any) {
    const tenantId = req.user?.id || req.user?.sub;
    return this.receiptsService.getPaymentHistory(tenantId);
  }

  @Get('history/:tenantId')
  @ApiOperation({ summary: 'Get payment history for a specific tenant (admin)' })
  getPaymentHistoryAdmin(@Param('tenantId') tenantId: string) {
    return this.receiptsService.getPaymentHistory(tenantId);
  }

  @Get('chart-data')
  @ApiOperation({ summary: 'Get payment chart data for current tenant' })
  getChartData(@Req() req: any) {
    const tenantId = req.user?.id || req.user?.sub;
    return this.receiptsService.getPaymentChartData(tenantId);
  }

  @Get('chart-data/:tenantId')
  @ApiOperation({ summary: 'Get payment chart data for a specific tenant (admin)' })
  getChartDataAdmin(@Param('tenantId') tenantId: string) {
    return this.receiptsService.getPaymentChartData(tenantId);
  }
}
