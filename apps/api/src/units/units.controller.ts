import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Corrected import path
import { Permissions } from '../rbac/permissions.decorator'; // New import
// import { AdminRole } from '@prisma/client'; // Removed unused import
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('units')
@Controller('units')
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @Permissions('contracts.read') // Accessible by TENANT, ADMIN, SUPER_ADMIN to view associated units
  @ApiOperation({ 
    summary: 'Get all units',
    description: 'Accessible by: TENANT, ADMIN, SUPER_ADMIN (with contracts.read permission for non-tenants)'
  })
  @ApiResponse({ status: 200, description: 'List of units' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async findAll() {
    return this.unitsService.findAll();
  }

  @Get(':id')
  @Permissions('contracts.read') // Accessible by TENANT, ADMIN, SUPER_ADMIN to view associated units
  @ApiOperation({ 
    summary: 'Get unit by ID',
    description: 'Accessible by: TENANT, ADMIN, SUPER_ADMIN (with contracts.read permission for non-tenants)'
  })
  @ApiResponse({ status: 200, description: 'Unit found' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Post()
  @Permissions('contracts.update') // Permission for creating/managing units
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Create new unit',
    description: 'Accessible by: ADMIN, SUPER_ADMIN only (requires contracts.update permission)'
  })
  @ApiResponse({ status: 201, description: 'Unit created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Patch(':id')
  @Permissions('contracts.update') // Permission for creating/managing units
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Update unit',
    description: 'Accessible by: ADMIN, SUPER_ADMIN only. Can update name, price, area, floor, or status (requires contracts.update permission).'
  })
  @ApiResponse({ status: 200, description: 'Unit updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  async update(@Param('id') id: string, @Body() updateUnitDto: UpdateUnitDto) {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(':id')
  @Permissions('contracts.update') // Permission for creating/managing units
  @ApiOperation({ 
    summary: 'Delete unit',
    description: 'Accessible by: ADMIN, SUPER_ADMIN only (requires contracts.update permission)'
  })
  @ApiResponse({ status: 200, description: 'Unit deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  async remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}

