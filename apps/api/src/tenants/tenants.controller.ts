import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
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
  @ApiOperation({ summary: 'List tenants', description: 'Accessible by: ADMIN, SUPER_ADMIN. TENANT access will be handled by TenantPortal.' })
  @ApiResponse({ status: 200 })
  async findAll() {
    return this.tenantsService.findAll();
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

  @Delete(':id')
  @Permissions('tenants.delete')
  @ApiOperation({ summary: 'Delete tenant', description: 'Accessible by: ADMIN, SUPER_ADMIN only. Cannot delete tenant with existing contracts.' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Tenant has existing contracts' })
  async remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}


