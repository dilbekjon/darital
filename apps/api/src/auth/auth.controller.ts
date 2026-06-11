import { BadRequestException, Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TenantLoginRequestCodeDto } from './dto/tenant-login-request-code.dto';
import { TenantLoginStatusDto } from './dto/tenant-login-status.dto';
import { TenantLoginVerifyDto } from './dto/tenant-login-verify.dto';
import { Public } from './decorators/public.decorator';
import { TelegramExchangeDto } from './dto/telegram-exchange.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Authenticate admin by phone + password (tenants sign in via SMS code)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(@Body() body: LoginDto) {
    const loginId = body.login ?? body.email;
    if (!loginId) throw new BadRequestException('login required');
    return this.authService.login(loginId, body.password);
  }

  @Post('tenant-login-status')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Tenant lookup by phone (contact or Telegram number); returns masked SMS target' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantLoginStatus(@Body() body: TenantLoginStatusDto) {
    return this.authService.tenantLoginStatus(body.phone);
  }

  @Post('tenant-login-request-code')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: 'Request tenant login SMS code (4 digits)',
    description: 'Phone may be the contact or Telegram number; the code is always sent to the contact number.',
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantLoginRequestCode(@Body() body: TenantLoginRequestCodeDto) {
    return this.authService.requestTenantLoginCode(body.phone);
  }

  @Post('tenant-login-verify')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verify 4-digit SMS code and sign the tenant in (passwordless)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async tenantLoginVerify(@Body() body: TenantLoginVerifyDto) {
    return this.authService.verifyTenantLoginCode(body.phone, body.code);
  }

  @Post('telegram-exchange')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Exchange Telegram app token for an API access token' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async telegramExchange(@Body() body: TelegramExchangeDto) {
    return this.authService.exchangeTelegramAppToken(body.token);
  }

  @Post('admin-telegram-exchange')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Exchange Admin Telegram app token for an API access token' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async adminTelegramExchange(@Body() body: TelegramExchangeDto) {
    return this.authService.exchangeAdminTelegramAppToken(body.token);
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
