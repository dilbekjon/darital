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
  @Permissions('units.read')
  @ApiOperation({ 
    summary: 'Get all units',
    description: 'View all units/rooms. Accessible by: USER_MANAGER, CASHIER, ADMIN, SUPER_ADMIN'
  })
  @ApiResponse({ status: 200, description: 'List of units' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async findAll() {
    return this.unitsService.findAll();
  }

  @Get(':id')
  @Permissions('units.read')
  @ApiOperation({ 
    summary: 'Get unit by ID',
    description: 'View unit details. Accessible by: USER_MANAGER, CASHIER, ADMIN, SUPER_ADMIN'
  })
  @ApiResponse({ status: 200, description: 'Unit found' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Post()
  @Permissions('units.create')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Create new unit/room',
    description: 'Create a new unit. Accessible by: USER_MANAGER, ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 201, description: 'Unit created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires units.create permission' })
  async create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Patch(':id')
  @Permissions('units.update')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Update unit',
    description: 'Update unit details. Accessible by: USER_MANAGER, ADMIN, SUPER_ADMIN only'
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
  @Permissions('units.delete')
  @ApiOperation({ 
    summary: 'Delete unit',
    description: 'Delete a unit. Accessible by: USER_MANAGER, ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 200, description: 'Unit deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires units.delete permission' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  async remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}

