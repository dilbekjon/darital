import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Permissions } from '../rbac/permissions.decorator';
import { CreateUtilityBillPaymentDto } from './dto/create-utility-bill-payment.dto';
import { ListUtilityBillsQueryDto } from './dto/list-utility-bills-query.dto';
import { UpdateUtilityBillDto } from './dto/update-utility-bill.dto';
import { UpsertUtilityReadingDto } from './dto/upsert-utility-reading.dto';
import { UtilityBillsService } from './utility-bills.service';

@ApiTags('utility-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('utility-bills')
export class UtilityBillsController {
  constructor(private readonly utilityBillsService: UtilityBillsService) {}

  @Get()
  @Permissions('utility.bills.read')
  @ApiOperation({ summary: 'List utility bills' })
  async findAll(@Query() query: ListUtilityBillsQueryDto) {
    return this.utilityBillsService.findAll(query);
  }

  @Post('readings/upsert')
  @Permissions('utility.bills.read')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create or update monthly utility meter reading' })
  async upsertReading(@Body() dto: UpsertUtilityReadingDto, @Req() req: any) {
    return this.utilityBillsService.upsertReading(dto, {
      id: req.user.id,
      role: req.user.role as AdminRole,
    });
  }

  @Patch(':id')
  @Permissions('utility.bills.read')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update utility bill readings/unit price/status' })
  async update(@Param('id') id: string, @Body() dto: UpdateUtilityBillDto, @Req() req: any) {
    return this.utilityBillsService.updateBill(id, dto, {
      id: req.user.id,
      role: req.user.role as AdminRole,
    });
  }

  @Post(':id/payments')
  @Permissions('utility.bills.payments.record')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Record a utility bill payment' })
  async createPayment(@Param('id') id: string, @Body() dto: CreateUtilityBillPaymentDto, @Req() req: any) {
    return this.utilityBillsService.createPayment(id, dto, {
      id: req.user.id,
      role: String(req.user.role),
    });
  }

  @Patch('payments/:paymentId/approve')
  @Permissions('utility.bills.payments.approve')
  @ApiOperation({ summary: 'Approve utility bill payment' })
  async approvePayment(@Param('paymentId') paymentId: string, @Req() req: any) {
    return this.utilityBillsService.approvePayment(paymentId, req.user.id);
  }

  @Patch('payments/:paymentId/decline')
  @Permissions('utility.bills.payments.approve')
  @ApiOperation({ summary: 'Decline utility bill payment' })
  async declinePayment(@Param('paymentId') paymentId: string, @Req() req: any) {
    return this.utilityBillsService.declinePayment(paymentId, req.user.id);
  }
}
