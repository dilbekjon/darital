import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const tenants = await this.prisma.tenant.findMany({ 
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });
    
    return tenants.map((tenant) => ({
      id: tenant.id,
      fullName: tenant.fullName,
      email: tenant.email || '',
      phone: tenant.phone,
      createdAt: tenant.createdAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const tenant = await this.prisma.tenant.create({ 
        data: {
          ...dto,
          password: hashedPassword
        }
      });
      
      return {
        id: tenant.id,
        fullName: tenant.fullName,
        email: tenant.email || '',
        phone: tenant.phone,
        createdAt: tenant.createdAt.toISOString(),
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already exists' });
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    
    // If password is provided, hash it before updating
    const updateData: Prisma.TenantUpdateInput = { ...dto };
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    } else {
      // Remove password from updateData if not provided
      delete (updateData as any).password;
    }
    
    const tenant = await this.prisma.tenant.update({ where: { id }, data: updateData });

    return {
      id: tenant.id,
      fullName: tenant.fullName,
      email: tenant.email || '',
      phone: tenant.phone,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    // Check if tenant has contracts
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId: id },
    });

    if (contracts.length > 0) {
      throw new ConflictException('Cannot delete tenant with existing contracts. Please delete or reassign contracts first.');
    }

    // Delete balance if it exists (one-to-one relationship)
    await this.prisma.balance.deleteMany({
      where: { tenantId: id },
    });

    // Conversations will be automatically deleted due to onDelete: Cascade
    // Delete the tenant
    return this.prisma.tenant.delete({
      where: { id },
    });
  }
}


