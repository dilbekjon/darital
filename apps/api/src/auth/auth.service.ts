import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SmsService } from '../sms/sms.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
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
      this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { password: hashedPassword, passwordSetAt: new Date() },
      }),
      this.prisma.tenantSetupToken.update({ where: { id: setupToken.id }, data: { usedAt: new Date() } }),
    ]);
    this.logger.log(`Tenant ${normalizedPhone} set password successfully`);
    return { success: true };
  }

  private normalizePhone(rawPhone: string): string {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    return cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;
  }

  async tenantLoginStatus(phone: string): Promise<{ exists: boolean; passwordSet: boolean }> {
    const normalizedPhone = this.normalizePhone(phone);
    const tenant = await this.prisma.tenant.findUnique({ where: { phone: normalizedPhone } });
    if (!tenant) return { exists: false, passwordSet: false };
    return { exists: true, passwordSet: Boolean(tenant.passwordSetAt) };
  }

  private generateOtpCode(): string {
    return crypto.randomInt(10_000_000, 100_000_000).toString();
  }

  async requestTenantFirstLoginCode(phone: string): Promise<{ success: boolean }> {
    const normalizedPhone = this.normalizePhone(phone);
    const tenant = await this.prisma.tenant.findUnique({ where: { phone: normalizedPhone } });
    if (!tenant) {
      const err: any = new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      throw err;
    }
    if (tenant.passwordSetAt) {
      const err: any = new UnauthorizedException({ code: 'PASSWORD_ALREADY_SET', message: 'Password already set' });
      throw err;
    }

    // Cleanup expired/used codes to keep the table small
    await this.prisma.tenantOtp.deleteMany({
      where: {
        tenantId: tenant.id,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    });

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const otp = await this.prisma.tenantOtp.create({
      data: {
        tenantId: tenant.id,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const smsResult = await this.smsService.sendTenantLoginCode(tenant.phone, tenant.fullName, code);
    if (!smsResult.success) {
      // Avoid leaving unusable OTPs in DB when SMS delivery fails
      await this.prisma.tenantOtp.delete({ where: { id: otp.id } }).catch(() => undefined);
      const err: any = new UnauthorizedException({ code: 'SMS_FAILED', message: smsResult.error || 'SMS failed' });
      throw err;
    }

    return { success: true };
  }

  async confirmTenantFirstLoginAndSetPassword(
    phone: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const normalizedPhone = this.normalizePhone(phone);
    const tenant = await this.prisma.tenant.findUnique({ where: { phone: normalizedPhone } });
    if (!tenant) {
      const err: any = new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      throw err;
    }
    if (tenant.passwordSetAt) {
      const err: any = new UnauthorizedException({ code: 'PASSWORD_ALREADY_SET', message: 'Password already set' });
      throw err;
    }

    const otp = await this.prisma.tenantOtp.findFirst({
      where: { tenantId: tenant.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      const err: any = new UnauthorizedException({ code: 'OTP_EXPIRED', message: 'Code expired' });
      throw err;
    }

    if (otp.attempts >= 5) {
      const err: any = new UnauthorizedException({ code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts' });
      throw err;
    }

    const isValid = await bcrypt.compare(code.trim(), otp.codeHash);
    if (!isValid) {
      await this.prisma.tenantOtp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });
      const err: any = new UnauthorizedException({ code: 'INVALID_OTP', message: 'Invalid code' });
      throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { password: hashedPassword, passwordSetAt: new Date() },
      }),
      this.prisma.tenantOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async requestTenantPasswordResetCode(phone: string): Promise<{ success: boolean }> {
    const normalizedPhone = this.normalizePhone(phone);
    const tenant = await this.prisma.tenant.findUnique({ where: { phone: normalizedPhone } });
    if (!tenant) {
      const err: any = new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      throw err;
    }

    // Cleanup expired/used codes
    await this.prisma.tenantOtp.deleteMany({
      where: {
        tenantId: tenant.id,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    });

    const codeValue = this.generateOtpCode();
    const codeHash = await bcrypt.hash(codeValue, 10);
    const otp = await this.prisma.tenantOtp.create({
      data: {
        tenantId: tenant.id,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const smsResult = await this.smsService.sendTenantPasswordResetCode(tenant.phone, tenant.fullName, codeValue);
    if (!smsResult.success) {
      await this.prisma.tenantOtp.delete({ where: { id: otp.id } }).catch(() => undefined);
      const err: any = new UnauthorizedException({ code: 'SMS_FAILED', message: smsResult.error || 'SMS failed' });
      throw err;
    }

    return { success: true };
  }

  async confirmTenantPasswordResetAndSetPassword(
    phone: string,
    code: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const normalizedPhone = this.normalizePhone(phone);
    const tenant = await this.prisma.tenant.findUnique({ where: { phone: normalizedPhone } });
    if (!tenant) {
      const err: any = new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      throw err;
    }

    const otp = await this.prisma.tenantOtp.findFirst({
      where: { tenantId: tenant.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      const err: any = new UnauthorizedException({ code: 'OTP_EXPIRED', message: 'Code expired' });
      throw err;
    }

    if (otp.attempts >= 5) {
      const err: any = new UnauthorizedException({ code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts' });
      throw err;
    }

    const isValid = await bcrypt.compare(code.trim(), otp.codeHash);
    if (!isValid) {
      await this.prisma.tenantOtp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });
      const err: any = new UnauthorizedException({ code: 'INVALID_OTP', message: 'Invalid code' });
      throw err;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { password: hashedPassword, passwordSetAt: new Date() },
      }),
      this.prisma.tenantOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }
}
