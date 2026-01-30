import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type MailOk = { ok: true; messageId: string };
type MailErr = { code: 'MAIL_ERROR'; message: string };

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;

  constructor() {
    const host = process.env.MAIL_HOST || 'localhost';
    const port = parseInt(process.env.MAIL_PORT || '1025', 10);
    const user = process.env.MAIL_USER || '';
    const pass = process.env.MAIL_PASS || '';
    this.from = process.env.MAIL_FROM || 'no-reply@darital.local';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // Use secure connection for port 465 (SSL)
      auth: user && pass ? { user, pass: pass.trim() } : undefined, // Trim password to remove any spaces
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000, // 10 seconds connection timeout
      greetingTimeout: 5000, // 5 seconds greeting timeout
      socketTimeout: 10000, // 10 seconds socket timeout
    });
    
    // Log configuration (without password)
    this.logger.log(`📧 Mail service configured: ${host}:${port} (user: ${user || 'none'})`);
  }

  private async send(to: string, subject: string, html: string, text?: string, attachments?: Array<{ filename: string; path: string }>): Promise<MailOk | MailErr> {
    try {
      if (!this.transporter) {
        throw new Error('Mail transporter not initialized');
      }
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text,
        attachments,
      });
      this.logger.log(`Mail sent to ${to} (messageId=${info.messageId})`);
      // For local dev, also log to console explicitly
      // This helps verify in environments without MailHog UI
      // but AC mainly checks MailHog UI at http://localhost:8025
      console.log(`✉️  Sent mail → to=${to} subject="${subject}" id=${info.messageId}`);
      return { ok: true, messageId: info.messageId };
    } catch (err: any) {
      const message = err?.message || 'Unknown mail error';
      this.logger.error(`Failed to send mail: ${message}`);
      return { code: 'MAIL_ERROR', message };
    }
  }

  async sendPaymentReminder(tenantEmail: string, dueDate: string | Date, amount: string | number, unitName: string, imageUrl?: string): Promise<MailOk | MailErr> {
    const due = new Date(dueDate);
    const subject = `Payment Reminder • ${unitName}`;
    const prettyAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;
    const dueStr = due.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2 style="margin:0 0 8px;">Payment Reminder</h2>
        <p>Dear tenant,</p>
        <p>This is a friendly reminder that your payment for <strong>${unitName}</strong> is due on <strong>${dueStr}</strong>.</p>
        <p><strong>Amount:</strong> ${prettyAmount}</p>
        <p>If you have already paid, please ignore this message.</p>
        <p>Best regards,<br/>Darital</p>
      </div>
    `;
    const text = `Payment Reminder: ${unitName}\nDue: ${dueStr}\nAmount: ${prettyAmount}`;
    const attachments = imageUrl ? [{ filename: 'notification-image.jpg', path: imageUrl }] : undefined;
    return this.send(tenantEmail, subject, html, text, attachments);
  }

  async sendOverdueNotice(tenantEmail: string, amount: string | number, daysLate: number, imageUrl?: string): Promise<MailOk | MailErr> {
    const prettyAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;
    const subject = `Overdue Notice • ${daysLate} day(s) late`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2 style="margin:0 0 8px; color:#b91c1c;">Overdue Notice</h2>
        <p>Dear tenant,</p>
        <p>Your payment is overdue by <strong>${daysLate} day(s)</strong>.</p>
        <p><strong>Outstanding Amount:</strong> ${prettyAmount}</p>
        <p>Please make your payment as soon as possible to avoid further action.</p>
        <p>Best regards,<br/>Darital</p>
      </div>
    `;
    const text = `Overdue Notice: ${daysLate} day(s) late\nOutstanding Amount: ${prettyAmount}`;
    const attachments = imageUrl ? [{ filename: 'notification-image.jpg', path: imageUrl }] : undefined;
    return this.send(tenantEmail, subject, html, text, attachments);
  }

  async sendAdminNotification(subject: string, body: string): Promise<MailOk | MailErr> {
    const adminRecipient = process.env.MAIL_FROM || 'no-reply@darital.local';
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2 style="margin:0 0 8px;">Admin Notification</h2>
        <pre style="white-space:pre-wrap; background:#f9fafb; padding:12px; border-radius:8px;">${body}</pre>
        <p style="color:#6b7280; font-size:12px;">Automated message from Darital</p>
      </div>
    `;
    const text = body;
    return this.send(adminRecipient, subject, html, text);
  }
}


