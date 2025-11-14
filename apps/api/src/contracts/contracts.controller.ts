import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated import path
import { Permissions } from '../rbac/permissions.decorator'; // New import
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../minio/minio.service';
import { Express } from 'express';
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService, private readonly minio: MinioService) {}

  @Get()
  @Permissions('contracts.read') // New permissions decorator
  @ApiOperation({ summary: 'List contracts', description: 'Accessible by: ADMIN, SUPER_ADMIN. TENANT access will be handled by TenantPortal.' })
  async findAll() {
    return this.contractsService.findAll();
  }

  @Get(':id')
  @Permissions('contracts.read') // New permissions decorator
  @ApiOperation({ summary: 'Get contract by id', description: 'Accessible by: ADMIN, SUPER_ADMIN.' })
  async findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Post()
  @Permissions('contracts.create') // New permissions decorator
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create contract (Admin only) with PDF upload' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        unitId: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        amount: { type: 'string', example: '1000.50' },
        notes: { type: 'string', description: 'Additional contract notes or description' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['tenantId', 'unitId', 'startDate', 'endDate', 'amount', 'file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Contract created and file uploaded' })
  async create(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { tenantId, unitId, startDate, endDate, amount, notes } = body;
    if (!file) {
      // Let the global filter map this properly
      throw new Error('File is required');
    }
    const bucket = process.env.MINIO_BUCKET || 'contracts';
    const url = await this.minio.uploadFile(file, bucket);
    return this.contractsService.create(
      { tenantId, unitId, startDate, endDate, amount, notes },
      url,
    );
  }

  @Patch(':id')
  @Permissions('contracts.update') // New permissions decorator
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update contract (Admin only). PDF file upload is optional.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        unitId: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        amount: { type: 'string', example: '1000.50' },
        notes: { type: 'string', description: 'Additional contract notes or description' },
        file: { type: 'string', format: 'binary', description: 'Optional PDF file to replace existing contract PDF' },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { tenantId, unitId, startDate, endDate, amount, notes } = body;
    const dto: UpdateContractDto = {};
    if (tenantId !== undefined) dto.tenantId = tenantId;
    if (unitId !== undefined) dto.unitId = unitId;
    if (startDate !== undefined) dto.startDate = startDate;
    if (endDate !== undefined) dto.endDate = endDate;
    if (amount !== undefined) dto.amount = amount;
    if (notes !== undefined) dto.notes = notes;
    
    let pdfUrl: string | undefined;
    if (file) {
      const bucket = process.env.MINIO_BUCKET || 'contracts';
      pdfUrl = await this.minio.uploadFile(file, bucket);
    }
    
    return this.contractsService.update(id, dto, pdfUrl);
  }

  @Patch(':id/status')
  @Permissions('contracts.update') // New permissions decorator
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Update contract status (Admin only)', 
    description: `
    Changes contract status with automatic unit status management.
    
    **Valid transitions:**
    - DRAFT → ACTIVE (marks unit as BUSY)
    - ACTIVE → COMPLETED (marks unit as FREE)
    - ACTIVE → CANCELLED (marks unit as FREE)
    
    **Status meanings:**
    - DRAFT: Contract created but not signed yet
    - ACTIVE: Contract is signed, tenant is occupying and paying
    - COMPLETED: Contract finished successfully
    - CANCELLED: Contract ended early
    
    All updates run in a transaction to maintain data consistency.
    Invalid transitions return 400 with error code INVALID_STATUS_TRANSITION.
    ` 
  })
  @ApiBody({ type: UpdateContractStatusDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Contract status updated successfully. Unit status also updated if applicable.' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid status transition',
    schema: {
      example: {
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Cannot transition from COMPLETED to ACTIVE',
        details: {
          currentStatus: 'COMPLETED',
          requestedStatus: 'ACTIVE',
          allowedTransitions: []
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContractStatusDto,
  ) {
    return this.contractsService.changeStatus(id, dto);
  }

  @Delete(':id')
  @Permissions('contracts.delete')
  @ApiOperation({ 
    summary: 'Delete contract', 
    description: 'Accessible by: ADMIN, SUPER_ADMIN only. Cannot delete contract with existing invoices. Unit status will be set to FREE if contract was ACTIVE or DRAFT.' 
  })
  @ApiResponse({ status: 200, description: 'Contract deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Contract has existing invoices' })
  async remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}


