import { BadRequestException, Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantSetupPasswordDto } from './dto/tenant-setup-password.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Authenticate: admin by email, tenant by phone' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(@Body() body: LoginDto) {
    const loginId = body.login ?? body.email;
    if (!loginId) throw new BadRequestException('login or email required');
    return this.authService.login(loginId, body.password);
  }

  @Post('tenant-setup-password')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Tenant sets password via SMS link token' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantSetupPassword(@Body() body: TenantSetupPasswordDto) {
    return this.authService.tenantSetupPassword(body.phone, body.token, body.password);
  }

  // The /me endpoint is now handled by MeController. Removing from AuthController.
  // @Get('me')
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: 'Get current authenticated user' })
  // async me(@Req() req: any) {
  //   const { sub, email, name, role } = req.user;
  //   return { id: sub, email, fullName: name, role };
  // }
}


