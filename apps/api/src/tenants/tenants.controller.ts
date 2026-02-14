import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards, UseInterceptors, UsePipes, ValidationPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Permissions('tenants.read')
  @ApiOperation({
    summary: 'List tenants',
    description: 'Accessible by: ADMIN, SUPER_ADMIN. TENANT access will be handled by TenantPortal. Use includeArchived=true to include archived tenants.'
  })
  @ApiResponse({ status: 200 })
  async findAll(@Query('includeArchived') includeArchived?: string, @Query('onlyArchived') onlyArchived?: string) {
    const includeArchivedBool = includeArchived === 'true';
    const onlyArchivedBool = onlyArchived === 'true';

    if (onlyArchivedBool) {
      // Return only archived tenants
      return this.tenantsService.findArchived();
    }

    return this.tenantsService.findAll(includeArchivedBool);
  }

  @Get(':id')
  @Permissions('tenants.read')
  @ApiOperation({ summary: 'Get tenant by id', description: 'Accessible by: ADMIN, SUPER_ADMIN' })
  @ApiResponse({ status: 200 })
  async findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @Permissions('tenants.create')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create tenant', description: 'Accessible by: ADMIN, SUPER_ADMIN only' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  @Permissions('tenants.update')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Update tenant', description: 'Accessible by: ADMIN, SUPER_ADMIN only' })
  @ApiResponse({ status: 200 })
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Put(':id/reset-password')
  @Permissions('tenants.update')
  @ApiOperation({ summary: 'Send password reset link via SMS to tenant' })
  @ApiResponse({ status: 200 })
  async resetPassword(@Param('id') id: string) {
    return this.tenantsService.sendResetPasswordSms(id);
  }

  // Archive routes must come before the generic :id routes to avoid conflicts
  @Put(':id/archive')
  @Permissions('tenants.update')
  @ApiOperation({
    summary: 'Archive tenant',
    description: 'Move tenant to archive (soft delete) along with all related contracts, invoices, and payments. Accessible by: ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 200, description: 'Tenant and all related data archived successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant is already archived' })
  async archive(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req) {
    const adminId = req.user.id;
    return this.tenantsService.archive(id, adminId, body.reason);
  }

  @Put(':id/unarchive')
  @Permissions('tenants.update')
  @ApiOperation({
    summary: 'Unarchive tenant',
    description: 'Restore tenant from archive along with all related contracts, invoices, and payments. Accessible by: ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 200, description: 'Tenant and all related data unarchived successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Tenant is not archived' })
  async unarchive(@Param('id') id: string) {
    return this.tenantsService.unarchive(id);
  }

  @Delete(':id')
  @Permissions('tenants.delete')
  @ApiOperation({
    summary: 'Permanently delete tenant',
    description: 'Permanently delete archived tenant. Accessible by: ADMIN, SUPER_ADMIN only. Can only delete archived tenants without contracts.'
  })
  @ApiResponse({ status: 200, description: 'Tenant permanently deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete tenant with contracts or non-archived tenant' })
  async remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}


