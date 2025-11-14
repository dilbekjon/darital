import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Corrected import path

@ApiTags('auth')
@Controller('auth')
export class MeController {
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@Req() req: any) {
    // The JwtStrategy now populates req.user with id, email, fullName, role, and permissions
    return req.user;
  }
}


