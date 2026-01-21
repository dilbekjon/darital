import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const buildings = await this.prisma.building.findMany({
      include: {
        units: {
          select: {
            id: true,
            name: true,
            status: true,
            price: true,
            floor: true,
          },
        },
        _count: {
          select: { units: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return buildings.map((building) => ({
      ...building,
      totalUnits: building._count.units,
      occupiedUnits: building.units.filter((u) => u.status === 'BUSY').length,
      freeUnits: building.units.filter((u) => u.status === 'FREE').length,
    }));
  }

  async findOne(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        units: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              include: { tenant: { select: { id: true, fullName: true } } },
              take: 1,
            },
          },
          orderBy: [{ floor: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return {
      ...building,
      stats: {
        totalUnits: building.units.length,
        occupied: building.units.filter((u) => u.status === 'BUSY').length,
        free: building.units.filter((u) => u.status === 'FREE').length,
        maintenance: building.units.filter((u) => u.status === 'MAINTENANCE').length,
      },
    };
  }

  async create(data: { name: string; address?: string; description?: string }) {
    return this.prisma.building.create({
      data: {
        name: data.name,
        address: data.address,
        description: data.description,
      },
    });
  }

  async update(id: string, data: { name?: string; address?: string; description?: string }) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.prisma.building.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: { _count: { select: { units: true } } },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    if (building._count.units > 0) {
      // Unlink units from building instead of deleting
      await this.prisma.unit.updateMany({
        where: { buildingId: id },
        data: { buildingId: null },
      });
    }

    return this.prisma.building.delete({ where: { id } });
  }

  async getStatistics() {
    const buildings = await this.prisma.building.findMany({
      include: {
        units: {
          select: { status: true, price: true },
        },
      },
    });

    const unassignedUnits = await this.prisma.unit.count({
      where: { buildingId: null },
    });

    return {
      totalBuildings: buildings.length,
      unassignedUnits,
      byBuilding: buildings.map((b) => ({
        id: b.id,
        name: b.name,
        totalUnits: b.units.length,
        occupied: b.units.filter((u) => u.status === 'BUSY').length,
        free: b.units.filter((u) => u.status === 'FREE').length,
        totalMonthlyRevenue: b.units
          .filter((u) => u.status === 'BUSY')
          .reduce((sum, u) => sum + Number(u.price), 0),
      })),
    };
  }
}
