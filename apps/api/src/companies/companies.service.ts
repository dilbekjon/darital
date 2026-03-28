import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private toCompanyResponse(company: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    _count: { units: number; tenants: number };
    tenants?: Array<{ id: string; fullName: string; phone: string; email: string | null }>;
  }) {
    return {
      id: company.id,
      name: company.name,
      description: company.description ?? null,
      unitsCount: company._count.units,
      tenantsCount: company._count.tenants,
      tenants: (company.tenants ?? []).map((tenant) => ({
        id: tenant.id,
        fullName: tenant.fullName,
        phone: tenant.phone,
        email: tenant.email ?? '',
      })),
      createdAt: company.createdAt.toISOString(),
    };
  }

  async findAll() {
    const companies = await this.prisma.company.findMany({
      include: {
        _count: {
          select: { units: true, tenants: true },
        },
        tenants: {
          select: { id: true, fullName: true, phone: true, email: true },
          orderBy: { fullName: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return companies.map((company) => this.toCompanyResponse(company));
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { units: true, tenants: true },
        },
        tenants: {
          select: { id: true, fullName: true, phone: true, email: true },
          orderBy: { fullName: 'asc' },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.toCompanyResponse(company);
  }

  async create(data: { name: string; description?: string; tenantIds?: string[] }) {
    const tenantIds = data.tenantIds ?? [];

    const company = await this.prisma.$transaction(async (tx) => {
      if (tenantIds.length > 0) {
        const tenantsCount = await tx.tenant.count({ where: { id: { in: tenantIds } } });
        if (tenantsCount !== tenantIds.length) {
          throw new NotFoundException('One or more tenants were not found');
        }
      }

      const created = await tx.company.create({
        data: {
          name: data.name,
          description: data.description ?? null,
        },
      });

      if (tenantIds.length > 0) {
        await tx.tenant.updateMany({
          where: { id: { in: tenantIds } },
          data: { companyId: created.id },
        });
      }

      return tx.company.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          _count: { select: { units: true, tenants: true } },
          tenants: {
            select: { id: true, fullName: true, phone: true, email: true },
            orderBy: { fullName: 'asc' },
          },
        },
      });
    });

    return this.toCompanyResponse(company);
  }

  async update(id: string, data: { name?: string; description?: string; tenantIds?: string[] }) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    const tenantIds = data.tenantIds ?? [];

    const updated = await this.prisma.$transaction(async (tx) => {
      if (data.tenantIds) {
        const tenantsCount = await tx.tenant.count({ where: { id: { in: tenantIds } } });
        if (tenantsCount !== tenantIds.length) {
          throw new NotFoundException('One or more tenants were not found');
        }

        await tx.tenant.updateMany({
          where: { companyId: id, id: { notIn: tenantIds } },
          data: { companyId: null },
        });

        if (tenantIds.length > 0) {
          await tx.tenant.updateMany({
            where: { id: { in: tenantIds } },
            data: { companyId: id },
          });
        }
      }

      await tx.company.update({
        where: { id },
        data: {
          name: data.name ?? existing.name,
          description: data.description ?? existing.description,
        },
      });

      return tx.company.findUniqueOrThrow({
        where: { id },
        include: {
          _count: { select: { units: true, tenants: true } },
          tenants: {
            select: { id: true, fullName: true, phone: true, email: true },
            orderBy: { fullName: 'asc' },
          },
        },
      });
    });

    return this.toCompanyResponse(updated);
  }

  async remove(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { units: true, tenants: true } },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company._count.units > 0) {
      throw new ConflictException('Cannot delete company with assigned units. Please unassign units first.');
    }

    if (company._count.tenants > 0) {
      throw new ConflictException('Cannot delete company with assigned tenants. Please remove tenants from the company first.');
    }

    await this.prisma.company.delete({ where: { id } });

    return { success: true };
  }
}
