import { Controller, Get, Post, Delete, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ArchiveService } from './archive.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';

@ApiTags('archive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get('summary')
  @Permissions('admin.users.read')
  @ApiOperation({
    summary: 'Get archive summary and statistics',
    description: 'Returns statistics about archived and active data across the system'
  })
  @ApiResponse({ status: 200, description: 'Archive summary retrieved successfully' })
  async getSummary() {
    return this.archiveService.getArchiveSummary();
  }

  @Post('run-auto-archive')
  @Permissions('admin.users.read')
  @ApiOperation({
    summary: 'Run automatic archiving process',
    description: 'Archives old operational data according to retention policies'
  })
  @ApiResponse({ status: 200, description: 'Auto-archive process completed' })
  async runAutoArchive() {
    return this.archiveService.runAutoArchive();
  }

  @Get('conversations')
  @Permissions('admin.users.read')
  @ApiOperation({
    summary: 'Get archived conversations',
    description: 'Retrieve archived conversations with pagination'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @ApiResponse({ status: 200, description: 'Archived conversations retrieved' })
  async getArchivedConversations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.archiveService.getArchivedConversations(pageNumber, limitNumber);
  }

  @Get('conversations/:id/messages')
  @Permissions('admin.users.read')
  @ApiOperation({
    summary: 'Get archived messages for a conversation',
    description: 'Retrieve all archived messages for a specific archived conversation'
  })
  @ApiResponse({ status: 200, description: 'Archived messages retrieved' })
  async getArchivedMessages(@Param('id') conversationId: string) {
    return this.archiveService.getArchivedMessages(conversationId);
  }

  @Post('conversations/:id/restore')
  @Permissions('admin.users.read')
  @ApiOperation({
    summary: 'Restore archived conversation',
    description: 'Restore an archived conversation back to active status'
  })
  @ApiResponse({ status: 200, description: 'Conversation restored successfully' })
  @ApiResponse({ status: 404, description: 'Archived conversation not found' })
  async restoreArchivedConversation(@Param('id') archivedId: string) {
    return this.archiveService.restoreArchivedConversation(archivedId);
  }

  @Delete('cleanup/:days')
  @Permissions('admin.users.read')
  @ApiOperation({
    summary: 'Clean up old archived data',
    description: 'Permanently delete archived data older than specified days'
  })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanupOldArchives(@Param('days') days: string) {
    const daysNumber = parseInt(days, 10);
    if (isNaN(daysNumber) || daysNumber < 30) {
      throw new Error('Days must be a number greater than or equal to 30');
    }
    return this.archiveService.cleanupOldArchives(daysNumber);
  }
}