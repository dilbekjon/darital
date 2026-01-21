import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';
// import { AdminRole } from '@prisma/client'; // Removed as not directly used here

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions('admin.users.read')
  @ApiOperation({ 
    summary: 'Get audit logs (requires admin.users.read permission)',
    description: 'Returns paginated audit logs sorted by creation date descending. Only accessible by users with admin.users.read permission.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of admin audit logs with pagination',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              actorId: { type: 'string' },
              actor: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  fullName: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                },
              },
              action: { type: 'string' },
              subject: { type: 'string', nullable: true },
              meta: { type: 'object', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin.users.read permission required' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.auditLogsService.findAll(pageNumber, limitNumber);
  }
}

