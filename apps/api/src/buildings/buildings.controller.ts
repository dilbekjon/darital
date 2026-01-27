import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('buildings')
@ApiBearerAuth()
@Controller('buildings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @Permissions('buildings.read')
  @ApiOperation({ summary: 'Get all buildings with unit counts' })
  findAll() {
    return this.buildingsService.findAll();
  }

  @Get('statistics')
  @Permissions('reports.view')
  @ApiOperation({ summary: 'Get building statistics' })
  getStatistics() {
    return this.buildingsService.getStatistics();
  }

  @Get(':id')
  @Permissions('buildings.read')
  @ApiOperation({ summary: 'Get building details with units' })
  findOne(@Param('id') id: string) {
    return this.buildingsService.findOne(id);
  }

  @Post()
  @Permissions('buildings.create')
  @ApiOperation({ summary: 'Create a new building (User Manager, Admin, Super Admin)' })
  create(@Body() data: { name: string; address?: string; description?: string }) {
    return this.buildingsService.create(data);
  }

  @Put(':id')
  @Permissions('buildings.update')
  @ApiOperation({ summary: 'Update a building (User Manager, Admin, Super Admin)' })
  update(
    @Param('id') id: string,
    @Body() data: { name?: string; address?: string; description?: string },
  ) {
    return this.buildingsService.update(id, data);
  }

  @Delete(':id')
  @Permissions('buildings.delete')
  @ApiOperation({ summary: 'Delete a building (User Manager, Admin, Super Admin)' })
  remove(@Param('id') id: string) {
    return this.buildingsService.remove(id);
  }
}
