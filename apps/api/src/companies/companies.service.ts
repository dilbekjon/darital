import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const companies = await this.prisma.company.findMany({
      include: {
        _count: {
          select: { units: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      description: company.description ?? null,
      unitsCount: company._count.units,
      createdAt: company.createdAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: {
          select: { units: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      id: company.id,
      name: company.name,
      description: company.description ?? null,
      unitsCount: company._count.units,
      createdAt: company.createdAt.toISOString(),
    };
  }

  async create(data: { name: string; description?: string }) {
    const company = await this.prisma.company.create({
      data: {
        name: data.name,
        description: data.description ?? null,
      },
    });

    return {
      id: company.id,
      name: company.name,
      description: company.description ?? null,
      unitsCount: 0,
      createdAt: company.createdAt.toISOString(),
    };
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const existing = await this.prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
      },
      include: {
        _count: { select: { units: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description ?? null,
      unitsCount: updated._count.units,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async remove(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { units: true } },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company._count.units > 0) {
      // Do not allow deleting companies that still have units assigned
      throw new ConflictException('Cannot delete company with assigned units. Please unassign units first.');
    }

    await this.prisma.company.delete({ where: { id } });

    return { success: true };
  }
}

