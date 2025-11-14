import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 requests per minute
  @ApiOperation({ summary: 'Authenticate and get access token' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(@Body() body: LoginDto) {
    const { email, password } = body;
    return this.authService.login(email, password);
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


