import { Controller, Get, Put, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { EmailTemplatesService, Language } from './email-templates.service';

class UpdateTemplateDto {
  name?: string;
  description?: string;
  subjectUz?: string;
  subjectRu?: string;
  subjectEn?: string;
  bodyUz?: string;
  bodyRu?: string;
  bodyEn?: string;
  isActive?: boolean;
}

class PreviewDto {
  language: Language;
  sampleData?: Record<string, string>;
}

@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('email-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Get all email templates' })
  async findAll() {
    return this.emailTemplatesService.findAll();
  }

  @Get(':id')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Get a single email template' })
  async findOne(@Param('id') id: string) {
    return this.emailTemplatesService.findOne(id);
  }

  @Put(':id')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Update an email template' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.emailTemplatesService.update(id, dto);
  }

  @Post(':id/preview')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Preview an email template with sample data' })
  async preview(@Param('id') id: string, @Body() dto: PreviewDto) {
    return this.emailTemplatesService.preview(id, dto.language, dto.sampleData);
  }

  @Post(':id/reset')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Reset template to default' })
  async reset(@Param('id') id: string) {
    const template = await this.emailTemplatesService.findOne(id);
    return this.emailTemplatesService.resetToDefault(template.code);
  }

  @Post('seed')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Seed default email templates' })
  async seed() {
    return this.emailTemplatesService.seedDefaults();
  }
}
