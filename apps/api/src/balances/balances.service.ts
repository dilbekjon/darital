import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BalancesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.balance.findMany({ include: { tenant: true }, orderBy: { updatedAt: 'desc' } });
  }

  async findOne(tenantId: string) {
    const existing = await this.prisma.balance.findUnique({ where: { tenantId } });
    if (existing) return existing;
    return this.prisma.balance.create({ data: { tenantId, current: new Decimal(0) } });
  }

  async reset(tenantId: string, current?: string) {
    const value = new Decimal(current ?? 0);
    return this.prisma.balance.upsert({
      where: { tenantId },
      update: { current: value },
      create: { tenantId, current: value },
    });
  }
}


