import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const units = await this.prisma.unit.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      price: unit.price.toNumber(),
      area: unit.area,
      floor: unit.floor,
      status: unit.status,
      createdAt: unit.createdAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
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
      createdAt: unit.createdAt.toISOString(),
    };
  }

  async create(createUnitDto: CreateUnitDto) {
    const unit = await this.prisma.unit.create({
      data: {
        name: createUnitDto.name,
        price: new Decimal(createUnitDto.price),
        area: createUnitDto.area,
        floor: createUnitDto.floor,
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
      createdAt: unit.createdAt.toISOString(),
    };
  }

  async update(id: string, updateUnitDto: UpdateUnitDto) {
    await this.findOne(id); // Check if exists

    const data: any = { ...updateUnitDto };
    if (updateUnitDto.price !== undefined) {
      data.price = new Decimal(updateUnitDto.price);
    }

    const unit = await this.prisma.unit.update({
      where: { id },
      data,
    });

    // Return in same format as findAll for consistency
    return {
      id: unit.id,
      name: unit.name,
      price: unit.price.toNumber(),
      area: unit.area,
      floor: unit.floor,
      status: unit.status,
      createdAt: unit.createdAt.toISOString(),
    };
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}

