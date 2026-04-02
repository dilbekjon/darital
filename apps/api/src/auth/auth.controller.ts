import { BadRequestException, Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginRequestCodeDto } from './dto/tenant-login-request-code.dto';
import { TenantLoginSetPasswordDto } from './dto/tenant-login-set-password.dto';
import { TenantLoginStatusDto } from './dto/tenant-login-status.dto';
import { TenantSetupPasswordDto } from './dto/tenant-setup-password.dto';
import { Public } from './decorators/public.decorator';
import { TelegramExchangeDto } from './dto/telegram-exchange.dto';

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

  @Post('tenant-login-status')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Tenant login status by phone (password set or first time)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantLoginStatus(@Body() body: TenantLoginStatusDto) {
    return this.authService.tenantLoginStatus(body.phone);
  }

  @Post('tenant-login-request-code')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Request first-time tenant login SMS code (8 digits)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantLoginRequestCode(@Body() body: TenantLoginRequestCodeDto) {
    return this.authService.requestTenantFirstLoginCode(body.phone);
  }

  @Post('tenant-login-set-password')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Confirm first-time SMS code and set tenant password' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantLoginSetPassword(@Body() body: TenantLoginSetPasswordDto) {
    return this.authService.confirmTenantFirstLoginAndSetPassword(body.phone, body.code, body.password);
  }

  @Post('tenant-reset-request-code')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Request tenant password reset SMS code (8 digits)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantResetRequestCode(@Body() body: TenantLoginRequestCodeDto) {
    return this.authService.requestTenantPasswordResetCode(body.phone);
  }

  @Post('tenant-reset-set-password')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Confirm reset SMS code and set tenant password' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantResetSetPassword(@Body() body: TenantLoginSetPasswordDto) {
    return this.authService.confirmTenantPasswordResetAndSetPassword(body.phone, body.code, body.password);
  }

  @Post('telegram-exchange')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Exchange Telegram app token for an API access token' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async telegramExchange(@Body() body: TelegramExchangeDto) {
    return this.authService.exchangeTelegramAppToken(body.token);
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
