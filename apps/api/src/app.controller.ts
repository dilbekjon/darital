import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Permissions } from './rbac/permissions.decorator'; // New import
import { Public } from './auth/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHealth() {
    return {
      ok: true,
      ts: new Date().toISOString(),
    };
  }

  // Example protected admin-only route for AC
  @Get('admin/ping')
  @ApiBearerAuth()
  @Permissions('admin.users.read') // Protected by new permissions system
  @ApiOperation({ summary: 'Admin-only ping (requires admin.users.read permission)' })
  @ApiResponse({ status: 200, description: 'Authorized' })
  adminPing() {
    return { ok: true, scope: 'admin' };
  }
}

