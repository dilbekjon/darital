import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
      orderBy: { createdAt: 'desc' },
    });

    return units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      price: unit.price.toNumber(),
      area: unit.area,
      floor: unit.floor,
      status: unit.status,
      buildingId: unit.buildingId,
      building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
      createdAt: unit.createdAt.toISOString(),
      isArchived: unit.isArchived,
      archivedAt: unit.archivedAt?.toISOString() ?? null,
      archivedBy: unit.archivedBy ?? null,
      archiveReason: unit.archiveReason ?? null,
    }));
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
      },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    // Return in same format as findAll for consistency
    return {
      id: unit.id,
      name: unit.name,
      price: unit.price.toNumber(),
      area: unit.area,
      floor: unit.floor,
      status: unit.status,
      buildingId: unit.buildingId,
      building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
      createdAt: unit.createdAt.toISOString(),
      isArchived: unit.isArchived,
      archivedAt: unit.archivedAt?.toISOString() ?? null,
      archivedBy: unit.archivedBy ?? null,
      archiveReason: unit.archiveReason ?? null,
    };
  }

  async create(createUnitDto: CreateUnitDto) {
    const unit = await this.prisma.unit.create({
      data: {
        name: createUnitDto.name,
        price: new Decimal(createUnitDto.price),
        area: createUnitDto.area,
        floor: createUnitDto.floor,
        buildingId: createUnitDto.buildingId || null,
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
      },
    });

    // Return in same format as findAll for consistency
    return {
      id: createdUnit!.id,
      name: createdUnit!.name,
      price: createdUnit!.price.toNumber(),
      area: createdUnit!.area,
      floor: createdUnit!.floor,
      status: createdUnit!.status,
      buildingId: createdUnit!.buildingId,
      building: createdUnit!.building ? { id: createdUnit!.building.id, name: createdUnit!.building.name } : null,
      createdAt: createdUnit!.createdAt.toISOString(),
      isArchived: createdUnit!.isArchived,
      archivedAt: createdUnit!.archivedAt?.toISOString() ?? null,
      archivedBy: createdUnit!.archivedBy ?? null,
      archiveReason: createdUnit!.archiveReason ?? null,
    };
  }

  async update(id: string, updateUnitDto: UpdateUnitDto) {
    await this.findOne(id); // Check if exists

    const data: any = { ...updateUnitDto };
    if (updateUnitDto.price !== undefined) {
      data.price = new Decimal(updateUnitDto.price);
    }
    // Handle buildingId: if explicitly set to null, unlink the unit
    if (updateUnitDto.buildingId === null || updateUnitDto.buildingId === '') {
      data.buildingId = null;
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
      },
    });

    // Return in same format as findAll for consistency
    return {
      id: unit.id,
      name: unit.name,
      price: unit.price.toNumber(),
      area: unit.area,
      floor: unit.floor,
      status: unit.status,
      buildingId: unit.buildingId,
      building: unit.building ? { id: unit.building.id, name: unit.building.name } : null,
      createdAt: unit.createdAt.toISOString(),
      isArchived: unit.isArchived,
      archivedAt: unit.archivedAt?.toISOString() ?? null,
      archivedBy: unit.archivedBy ?? null,
      archiveReason: unit.archiveReason ?? null,
    };
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

