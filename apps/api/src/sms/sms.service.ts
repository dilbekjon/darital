import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly apiSecret: string | undefined;
  private readonly fromNumber: string | undefined;
  private isConfigured = false;

  constructor() {
    this.provider = process.env.SMS_PROVIDER;
    this.apiKey = process.env.SMS_API_KEY;
    this.apiSecret = process.env.SMS_API_SECRET;
    this.fromNumber = process.env.SMS_FROM_NUMBER;

    if (this.provider && this.apiKey && this.fromNumber) {
      this.isConfigured = true;
      this.logger.log(`✅ SMS service configured with provider: ${this.provider}`);
    } else {
      this.logger.warn('SMS_PROVIDER, SMS_API_KEY, or SMS_FROM_NUMBER not set. SMS disabled.');
    }
  }

  async sendSMS(phone: string, text: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`📱 [SMS STUB] To: ${phone}, Message: ${text}`);
      return;
    }

    try {
      // Placeholder for actual SMS provider integration
      // TODO: Implement based on SMS_PROVIDER value (twilio, vonage, aws-sns, etc.)

      switch (this.provider?.toLowerCase()) {
        case 'twilio':
          await this.sendViaTwilio(phone, text);
          break;
        case 'vonage':
          await this.sendViaVonage(phone, text);
          break;
        case 'aws-sns':
          await this.sendViaAwsSns(phone, text);
          break;
        default:
          this.logger.warn(`Unknown SMS provider: ${this.provider}`);
          this.logger.debug(`📱 [SMS STUB] To: ${phone}, Message: ${text}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${phone}: ${error?.message || error}`);
    }
  }

  private async sendViaTwilio(phone: string, _text: string): Promise<void> {
    // TODO: Implement Twilio integration
    // const twilio = require('twilio');
    // const client = twilio(this.apiKey, this.apiSecret);
    // await client.messages.create({
    //   body: text,
    //   from: this.fromNumber,
    //   to: phone
    // });

    this.logger.log(`📱 [Twilio] SMS sent to ${phone}`);
  }

  private async sendViaVonage(phone: string, _text: string): Promise<void> {
    // TODO: Implement Vonage integration
    this.logger.log(`📱 [Vonage] SMS sent to ${phone}`);
  }

  private async sendViaAwsSns(phone: string, _text: string): Promise<void> {
    // TODO: Implement AWS SNS integration
    this.logger.log(`📱 [AWS SNS] SMS sent to ${phone}`);
  }
}

