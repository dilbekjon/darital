import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AdminRole,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  Prisma,
  UtilityBillStatus,
  UtilityPaymentWorkflowStatus,
  UtilityType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { CreateUtilityBillPaymentDto } from './dto/create-utility-bill-payment.dto';
import { ListUtilityBillsQueryDto } from './dto/list-utility-bills-query.dto';
import { UpdateUtilityBillDto } from './dto/update-utility-bill.dto';
import { UpsertUtilityReadingDto } from './dto/upsert-utility-reading.dto';
import { UpdateUtilityTariffDto } from './dto/update-utility-tariff.dto';

@Injectable()
export class UtilityBillsService {
  constructor(private readonly prisma: PrismaService) {}

  private endOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  }

  private parseMonth(month: string): Date {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m || m < 1 || m > 12) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }
    return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  }

  private decimal(value: string | number | Decimal | null | undefined, fallback = '0'): Decimal {
    if (value === null || value === undefined || value === '') return new Decimal(fallback);
    return new Decimal(value);
  }

  private normalizeReadingFields(startReading: Decimal | null, endReading: Decimal | null, unitPrice: Decimal) {
    if (startReading && endReading && endReading.lessThan(startReading)) {
      throw new BadRequestException('endReading must be greater than or equal to startReading');
    }
    const consumption = startReading && endReading ? endReading.minus(startReading) : new Decimal(0);
    const amount = consumption.mul(unitPrice);
    return { consumption, amount };
  }

  private validateSource(source: PaymentSource) {
    if (source !== PaymentSource.BANK && source !== PaymentSource.CASH) {
      throw new BadRequestException('Only BANK or CASH source is allowed for utility bill payments');
    }
  }

  private canManageType(role: AdminRole, type: UtilityType): boolean {
    if (role === AdminRole.SUPER_ADMIN || role === AdminRole.ADMIN) return true;
    if (role === AdminRole.PAYMENT_COLLECTOR) return true;
    if (role === AdminRole.WATER_OPERATOR && type === UtilityType.WATER) return true;
    if (role === AdminRole.ELECTRICITY_OPERATOR && type === UtilityType.ELECTRICITY) return true;
    if (role === AdminRole.GAS_OPERATOR && type === UtilityType.GAS) return true;
    return false;
  }

  private canCollectType(role: string, type: UtilityType): boolean {
    if (role === AdminRole.SUPER_ADMIN || role === AdminRole.ADMIN || role === AdminRole.CASHIER) return true;
    if (role === AdminRole.PAYMENT_COLLECTOR) return true;
    if (role === AdminRole.WATER_COLLECTOR && type === UtilityType.WATER) return true;
    if (role === AdminRole.ELECTRICITY_COLLECTOR && type === UtilityType.ELECTRICITY) return true;
    if (role === AdminRole.GAS_COLLECTOR && type === UtilityType.GAS) return true;
    return false;
  }

  private getTenantUtilityEnabled(tenant: {
    utilityElectricityEnabled?: boolean | null;
    utilityGasEnabled?: boolean | null;
    utilityWaterEnabled?: boolean | null;
  }, type: UtilityType): boolean {
    if (type === UtilityType.ELECTRICITY) return Boolean(tenant.utilityElectricityEnabled);
    if (type === UtilityType.GAS) return Boolean(tenant.utilityGasEnabled);
    return Boolean(tenant.utilityWaterEnabled);
  }

  private async resolveTariff(type: UtilityType): Promise<Decimal> {
    const config = await this.prisma.utilityTariffConfig.findUnique({ where: { id: 'default' } });
    if (!config) return new Decimal(0);
    if (type === UtilityType.ELECTRICITY) return this.decimal(config.electricityPerKwh);
    if (type === UtilityType.GAS) return this.decimal(config.gasPerM3);
    return this.decimal(config.waterPerM3);
  }

  private canApprove(role: string): boolean {
    return role === AdminRole.SUPER_ADMIN || role === AdminRole.ADMIN || role === AdminRole.CASHIER;
  }

  private deriveStatus(amount: Decimal, paidAmount: Decimal, currentStatus?: UtilityBillStatus): UtilityBillStatus {
    if (currentStatus === UtilityBillStatus.CANCELLED) return UtilityBillStatus.CANCELLED;
    if (amount.lessThanOrEqualTo(0)) return UtilityBillStatus.DRAFT;
    if (paidAmount.greaterThanOrEqualTo(amount)) return UtilityBillStatus.PAID;
    if (paidAmount.greaterThan(0)) return UtilityBillStatus.PARTIALLY_PAID;
    return UtilityBillStatus.PENDING;
  }

  private mapBill(bill: any) {
    return {
      id: bill.id,
      tenantId: bill.tenantId,
      tenantName: bill.tenant?.fullName || null,
      unitName: bill.unit?.name || bill.tenant?.contracts?.[0]?.unit?.name || null,
      type: bill.type,
      month: new Date(bill.billingMonth).toISOString().slice(0, 7),
      startReading: bill.startReading ? Number(bill.startReading) : null,
      endReading: bill.endReading ? Number(bill.endReading) : null,
      consumption: Number(bill.consumption ?? 0),
      unitPrice: Number(bill.unitPrice ?? 0),
      amount: Number(bill.amount ?? 0),
      paidAmount: Number(bill.paidAmount ?? 0),
      remainingAmount: Math.max(0, Number(bill.amount ?? 0) - Number(bill.paidAmount ?? 0)),
      status: bill.status,
      note: bill.note || null,
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
      payments: (bill.payments || []).map((payment: any) => ({
        id: payment.id,
        utilityType: payment.utilityType ?? bill.type,
        source: payment.source,
        method: payment.method,
        amount: Number(payment.amount ?? 0),
        status: payment.status,
        workflowStatus: payment.workflowStatus,
        tenantDeclaredAmount: payment.tenantDeclaredAmount ? Number(payment.tenantDeclaredAmount) : null,
        collectorConfirmedAmount: payment.collectorConfirmedAmount ? Number(payment.collectorConfirmedAmount) : null,
        collectorId: payment.collectorId ?? null,
        tenantDeclaredAt: payment.tenantDeclaredAt ?? null,
        collectorConfirmedAt: payment.collectorConfirmedAt ?? null,
        collectorHandoverAt: payment.collectorHandoverAt ?? null,
        handoverDueAt: payment.handoverDueAt ?? null,
        handoverOverdue:
          payment.source === PaymentSource.CASH &&
          payment.status === PaymentStatus.PENDING &&
          payment.workflowStatus === UtilityPaymentWorkflowStatus.COLLECTOR_CONFIRMED &&
          payment.handoverDueAt &&
          new Date(payment.handoverDueAt).getTime() < Date.now(),
        note: payment.note || null,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt || null,
      })),
    };
  }

  async findAll(query: ListUtilityBillsQueryDto, actor?: { id: string; role: string }) {
    const where: Prisma.UtilityBillWhereInput = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.month) where.billingMonth = this.parseMonth(query.month);
    if (actor?.role === AdminRole.WATER_OPERATOR || actor?.role === AdminRole.WATER_COLLECTOR) {
      where.type = UtilityType.WATER;
    }
    if (actor?.role === AdminRole.ELECTRICITY_OPERATOR || actor?.role === AdminRole.ELECTRICITY_COLLECTOR) {
      where.type = UtilityType.ELECTRICITY;
    }
    if (actor?.role === AdminRole.GAS_OPERATOR || actor?.role === AdminRole.GAS_COLLECTOR) {
      where.type = UtilityType.GAS;
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { tenant: { fullName: { contains: q, mode: 'insensitive' } } },
        { tenant: { phone: { contains: q, mode: 'insensitive' } } },
        { tenant: { email: { contains: q, mode: 'insensitive' } } },
        { unit: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const bills = await this.prisma.utilityBill.findMany({
      where,
      include: {
        tenant: { select: { id: true, fullName: true, phone: true, email: true } },
        unit: { select: { id: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ billingMonth: 'desc' }, { createdAt: 'desc' }],
    });

    return bills.map((bill) => this.mapBill(bill));
  }

  async upsertReading(dto: UpsertUtilityReadingDto, actor: { id: string; role: AdminRole }) {
    if (!this.canManageType(actor.role, dto.type)) {
      throw new ForbiddenException('You cannot manage this utility type');
    }

    const billingMonth = this.parseMonth(dto.month);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      select: {
        id: true,
        utilityElectricityEnabled: true,
        utilityGasEnabled: true,
        utilityWaterEnabled: true,
        contracts: {
          where: { status: 'ACTIVE' },
          include: { unit: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!this.getTenantUtilityEnabled(tenant, dto.type)) {
      throw new BadRequestException('This utility type is not enabled for the tenant');
    }

    const previousBill = await this.prisma.utilityBill.findFirst({
      where: {
        tenantId: dto.tenantId,
        type: dto.type,
        billingMonth: { lt: billingMonth },
      },
      orderBy: { billingMonth: 'desc' },
      select: { endReading: true },
    });

    const startReading = dto.startReading
      ? this.decimal(dto.startReading)
      : previousBill?.endReading
        ? this.decimal(previousBill.endReading)
        : null;
    const endReading = dto.endReading ? this.decimal(dto.endReading) : null;
    const unitPrice = dto.unitPrice ? this.decimal(dto.unitPrice) : await this.resolveTariff(dto.type);
    const { consumption, amount } = this.normalizeReadingFields(startReading, endReading, unitPrice);

    const existing = await this.prisma.utilityBill.findUnique({
      where: {
        tenantId_type_billingMonth: {
          tenantId: dto.tenantId,
          type: dto.type,
          billingMonth,
        },
      },
    });

    const paidAmount = existing?.paidAmount ?? new Decimal(0);
    const targetStatus = this.deriveStatus(amount, paidAmount, existing?.status);
    const activeUnitId = tenant.contracts[0]?.unitId || null;

    const bill = existing
      ? await this.prisma.utilityBill.update({
          where: { id: existing.id },
          data: {
            unitId: activeUnitId,
            startReading,
            endReading,
            unitPrice,
            consumption,
            amount,
            status: targetStatus,
            note: dto.note ?? existing.note,
            updatedBy: actor.id,
          },
          include: {
            tenant: { select: { id: true, fullName: true } },
            unit: { select: { id: true, name: true } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        })
      : await this.prisma.utilityBill.create({
          data: {
            tenantId: dto.tenantId,
            unitId: activeUnitId,
            type: dto.type,
            billingMonth,
            startReading,
            endReading,
            unitPrice,
            consumption,
            amount,
            status: targetStatus,
            note: dto.note,
            createdBy: actor.id,
            updatedBy: actor.id,
          },
          include: {
            tenant: { select: { id: true, fullName: true } },
            unit: { select: { id: true, name: true } },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        });

    return this.mapBill(bill);
  }

  async updateBill(id: string, dto: UpdateUtilityBillDto, actor: { id: string; role: AdminRole }) {
    const bill = await this.prisma.utilityBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Utility bill not found');
    if (!this.canManageType(actor.role, bill.type)) {
      throw new ForbiddenException('You cannot update this utility type');
    }

    const startReading = dto.startReading !== undefined ? this.decimal(dto.startReading) : bill.startReading;
    const endReading = dto.endReading !== undefined ? this.decimal(dto.endReading) : bill.endReading;
    const unitPrice = dto.unitPrice !== undefined ? this.decimal(dto.unitPrice) : bill.unitPrice;
    const { consumption, amount } = this.normalizeReadingFields(startReading, endReading, unitPrice);
    const paidAmount = bill.paidAmount ?? new Decimal(0);
    const status = dto.status ?? this.deriveStatus(amount, paidAmount, bill.status);

    const updated = await this.prisma.utilityBill.update({
      where: { id },
      data: {
        startReading,
        endReading,
        unitPrice,
        consumption,
        amount,
        status,
        note: dto.note !== undefined ? dto.note : bill.note,
        updatedBy: actor.id,
      },
      include: {
        tenant: { select: { id: true, fullName: true } },
        unit: { select: { id: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    return this.mapBill(updated);
  }

  async createPayment(utilityBillId: string, dto: CreateUtilityBillPaymentDto, actor: { id: string; role: string }) {
    this.validateSource(dto.source);
    const bill = await this.prisma.utilityBill.findUnique({ where: { id: utilityBillId } });
    if (!bill) throw new NotFoundException('Utility bill not found');
    if (bill.status === UtilityBillStatus.CANCELLED) {
      throw new BadRequestException('Cancelled utility bill cannot be paid');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: bill.tenantId },
      select: {
        id: true,
        utilityElectricityEnabled: true,
        utilityGasEnabled: true,
        utilityWaterEnabled: true,
      },
    });
    if (!tenant || !this.getTenantUtilityEnabled(tenant, bill.type)) {
      throw new BadRequestException('This utility type is not enabled for the tenant');
    }

    const remaining = this.decimal(bill.amount).minus(this.decimal(bill.paidAmount));
    if (remaining.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Utility bill is already fully paid');
    }

    const amount = dto.amount ? this.decimal(dto.amount) : remaining;
    if (amount.lessThanOrEqualTo(0)) throw new BadRequestException('Payment amount must be greater than 0');
    if (amount.greaterThan(remaining)) throw new BadRequestException('Payment amount cannot exceed remaining amount');

    if (dto.source === PaymentSource.BANK && actor.role === AdminRole.PAYMENT_COLLECTOR) {
      throw new ForbiddenException('Collector can only create CASH utility payments');
    }
    if (dto.source === PaymentSource.CASH && actor.role !== 'TENANT_USER' && !this.canCollectType(actor.role, bill.type)) {
      throw new ForbiddenException('You cannot record cash payments for this utility type');
    }

    const now = new Date();
    const isTenantActor = actor.role === 'TENANT_USER';
    const workflowStatus = UtilityPaymentWorkflowStatus.TENANT_SUBMITTED;
    const collectorId = !isTenantActor && dto.source === PaymentSource.CASH ? actor.id : null;
    const collectorConfirmedAt = collectorId ? now : null;
    const handoverDueAt = collectorId ? this.endOfUtcDay(now) : null;

    const payment = await this.prisma.utilityBillPayment.create({
      data: {
        utilityBillId,
        utilityType: bill.type,
        method: PaymentMethod.OFFLINE,
        source: dto.source,
        amount,
        status: PaymentStatus.PENDING,
        workflowStatus,
        tenantDeclaredAt: now,
        tenantDeclaredAmount: amount,
        collectorId,
        collectorConfirmedAt,
        collectorConfirmedAmount: collectorId ? amount : null,
        handoverDueAt,
        createdBy: actor.id,
        createdByRole: actor.role,
        note: dto.note,
      },
    });
    return {
      id: payment.id,
      utilityBillId: payment.utilityBillId,
      amount: Number(payment.amount),
      status: payment.status,
      workflowStatus: payment.workflowStatus,
      source: payment.source,
      createdAt: payment.createdAt,
    };
  }

  async collectorConfirm(paymentId: string, actor: { id: string; role: string }, amount?: string, note?: string) {
    const payment = await this.prisma.utilityBillPayment.findUnique({
      where: { id: paymentId },
      include: { utilityBill: true },
    });
    if (!payment) throw new NotFoundException('Utility payment not found');
    if (payment.source !== PaymentSource.CASH) throw new BadRequestException('Only CASH payments require collector confirmation');
    if (!this.canCollectType(actor.role, payment.utilityType)) {
      throw new ForbiddenException('You cannot confirm this utility payment');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending utility payment can be confirmed by collector');
    }
    if (
      payment.workflowStatus !== UtilityPaymentWorkflowStatus.TENANT_SUBMITTED &&
      payment.workflowStatus !== UtilityPaymentWorkflowStatus.COLLECTOR_CONFIRMED
    ) {
      throw new BadRequestException('Payment is not in collector confirmation stage');
    }

    const now = new Date();
    const confirmedAmount = amount ? this.decimal(amount) : this.decimal(payment.tenantDeclaredAmount ?? payment.amount);
    if (confirmedAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Collector confirmed amount must be greater than 0');
    }

    const updated = await this.prisma.utilityBillPayment.update({
      where: { id: paymentId },
      data: {
        collectorId: actor.id,
        collectorConfirmedAt: now,
        collectorConfirmedAmount: confirmedAmount,
        workflowStatus: UtilityPaymentWorkflowStatus.COLLECTOR_CONFIRMED,
        handoverDueAt: this.endOfUtcDay(now),
        note: note ?? payment.note,
      },
    });

    return {
      id: updated.id,
      workflowStatus: updated.workflowStatus,
      collectorConfirmedAt: updated.collectorConfirmedAt,
      handoverDueAt: updated.handoverDueAt,
    };
  }

  async collectorHandover(paymentId: string, actor: { id: string; role: string }, note?: string) {
    const payment = await this.prisma.utilityBillPayment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Utility payment not found');
    if (payment.source !== PaymentSource.CASH) throw new BadRequestException('Only CASH payments require handover');
    if (!this.canCollectType(actor.role, payment.utilityType)) {
      throw new ForbiddenException('You cannot handover this utility payment');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending utility payment can be handed over');
    }
    if (payment.workflowStatus !== UtilityPaymentWorkflowStatus.COLLECTOR_CONFIRMED) {
      throw new BadRequestException('Collector must confirm receipt before handover');
    }
    if (payment.collectorId && payment.collectorId !== actor.id && !this.canApprove(actor.role)) {
      throw new ForbiddenException('Only the same collector can confirm handover');
    }

    const updated = await this.prisma.utilityBillPayment.update({
      where: { id: paymentId },
      data: {
        collectorHandoverAt: new Date(),
        workflowStatus: UtilityPaymentWorkflowStatus.HANDED_TO_CASHIER,
        note: note ?? payment.note,
      },
    });

    return {
      id: updated.id,
      workflowStatus: updated.workflowStatus,
      collectorHandoverAt: updated.collectorHandoverAt,
    };
  }

  async approvePayment(paymentId: string, actor: { id: string; role: string }) {
    const payment = await this.prisma.utilityBillPayment.findUnique({
      where: { id: paymentId },
      include: { utilityBill: true },
    });
    if (!payment) throw new NotFoundException('Utility payment not found');
    if (!this.canApprove(actor.role)) {
      throw new ForbiddenException('Only cashier/admin can approve utility payments');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending utility payment can be approved');
    }
    if (
      payment.source === PaymentSource.CASH &&
      payment.workflowStatus !== UtilityPaymentWorkflowStatus.HANDED_TO_CASHIER
    ) {
      throw new BadRequestException('Cash payment must be handed to cashier before approval');
    }
    if (
      payment.source === PaymentSource.BANK &&
      payment.workflowStatus !== UtilityPaymentWorkflowStatus.TENANT_SUBMITTED
    ) {
      throw new BadRequestException('Bank payment must be in pending cashier confirmation stage');
    }

    const bill = await this.prisma.$transaction(async (tx) => {
      await tx.utilityBillPayment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CONFIRMED,
          workflowStatus: UtilityPaymentWorkflowStatus.CASHIER_CONFIRMED,
          confirmedBy: actor.id,
          confirmedAt: new Date(),
        },
      });

      const current = await tx.utilityBill.findUniqueOrThrow({ where: { id: payment.utilityBillId } });
      const paidAmount = this.decimal(current.paidAmount).plus(payment.amount);
      const amount = this.decimal(current.amount);
      const status = this.deriveStatus(amount, paidAmount, current.status);

      return tx.utilityBill.update({
        where: { id: current.id },
        data: {
          paidAmount,
          status,
          updatedBy: actor.id,
        },
        include: {
          tenant: { select: { id: true, fullName: true } },
          unit: { select: { id: true, name: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      });
    });

    return this.mapBill(bill);
  }

  async declinePayment(paymentId: string, actor: { id: string; role: string }) {
    const payment = await this.prisma.utilityBillPayment.findUnique({
      where: { id: paymentId },
      include: { utilityBill: true },
    });
    if (!payment) throw new NotFoundException('Utility payment not found');
    if (!this.canApprove(actor.role)) {
      throw new ForbiddenException('Only cashier/admin can decline utility payments');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending utility payment can be declined');
    }

    await this.prisma.utilityBillPayment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CANCELLED,
        workflowStatus: UtilityPaymentWorkflowStatus.REJECTED,
        confirmedBy: actor.id,
        confirmedAt: new Date(),
      },
    });

    return { success: true };
  }

  async getTenantBills(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        utilityElectricityEnabled: true,
        utilityGasEnabled: true,
        utilityWaterEnabled: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const enabledTypes: UtilityType[] = [];
    if (tenant.utilityWaterEnabled) enabledTypes.push(UtilityType.WATER);
    if (tenant.utilityElectricityEnabled) enabledTypes.push(UtilityType.ELECTRICITY);
    if (tenant.utilityGasEnabled) enabledTypes.push(UtilityType.GAS);

    const bills = await this.prisma.utilityBill.findMany({
      where: { tenantId, type: { in: enabledTypes } },
      include: {
        unit: { select: { id: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ billingMonth: 'desc' }, { createdAt: 'desc' }],
    });
    return bills.map((bill) => this.mapBill(bill));
  }

  async tenantCreatePayment(tenantId: string, utilityBillId: string, dto: CreateUtilityBillPaymentDto) {
    const bill = await this.prisma.utilityBill.findUnique({ where: { id: utilityBillId } });
    if (!bill || bill.tenantId !== tenantId) {
      throw new NotFoundException('Utility bill not found');
    }
    return this.createPayment(utilityBillId, dto, { id: tenantId, role: 'TENANT_USER' });
  }

  async getTariffs() {
    const config = await this.prisma.utilityTariffConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
    return {
      electricityPerKwh: Number(config.electricityPerKwh ?? 0),
      gasPerM3: Number(config.gasPerM3 ?? 0),
      waterPerM3: Number(config.waterPerM3 ?? 0),
      updatedAt: config.updatedAt,
    };
  }

  async updateTariffs(dto: UpdateUtilityTariffDto, actor: { id: string; role: string }) {
    if (!(actor.role === AdminRole.SUPER_ADMIN || actor.role === AdminRole.ADMIN)) {
      throw new ForbiddenException('Only superadmin/admin can update utility tariffs');
    }
    const updated = await this.prisma.utilityTariffConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        electricityPerKwh: dto.electricityPerKwh ? this.decimal(dto.electricityPerKwh) : new Decimal(0),
        gasPerM3: dto.gasPerM3 ? this.decimal(dto.gasPerM3) : new Decimal(0),
        waterPerM3: dto.waterPerM3 ? this.decimal(dto.waterPerM3) : new Decimal(0),
        updatedBy: actor.id,
      },
      update: {
        electricityPerKwh: dto.electricityPerKwh !== undefined ? this.decimal(dto.electricityPerKwh) : undefined,
        gasPerM3: dto.gasPerM3 !== undefined ? this.decimal(dto.gasPerM3) : undefined,
        waterPerM3: dto.waterPerM3 !== undefined ? this.decimal(dto.waterPerM3) : undefined,
        updatedBy: actor.id,
      },
    });
    return {
      electricityPerKwh: Number(updated.electricityPerKwh ?? 0),
      gasPerM3: Number(updated.gasPerM3 ?? 0),
      waterPerM3: Number(updated.waterPerM3 ?? 0),
      updatedAt: updated.updatedAt,
    };
  }
}
