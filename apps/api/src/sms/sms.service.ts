import { Injectable, Logger } from '@nestjs/common';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl = 'https://notify.eskiz.uz/api';
  private token: string | null = null;

  private async getToken(): Promise<string | null> {
    const email = process.env.ESKIZ_EMAIL;
    const password = process.env.ESKIZ_PASSWORD;
    if (!email || !password) {
      this.logger.warn('ESKIZ_EMAIL or ESKIZ_PASSWORD not set, SMS will not be sent');
      return null;
    }
    if (this.token) return this.token;
    try {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      this.token = data?.data?.token || null;
      return this.token;
    } catch (e) {
      this.logger.error('Eskiz auth failed', e);
      return null;
    }
  }

  async sendSms(phone: string, text: string): Promise<SmsSendResult> {
    const token = await this.getToken();
    if (!token) {
      this.logger.log(`[SMS would send] To: ${phone} | ${text}`);
      return { success: false, error: 'SMS not configured' };
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const uzbPhone = cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;
    try {
      const res = await fetch(`${this.baseUrl}/message/sms/send`, {
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
      const data = await res.json();
      if (data?.status === 'success' || res.ok) {
        this.logger.log(`SMS sent to ${uzbPhone}`);
        return { success: true, messageId: data?.id };
      }
      this.logger.warn(`SMS failed: ${JSON.stringify(data)}`);
      return { success: false, error: data?.message || 'Unknown error' };
    } catch (e: any) {
      this.logger.error('SMS send error', e);
      return { success: false, error: e?.message };
    }
  }

  async sendTenantSetupLink(phone: string, fullName: string, setupUrl: string): Promise<SmsSendResult> {
    const text = `Assalomu alaykum ${fullName}! Darital ijara portalingizga kirish uchun parol o'rnating: ${setupUrl}`;
    return this.sendSms(phone, text);
  }
}
