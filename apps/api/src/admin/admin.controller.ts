import { Controller, Post, Body, HttpCode, HttpStatus, Query, Headers, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Public } from '../auth/decorators/public.decorator';
import * as bcrypt from 'bcryptjs';
import { AdminRole } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('clear-database')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all data (requires CLEAR_DATABASE_SECRET)' })
  @ApiResponse({ status: 200, description: 'All data cleared.' })
  @ApiResponse({ status: 400, description: 'Secret not configured or missing.' })
  @ApiResponse({ status: 403, description: 'Invalid secret.' })
  async clearDatabase(
    @Query('secret') querySecret?: string,
    @Headers('x-clear-database-secret') headerSecret?: string,
  ) {
    const expected = process.env.CLEAR_DATABASE_SECRET;
    if (!expected || expected.length < 16) {
      throw new BadRequestException('Clear database is not configured (set CLEAR_DATABASE_SECRET with at least 16 characters).');
    }
    const secret = headerSecret || querySecret;
    if (secret !== expected) {
      throw new ForbiddenException('Invalid or missing secret.');
    }
    await this.prisma.message.deleteMany({});
    await this.prisma.archivedMessage.deleteMany({});
    await this.prisma.conversation.deleteMany({});
    await this.prisma.archivedConversation.deleteMany({});
    await this.prisma.adminAuditLog.deleteMany({});
    await this.prisma.archivedAuditLog.deleteMany({});
    await this.prisma.rolePermission.deleteMany({});
    await this.prisma.inAppNotification.deleteMany({});
    await this.prisma.archivedNotification.deleteMany({});
    await this.prisma.notificationLog.deleteMany({});
    await this.prisma.notificationPreference.deleteMany({});
    await this.prisma.tenantDevice.deleteMany({});
    await this.prisma.document.deleteMany({});
    await this.prisma.payment.deleteMany({});
    await this.prisma.invoice.deleteMany({});
    await this.prisma.contract.deleteMany({});
    await this.prisma.balance.deleteMany({});
    await this.prisma.telegramUser.deleteMany({});
    await this.prisma.tenant.deleteMany({});
    await this.prisma.unit.deleteMany({});
    await this.prisma.building.deleteMany({});
    await this.prisma.user.deleteMany({});
    await this.prisma.permission.deleteMany({});
    await this.prisma.emailTemplate.deleteMany({});
    return { success: true, message: 'All data cleared. You can enter fresh data now.' };
  }

  @Post('create')
  @Public() // Make this endpoint public so it can be called without authentication (for initial setup)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a temporary admin user',
    description: 'Creates an admin user if it doesn\'t exist. Uses upsert to safely handle duplicates. This is a temporary utility endpoint that can be removed after use.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Admin user created or already exists',
    schema: {
      example: {
        success: true,
        message: 'Admin user created successfully',
        username: 'admin@example.com',
        email: 'admin@example.com'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error' 
  })
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    const { email, username, password } = createAdminDto;

    // Check if user already exists to determine the message
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    const wasExisting = !!existingUser;

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use upsert to create admin if doesn't exist, or skip if it does
    const admin = await this.prisma.user.upsert({
      where: { email },
      update: {
        // If user exists, don't update anything (skip)
        // Only create if it doesn't exist
      },
      create: {
        email,
        fullName: username, // Using fullName field for username
        password: hashedPassword,
        role: AdminRole.SUPER_ADMIN, // Use SUPER_ADMIN to bypass permission checks (has all permissions)
      },
    });

    return {
      success: true,
      message: wasExisting 
        ? 'Admin user already exists (skipped)' 
        : 'Admin user created successfully',
      username: admin.fullName,
      email: admin.email,
    };
  }
}
