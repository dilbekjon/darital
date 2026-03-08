import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Permissions('companies.read')
  @ApiOperation({
    summary: 'List companies',
    description: 'View all companies and how many units they hold.',
  })
  @ApiResponse({ status: 200, description: 'List of companies returned successfully' })
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Permissions('companies.read')
  @ApiOperation({
    summary: 'Get company by ID',
    description: 'View single company and basic statistics.',
  })
  @ApiResponse({ status: 200, description: 'Company found' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @Permissions('companies.create')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Create company',
    description: 'Create a new company that can hold multiple units.',
  })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Patch(':id')
  @Permissions('companies.update')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Update company',
    description: 'Rename or update description of a company.',
  })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('companies.delete')
  @ApiOperation({
    summary: 'Delete company',
    description: 'Delete a company. Only allowed when no units are assigned to it.',
  })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 409, description: 'Company has assigned units' })
  async remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}

