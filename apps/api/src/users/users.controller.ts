import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { AdminRole } from '@prisma/client';

@ApiTags('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
