import { Injectable, Logger } from '@nestjs/common';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly eskizBaseUrl = 'https://notify.eskiz.uz/api';
  private readonly devSmsBaseUrl = 'https://devsms.uz/api';
  private eskizToken: string | null = null;

  private getBearerAuthHeaderValue(token: string): string {
    const trimmed = token.trim();
    if (/^bearer\s+/i.test(trimmed)) return trimmed;
    return `Bearer ${trimmed}`;
  }

  private getConfiguredProvider(): 'devsms' | 'eskiz' | null {
    const explicitProvider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
    if (explicitProvider === 'devsms') return 'devsms';
    if (explicitProvider === 'eskiz') return 'eskiz';
    if (process.env.DEVSMS_TOKEN) return 'devsms';
    if (process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD) return 'eskiz';
    return null;
  }

  private normalizeUzPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;
  }

  private async getEskizToken(): Promise<string | null> {
    const email = process.env.ESKIZ_EMAIL;
    const password = process.env.ESKIZ_PASSWORD;
    if (!email || !password) {
      this.logger.warn('ESKIZ_EMAIL or ESKIZ_PASSWORD not set, SMS will not be sent');
      return null;
    }
    if (this.eskizToken) return this.eskizToken;
    try {
      const res = await fetch(`${this.eskizBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as any;
      this.eskizToken = data?.data?.token || null;
      return this.eskizToken;
    } catch (e) {
      this.logger.error('Eskiz auth failed', e);
      return null;
    }
  }

  private async sendViaDevSms(phone: string, text: string): Promise<SmsSendResult> {
    const token = process.env.DEVSMS_TOKEN;
    if (!token) {
      return { success: false, error: 'SMS not configured' };
    }
    const uzbPhone = this.normalizeUzPhone(phone);
    try {
      const res = await fetch(`${this.devSmsBaseUrl}/send_sms.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getBearerAuthHeaderValue(token),
        },
        body: JSON.stringify({
          phone: uzbPhone,
          message: text,
          from: process.env.DEVSMS_FROM || '4546',
        }),
      });
      const data = (await res.json()) as any;
      if (res.ok && (data?.success === true || data?.status === 'sent' || data?.id)) {
        this.logger.log(`SMS sent via DevSMS to ${uzbPhone}`);
        return { success: true, messageId: String(data?.id || '') || undefined };
      }
      this.logger.warn(`DevSMS failed: ${JSON.stringify(data)}`);
      return { success: false, error: data?.message || 'Unknown error' };
    } catch (e: any) {
      this.logger.error('DevSMS send error', e);
      return { success: false, error: e?.message };
    }
  }

  private async sendViaEskiz(phone: string, text: string): Promise<SmsSendResult> {
    const token = await this.getEskizToken();
    if (!token) {
      return { success: false, error: 'SMS not configured' };
    }
    const uzbPhone = this.normalizeUzPhone(phone);
    try {
      const res = await fetch(`${this.eskizBaseUrl}/message/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile_phone: uzbPhone,
          message: text,
          from: process.env.ESKIZ_FROM || '4546',
        }),
      });
      const data = (await res.json()) as any;
      const isSuccess =
        res.ok &&
        (data?.status === 'success' ||
          data?.data?.id ||
          data?.id ||
          data?.message_id ||
          data?.data?.message_id);

      if (isSuccess) {
        this.logger.log(`SMS sent via Eskiz to ${uzbPhone}`);
        const messageId =
          data?.id ?? data?.data?.id ?? data?.message_id ?? data?.data?.message_id ?? undefined;
        return { success: true, messageId: messageId ? String(messageId) : undefined };
      }
      this.logger.warn(`Eskiz failed: ${JSON.stringify(data)}`);
      return { success: false, error: data?.message || 'Unknown error' };
    } catch (e: any) {
      this.logger.error('Eskiz send error', e);
      return { success: false, error: e?.message };
    }
  }

  async sendSms(phone: string, text: string): Promise<SmsSendResult> {
    const provider = this.getConfiguredProvider();
    if (!provider) {
      this.logger.log(`[SMS would send] To: ${phone} | ${text}`);
      return { success: false, error: 'SMS not configured' };
    }

    if (provider === 'devsms') {
      return this.sendViaDevSms(phone, text);
    }

    return this.sendViaEskiz(phone, text);
  }

  async sendTenantSetupLink(phone: string, fullName: string, setupUrl: string): Promise<SmsSendResult> {
    const text = `Assalomu alaykum ${fullName}! Darital ijara portalingizga kirish uchun parol o'rnating: ${setupUrl}`;
    return this.sendSms(phone, text);
  }

  async sendTelegramLoginCode(phone: string, fullName: string, code: string): Promise<SmsSendResult> {
    const text =
      `Assalomu alaykum ${fullName}! Darital Telegram botiga kirish kodi: ${code}. ` +
      `Kod 10 daqiqa davomida amal qiladi.`;
    return this.sendSms(phone, text);
  }

  async sendTenantLoginCode(phone: string, fullName: string, code: string): Promise<SmsSendResult> {
    const text =
      `Assalomu alaykum ${fullName}! Darital tizimiga kirish uchun tasdiqlash kodi: ${code}. ` +
      `Kod 10 daqiqa davomida amal qiladi.`;
    return this.sendSms(phone, text);
  }

  async sendTenantPasswordResetCode(phone: string, fullName: string, code: string): Promise<SmsSendResult> {
    const text =
      `Assalomu alaykum ${fullName}! Darital hisobingiz parolini tiklash kodi: ${code}. ` +
      `Kod 10 daqiqa davomida amal qiladi.`;
    return this.sendSms(phone, text);
  }
}
