import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
