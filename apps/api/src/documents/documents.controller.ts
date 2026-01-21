import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('tenant/:tenantId')
  @Permissions('tenants.read')
  @ApiOperation({ summary: 'Get all documents for a tenant' })
  findAllForTenant(@Param('tenantId') tenantId: string) {
    return this.documentsService.findAllForTenant(tenantId);
  }

  @Get('contract/:contractId')
  @Permissions('contracts.read')
  @ApiOperation({ summary: 'Get all documents for a contract' })
  findAllForContract(@Param('contractId') contractId: string) {
    return this.documentsService.findAllForContract(contractId);
  }

  @Get('payment/:paymentId')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Get all documents for a payment' })
  findAllForPayment(@Param('paymentId') paymentId: string) {
    return this.documentsService.findAllForPayment(paymentId);
  }

  @Get(':id')
  @Permissions('tenants.read')
  @ApiOperation({ summary: 'Get a document by ID' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post('upload')
  @Permissions('tenants.update')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('tenantId') tenantId: string,
    @Body('contractId') contractId: string,
    @Body('paymentId') paymentId: string,
    @Body('type') type: string,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    return this.documentsService.upload(file, {
      tenantId: tenantId || undefined,
      contractId: contractId || undefined,
      paymentId: paymentId || undefined,
      type: (type as any) || 'OTHER',
      name,
      uploadedBy: req.user?.id || req.user?.sub,
    });
  }

  @Delete(':id')
  @Permissions('tenants.update')
  @ApiOperation({ summary: 'Delete a document' })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  @Get('stats/:tenantId')
  @Permissions('tenants.read')
  @ApiOperation({ summary: 'Get document statistics for a tenant' })
  getStats(@Param('tenantId') tenantId: string) {
    return this.documentsService.getDocumentStats(tenantId);
  }
}
