import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UsePipes, ValidationPipe, ForbiddenException, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserCredentialsDto } from './dto/update-user-credentials.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { AdminRole } from '@prisma/client';
import { Request } from 'express';

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/credentials')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update my own admin phone/password' })
  async updateMyCredentials(
    @Body() body: UpdateUserCredentialsDto,
    @Req() req: Request,
  ) {
    const actor = req.user as { id?: string; role?: string };
    if (!actor?.id) {
      throw new ForbiddenException('Unauthorized');
    }
    if (actor?.role === AdminRole.TENANT_USER || actor?.role === 'TENANT_USER') {
      throw new ForbiddenException('Tenant users cannot update admin credentials');
    }
    return this.usersService.updateCredentials(actor.id, body);
  }

  @Post()
  @Permissions('admin.users.update') // Permission to create new admin users
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create a new admin user (admin.users.update)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Permissions('admin.users.read') // Permission to view admin users
  @ApiOperation({ summary: 'Get all admin users (admin.users.read)' })
  findAll() {
    return this.usersService.findAllAdminUsers();
  }

  @Get(':id')
  @Permissions('admin.users.read') // Permission to view a specific admin user
  @ApiOperation({ summary: 'Get admin user by ID (admin.users.read)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id); // Changed from findOne to findById
  }

  @Patch(':id')
  @Permissions('admin.users.update') // Permission to update admin user details
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update admin user (admin.users.update)' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Permissions('admin.users.update') // Permission to delete admin users
  @ApiOperation({ summary: 'Delete admin user (admin.users.update)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/role')
  @Permissions('admin.users.update') // Permission to change admin user roles
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update admin user role (admin.users.update)' })
  updateRole(@Param('id') id: string, @Body() body: { role: AdminRole }) {
    // Ensure SUPER_ADMIN cannot be changed by non-SUPER_ADMIN
    return this.usersService.updateRole(id, body.role);
  }

  @Patch(':id/credentials')
  @Permissions('admin.users.update')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'SUPER_ADMIN updates admin phone/password' })
  async updateCredentials(
    @Param('id') id: string,
    @Body() body: UpdateUserCredentialsDto,
    @Req() req: Request,
  ) {
    const actor = req.user as { role?: string };
    if (actor?.role !== AdminRole.SUPER_ADMIN && actor?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can change admin phone/password');
    }
    return this.usersService.updateCredentials(id, body);
  }
}
