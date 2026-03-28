import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeOccupiedFloors(input?: number[] | null, fallbackFloor?: number | null): number[] {
    const raw = (input && input.length ? input : fallbackFloor ? [fallbackFloor] : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1);

    return [...new Set(raw)].sort((a, b) => a - b);
  }

  private mapUnit(unit: any) {
    const occupiedFloors = this.normalizeOccupiedFloors(unit.occupiedFloors, unit.floor);
    return {
      id: unit.id,
      name: unit.name,
      price: unit.price.toNumber(),
      area: unit.area,
      floor: unit.floor,
      occupiedFloors,
      status: unit.status,
      buildingId: unit.buildingId,
      building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
      companyId: unit.companyId,
      company: unit.company ? { id: unit.company.id, name: unit.company.name } : null,
      createdAt: unit.createdAt.toISOString(),
      isArchived: unit.isArchived,
      archivedAt: unit.archivedAt?.toISOString() ?? null,
      archivedBy: unit.archivedBy ?? null,
      archiveReason: unit.archiveReason ?? null,
    };
  }

  async findAll(includeArchived = false) {
    const units = await this.prisma.unit.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return units.map((unit) => this.mapUnit(unit));
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // Return in same format as findAll for consistency
    return this.mapUnit(unit);
  }

  async create(createUnitDto: CreateUnitDto) {
    const occupiedFloors = this.normalizeOccupiedFloors(createUnitDto.occupiedFloors, createUnitDto.floor);
    const unit = await this.prisma.unit.create({
      data: {
        name: createUnitDto.name,
        price: new Decimal(createUnitDto.price ?? 0),
        area: createUnitDto.area,
        floor: occupiedFloors[0] ?? null,
        occupiedFloors,
        buildingId: createUnitDto.buildingId || null,
        companyId: createUnitDto.companyId || null,
      },
    });

    // Fetch the created unit with building relation
    const createdUnit = await this.prisma.unit.findUnique({
      where: { id: unit.id },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Return in same format as findAll for consistency
    return this.mapUnit(createdUnit!);
  }

  async update(id: string, updateUnitDto: UpdateUnitDto) {
    await this.findOne(id); // Check if exists

    const data: any = { ...updateUnitDto };
    if (updateUnitDto.occupiedFloors !== undefined || updateUnitDto.floor !== undefined) {
      const occupiedFloors = this.normalizeOccupiedFloors(updateUnitDto.occupiedFloors, updateUnitDto.floor);
      data.occupiedFloors = occupiedFloors;
      data.floor = occupiedFloors[0] ?? null;
    }
    if (updateUnitDto.price !== undefined) {
      data.price = new Decimal(updateUnitDto.price);
    }
    // Handle buildingId: if explicitly set to null, unlink the unit
    if (updateUnitDto.buildingId === null || updateUnitDto.buildingId === '') {
      data.buildingId = null;
    }
    // Handle companyId: if explicitly set to null/empty, mark as individual
    if (updateUnitDto.companyId === null || updateUnitDto.companyId === '') {
      data.companyId = null;
    }

    const unit = await this.prisma.unit.update({
      where: { id },
      data,
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Return in same format as findAll for consistency
    return this.mapUnit(unit);
  }

  async archive(id: string, adminId?: string, reason?: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException(`Unit with ID ${id} not found`);
    if (unit.isArchived) throw new ConflictException('Unit is already archived');

    await this.prisma.unit.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: adminId ?? null,
        archiveReason: reason ?? null,
      },
    });
    return this.findOne(id);
  }

  async unarchive(id: string) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException(`Unit with ID ${id} not found`);
    if (!unit.isArchived) throw new ConflictException('Unit is not archived');

    await this.prisma.unit.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      },
    });
    return this.findOne(id);
  }
}
