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

    const cleanPhone = trimmedLogin.replace(/\D/g, '');
    if (!cleanPhone) {
      this.logger.warn('Login attempt failed: login is not a phone number');
      return null;
    }
    const phone = cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;

    // Password login is for admins only. Tenants sign in via SMS OTP
    // (requestTenantLoginCode / verifyTenantLoginCode) or Telegram.
    const admin = await this.usersService.findByPhone(phone);
    if (admin) {
      if (!admin.password?.startsWith('$2')) {
        this.logger.error(`Admin ${phone} has unhashed password.`);
        return null;
      }
      const isValid = await bcrypt.compare(trimmedPassword, admin.password);
      if (!isValid) return null;
      this.logger.log(`Login successful for admin phone: ${phone}`);
      return admin;
    }

    this.logger.warn(`Password login rejected (not an admin): ${phone}`);
    return null;
  }

  async login(login: string, password: string): Promise<{ accessToken: string }> {
    const user = await this.validateUser(login, password);
    if (!user) {
      const err: any = new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid login or password' });
      throw err;
    }
    const payload = { sub: user.id, role: user.role, email: user.email, name: user.fullName, tokenVersion: 0 };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }

  async createTelegramAppToken(chatId: string, tenantId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: tenantId, chatId, typ: 'tg_app' },
      { expiresIn: '30d' },
    );
  }

  async createAdminTelegramAppToken(chatId: string, adminId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: adminId, chatId, typ: 'tg_admin_app' },
      { expiresIn: '30d' },
    );
  }

  async exchangeTelegramAppToken(token: string): Promise<{ accessToken: string }> {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (e: any) {
      const err: any = new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
      throw err;
    }

    if (!payload?.sub || payload?.typ !== 'tg_app' || !payload?.chatId) {
      const err: any = new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid token payload' });
      throw err;
    }

    const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId: String(payload.chatId) } });
    if (!telegramUser?.isAuthenticated || telegramUser.tenantId !== String(payload.sub)) {
      const err: any = new UnauthorizedException({ code: 'NOT_AUTHENTICATED', message: 'Telegram session not authenticated' });
      throw err;
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: String(payload.sub) } });
    if (!tenant) {
      const err: any = new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      throw err;
    }

    const accessToken = await this.jwtService.signAsync({
      sub: tenant.id,
      role: AdminRole.TENANT_USER,
      email: tenant.phone,
      name: tenant.fullName,
      tokenVersion: tenant.tokenVersion,
    });

    return { accessToken };
  }

  async exchangeAdminTelegramAppToken(token: string): Promise<{ accessToken: string }> {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (e: any) {
      const err: any = new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
      throw err;
    }

    if (!payload?.sub || payload?.typ !== 'tg_admin_app' || !payload?.chatId) {
      const err: any = new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid token payload' });
      throw err;
    }

    const telegramUser = await this.prisma.adminTelegramUser.findUnique({
      where: { chatId: String(payload.chatId) },
    });
    if (!telegramUser?.isAuthenticated || telegramUser.adminId !== String(payload.sub)) {
      const err: any = new UnauthorizedException({ code: 'NOT_AUTHENTICATED', message: 'Telegram admin session not authenticated' });
      throw err;
    }

    const admin = await this.prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!admin) {
      const err: any = new UnauthorizedException({ code: 'ADMIN_NOT_FOUND', message: 'Admin user not found' });
      throw err;
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      role: admin.role,
      email: admin.email,
      name: admin.fullName,
    });

    return { accessToken };
  }

  private normalizePhone(rawPhone: string): string {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    return cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;
  }

  private maskPhone(phone: string): string {
    const normalized = this.normalizePhone(phone);
    if (normalized.length < 4) return '****';
    return `+${normalized.slice(0, 5)}***${normalized.slice(-2)}`;
  }

  /**
   * A tenant may sign in with either their contact number (phone) or their
   * Telegram number (telegramPhone). The OTP SMS is ALWAYS sent to the
   * contact number — if the two differ, the Telegram number never receives SMS.
   */
  private async findTenantForLogin(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    return this.prisma.tenant.findFirst({
      where: { OR: [{ phone: normalizedPhone }, { telegramPhone: normalizedPhone }] },
    });
  }

  async tenantLoginStatus(phone: string): Promise<{ exists: boolean; smsTarget: string | null }> {
    const tenant = await this.findTenantForLogin(phone);
    if (!tenant) return { exists: false, smsTarget: null };
    return { exists: true, smsTarget: this.maskPhone(tenant.phone) };
  }

  private generateOtpCode(): string {
    return crypto.randomInt(1000, 10_000).toString();
  }

  async requestTenantLoginCode(phone: string): Promise<{ success: boolean; smsTarget: string }> {
    const tenant = await this.findTenantForLogin(phone);
    if (!tenant) {
      const err: any = new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' });
      throw err;
    }

    // Resend cooldown: at most one SMS per 60 seconds per tenant
    const recentOtp = await this.prisma.tenantOtp.findFirst({
      where: { tenantId: tenant.id, usedAt: null, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });
    if (recentOtp) {
      const err: any = new UnauthorizedException({
        code: 'TOO_FREQUENT',
        message: 'Kod allaqachon yuborilgan. 1 daqiqadan so‘ng qayta urinib ko‘ring.',
      });
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

    // Always the contact number, never the Telegram number
    const smsResult = await this.smsService.sendTenantLoginCode(tenant.phone, tenant.fullName, code);
    if (!smsResult.success) {
      // Avoid leaving unusable OTPs in DB when SMS delivery fails
      await this.prisma.tenantOtp.delete({ where: { id: otp.id } }).catch(() => undefined);
      const err: any = new UnauthorizedException({ code: 'SMS_FAILED', message: smsResult.error || 'SMS failed' });
      throw err;
    }

    return { success: true, smsTarget: this.maskPhone(tenant.phone) };
  }

  async verifyTenantLoginCode(phone: string, code: string): Promise<{ accessToken: string }> {
    const tenant = await this.findTenantForLogin(phone);
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

    await this.prisma.tenantOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: tenant.id,
      role: AdminRole.TENANT_USER,
      email: tenant.phone,
      name: tenant.fullName,
      tokenVersion: tenant.tokenVersion,
    });

    this.logger.log(`Tenant SMS login successful: ${this.maskPhone(tenant.phone)}`);
    return { accessToken };
  }
}
