import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AdminRole, User } from '@prisma/client'; // Updated import for AdminRole
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
        role: dto.role || AdminRole.ADMIN, // Default to ADMIN if not specified
      },
    });
  }

  async findAllAdminUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: { not: AdminRole.TENANT_USER } }, // Exclude TENANT_USERs
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });
    
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.delete({ where: { id } });
  }

  async updateRole(id: string, newRole: AdminRole): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Prevent changing SUPER_ADMIN role (except by another SUPER_ADMIN, which we'll handle in the guard/logic layer)
    // For now, simple check: if current user is SUPER_ADMIN, they can change any role.
    // More complex logic can be added here or in the controller/guard if needed.
    if (user.role === AdminRole.SUPER_ADMIN && newRole !== AdminRole.SUPER_ADMIN) {
        throw new BadRequestException('Cannot downgrade a SUPER_ADMIN role directly.');
    }
    
    return this.prisma.user.update({
      where: { id },
      data: { role: newRole },
    });
  }
}


