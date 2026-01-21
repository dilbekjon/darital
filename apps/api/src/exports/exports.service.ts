import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Convert data to CSV format
  private toCSV(data: any[], columns: { key: string; header: string }[]): string {
    const headers = columns.map((c) => c.header).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          let value = row[c.key];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          // Escape quotes and wrap in quotes if contains comma
          value = String(value).replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
          return value;
        })
        .join(',')
    );
    return [headers, ...rows].join('\n');
  }

  // Export tenants to CSV
  async exportTenantsCSV(): Promise<string> {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { unit: true },
          take: 1,
        },
        balance: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return this.toCSV(
      tenants.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        phone: t.phone,
        email: t.email || '',
        unit: t.contracts[0]?.unit?.name || 'N/A',
        balance: t.balance?.current?.toString() || '0',
        createdAt: t.createdAt.toISOString(),
      })),
      [
        { key: 'id', header: 'ID' },
        { key: 'fullName', header: 'Full Name' },
        { key: 'phone', header: 'Phone' },
        { key: 'email', header: 'Email' },
        { key: 'unit', header: 'Active Unit' },
        { key: 'balance', header: 'Balance (UZS)' },
        { key: 'createdAt', header: 'Created At' },
      ]
    );
  }

  // Export contracts to CSV
  async exportContractsCSV(filters?: { status?: string }): Promise<string> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const contracts = await this.prisma.contract.findMany({
      where,
      include: {
        tenant: true,
        unit: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.toCSV(
      contracts.map((c) => ({
        id: c.id,
        tenant: c.tenant.fullName,
        unit: c.unit.name,
        amount: Number(c.amount).toString(),
        startDate: c.startDate.toISOString().split('T')[0],
        endDate: c.endDate.toISOString().split('T')[0],
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
      [
        { key: 'id', header: 'Contract ID' },
        { key: 'tenant', header: 'Tenant' },
        { key: 'unit', header: 'Unit' },
        { key: 'amount', header: 'Monthly Amount (UZS)' },
        { key: 'startDate', header: 'Start Date' },
        { key: 'endDate', header: 'End Date' },
        { key: 'status', header: 'Status' },
        { key: 'createdAt', header: 'Created At' },
      ]
    );
  }

  // Export invoices to CSV
  async exportInvoicesCSV(filters?: { status?: string; from?: Date; to?: Date }): Promise<string> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.dueDate = {};
      if (filters?.from) where.dueDate.gte = filters.from;
      if (filters?.to) where.dueDate.lte = filters.to;
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contract: {
          include: {
            tenant: true,
            unit: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    return this.toCSV(
      invoices.map((i) => ({
        id: i.id,
        tenant: i.contract.tenant.fullName,
        unit: i.contract.unit.name,
        amount: Number(i.amount).toString(),
        dueDate: i.dueDate.toISOString().split('T')[0],
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      })),
      [
        { key: 'id', header: 'Invoice ID' },
        { key: 'tenant', header: 'Tenant' },
        { key: 'unit', header: 'Unit' },
        { key: 'amount', header: 'Amount (UZS)' },
        { key: 'dueDate', header: 'Due Date' },
        { key: 'status', header: 'Status' },
        { key: 'createdAt', header: 'Created At' },
      ]
    );
  }

  // Export payments to CSV
  async exportPaymentsCSV(filters?: { status?: string; from?: Date; to?: Date }): Promise<string> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters?.from) where.createdAt.gte = filters.from;
      if (filters?.to) where.createdAt.lte = filters.to;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.toCSV(
      payments.map((p) => ({
        id: p.id,
        tenant: p.invoice.contract.tenant.fullName,
        unit: p.invoice.contract.unit.name,
        invoiceId: p.invoiceId,
        amount: Number(p.amount).toString(),
        method: p.method,
        provider: p.provider,
        status: p.status,
        paidAt: p.paidAt?.toISOString() || '',
        createdAt: p.createdAt.toISOString(),
      })),
      [
        { key: 'id', header: 'Payment ID' },
        { key: 'tenant', header: 'Tenant' },
        { key: 'unit', header: 'Unit' },
        { key: 'invoiceId', header: 'Invoice ID' },
        { key: 'amount', header: 'Amount (UZS)' },
        { key: 'method', header: 'Method' },
        { key: 'provider', header: 'Provider' },
        { key: 'status', header: 'Status' },
        { key: 'paidAt', header: 'Paid At' },
        { key: 'createdAt', header: 'Created At' },
      ]
    );
  }

  // Export units to CSV
  async exportUnitsCSV(): Promise<string> {
    const units = await this.prisma.unit.findMany({
      include: {
        building: true,
        contracts: {
          where: { status: 'ACTIVE' },
          include: { tenant: true },
          take: 1,
        },
      },
      orderBy: [{ building: { name: 'asc' } }, { name: 'asc' }],
    });

    return this.toCSV(
      units.map((u) => ({
        id: u.id,
        name: u.name,
        building: u.building?.name || 'N/A',
        floor: u.floor?.toString() || '',
        area: u.area?.toString() || '',
        price: Number(u.price).toString(),
        status: u.status,
        tenant: u.contracts[0]?.tenant?.fullName || '',
      })),
      [
        { key: 'id', header: 'Unit ID' },
        { key: 'name', header: 'Unit Name' },
        { key: 'building', header: 'Building' },
        { key: 'floor', header: 'Floor' },
        { key: 'area', header: 'Area (sq.m)' },
        { key: 'price', header: 'Price (UZS)' },
        { key: 'status', header: 'Status' },
        { key: 'tenant', header: 'Current Tenant' },
      ]
    );
  }
}
