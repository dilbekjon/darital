import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  Req,
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
    description: 'View all units/rooms. Use includeArchived=true to include archived. Accessible by: USER_MANAGER, CASHIER, ADMIN, SUPER_ADMIN'
  })
  @ApiResponse({ status: 200, description: 'List of units' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async findAll(@Query('includeArchived') includeArchived?: string) {
    return this.unitsService.findAll(includeArchived === 'true');
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

  @Put(':id/archive')
  @Permissions('units.update')
  @ApiOperation({
    summary: 'Archive unit',
    description: 'Archive a unit (soft delete). Does not remove contracts. Accessible by: USER_MANAGER, ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 200, description: 'Unit archived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 409, description: 'Unit is already archived' })
  async archive(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req: { user?: { id?: string } }) {
    return this.unitsService.archive(id, req.user?.id, body?.reason);
  }

  @Put(':id/unarchive')
  @Permissions('units.update')
  @ApiOperation({
    summary: 'Unarchive unit',
    description: 'Restore unit from archive. Accessible by: USER_MANAGER, ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 200, description: 'Unit unarchived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Unit not found' })
  @ApiResponse({ status: 409, description: 'Unit is not archived' })
  async unarchive(@Param('id') id: string) {
    return this.unitsService.unarchive(id);
  }
}

