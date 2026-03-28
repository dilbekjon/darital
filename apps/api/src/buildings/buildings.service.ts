import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BuildingsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeFloorsCount(floorsCount?: number | null): number {
    const normalized = Number(floorsCount ?? 1);
    return Number.isFinite(normalized) && normalized >= 1 ? Math.floor(normalized) : 1;
  }

  private normalizeOccupiedFloors(input?: number[] | null, fallbackFloor?: number | null): number[] {
    const raw = (input && input.length ? input : fallbackFloor ? [fallbackFloor] : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1);

    return [...new Set(raw)].sort((a, b) => a - b);
  }

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
            occupiedFloors: true,
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

    const mapUnit = (u: (typeof building.units)[0]) => ({
      ...u,
      price: typeof u.price === 'object' && u.price !== null && 'toNumber' in u.price ? (u.price as Decimal).toNumber() : Number(u.price),
      occupiedFloors: this.normalizeOccupiedFloors(u.occupiedFloors, u.floor),
    });

    const unitsByFloor: Record<number, ReturnType<typeof mapUnit>[]> = {};
    for (const u of building.units) {
      const mapped = mapUnit(u);
      const floors = mapped.occupiedFloors.length ? mapped.occupiedFloors : [mapped.floor ?? 1];
      for (const floor of floors) {
        if (!unitsByFloor[floor]) unitsByFloor[floor] = [];
        unitsByFloor[floor].push(mapped);
      }
    }

    return {
      ...building,
      units: building.units.map(mapUnit),
      unitsByFloor,
      stats: {
        totalUnits: building.units.length,
        occupied: building.units.filter((u) => u.status === 'BUSY').length,
        free: building.units.filter((u) => u.status === 'FREE').length,
        maintenance: building.units.filter((u) => u.status === 'MAINTENANCE').length,
      },
    };
  }

  async create(data: {
    name: string;
    address?: string;
    description?: string;
    areaType?: 'OPEN_AREA' | 'BUILDING';
    floorsCount?: number;
  }) {
    return this.prisma.building.create({
      data: {
        name: data.name,
        address: data.address,
        description: data.description,
        areaType: data.areaType ?? 'BUILDING',
        floorsCount: this.normalizeFloorsCount(data.floorsCount),
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      address?: string;
      description?: string;
      areaType?: 'OPEN_AREA' | 'BUILDING';
      floorsCount?: number;
    },
  ) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.prisma.building.update({
      where: { id },
      data: {
        ...data,
        floorsCount: data.floorsCount === undefined ? undefined : this.normalizeFloorsCount(data.floorsCount),
      },
    });
  }

  async bulkCreateUnits(
    buildingId: string,
    payload: { units: Array<{ name: string; area?: number; occupiedFloors?: number[] }> },
  ) {
    const building = await this.prisma.building.findUnique({ where: { id: buildingId } });
    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const created = await this.prisma.$transaction(
      payload.units.map((u) =>
        {
          const occupiedFloors = this.normalizeOccupiedFloors(u.occupiedFloors);
          return this.prisma.unit.create({
            data: {
              name: u.name,
              price: new Decimal(0),
              area: u.area ?? null,
              floor: occupiedFloors[0] ?? null,
              occupiedFloors,
              buildingId,
            },
          });
        }
      ),
    );

    const newTotal = (building.totalUnits ?? 0) + created.length;
    await this.prisma.building.update({
      where: { id: buildingId },
      data: { totalUnits: newTotal },
    });

    return created;
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
