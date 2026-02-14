import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(login: string, password: string) {
    const trimmedLogin = login?.trim();
    const trimmedPassword = password?.trim();
    if (!trimmedLogin || !trimmedPassword) {
      this.logger.warn(`Login attempt failed: Empty login or password`);
      return null;
    }

    const isEmail = trimmedLogin.includes('@');
    if (isEmail) {
      const trimmedEmail = trimmedLogin.toLowerCase();
      const user = await this.usersService.findByEmail(trimmedEmail);
      if (!user) return null;
      if (!user.password) {
        this.logger.warn(`User ${trimmedEmail} has no password set`);
        return null;
      }
      if (!user.password.startsWith('$2')) {
        this.logger.error(`User ${trimmedEmail} has unhashed password in database.`);
        return null;
      }
      const isValid = await bcrypt.compare(trimmedPassword, user.password);
      if (!isValid) return null;
      this.logger.log(`Login successful for admin email: ${trimmedEmail}`);
      return user;
    }

    const cleanPhone = trimmedLogin.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;
    const tenant = await this.prisma.tenant.findUnique({ where: { phone } });
    if (!tenant) {
      this.logger.warn(`Tenant not found for phone: ${phone}`);
      return null;
    }
    if (!tenant.password?.startsWith('$2')) {
      this.logger.error(`Tenant ${phone} has unhashed password.`);
      return null;
    }
    const isValid = await bcrypt.compare(trimmedPassword, tenant.password);
    if (!isValid) return null;
    this.logger.log(`Login successful for tenant phone: ${phone}`);
    return {
      id: tenant.id,
      email: tenant.phone,
      fullName: tenant.fullName,
      role: AdminRole.TENANT_USER,
      password: tenant.password,
    };
  }

  async login(login: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.validateUser(login, password);
    if (!user) {
      const err: any = new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid login or password' });
      throw err;
    }
    const payload = { sub: user.id, role: user.role, email: user.email, name: user.fullName };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }

  async tenantSetupPassword(phone: string, token: string, newPassword: string): Promise<{ success: boolean }> {
    const cleanPhone = phone.replace(/\D/g, '');
    const normalizedPhone = cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;
    const tenant = await this.prisma.tenant.findUnique({ where: { phone: normalizedPhone } });
    if (!tenant) throw new UnauthorizedException({ code: 'INVALID_LINK', message: 'Invalid or expired link' });
    const setupToken = await this.prisma.tenantSetupToken.findFirst({
      where: { tenantId: tenant.id, token, usedAt: null },
    });
    if (!setupToken || setupToken.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_LINK', message: 'Invalid or expired link' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.tenant.update({ where: { id: tenant.id }, data: { password: hashedPassword } }),
      this.prisma.tenantSetupToken.update({ where: { id: setupToken.id }, data: { usedAt: new Date() } }),
    ]);
    this.logger.log(`Tenant ${normalizedPhone} set password successfully`);
    return { success: true };
  }
}


