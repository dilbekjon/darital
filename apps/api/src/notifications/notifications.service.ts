import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Tenant } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { FcmService } from '../fcm/fcm.service';
import { SmsService } from '../sms/sms.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Role } from '@prisma/client';
import { MinioService } from '../minio/minio.service';
import { Readable } from 'stream';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly fcmService: FcmService,
    private readonly smsService: SmsService,
    private readonly minioService: MinioService,
    private readonly inAppNotifications: InAppNotificationsService,
    @Optional() @InjectBot() private readonly bot?: Telegraf,
  ) {}

  /**
   * Generic reminder dispatcher
   * Sends reminders via multi-channel: Push + Telegram + SMS
   * Respects tenant notification preferences
   * Falls back to console.log if channels not configured
   */
  async sendReminder(
    recipient: Tenant,
    type: 'BEFORE_3_DAYS' | 'ON_DUE_DATE' | 'LATE' | 'CANCEL_WARNING',
    invoiceId?: string,
  ): Promise<void> {
    this.logger.log(
      `🔔 [${type}] Sending reminder to Tenant ${recipient.fullName} <${recipient.email}> (tenantId=${recipient.id}, invoiceId=${invoiceId || 'N/A'})`,
    );

    // Fetch tenant notification preferences
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { tenantId: recipient.id },
    });

    // Convert to a map for quick lookup (default to enabled if no preference set)
    const preferenceMap = new Map<string, boolean>();
    preferences.forEach((pref) => {
      preferenceMap.set(pref.channel, pref.enabled);
    });

    // Helper to check if channel is enabled (default: true if not set)
    const isChannelEnabled = (channel: string): boolean => {
      return preferenceMap.has(channel) ? preferenceMap.get(channel)! : true;
    };

    // Build notification content
    const title = this.buildReminderTitle(type);
    const body = this.buildReminderBody(type, invoiceId);

    const notificationPromises: Promise<void>[] = [];

    // 1. Push Notifications (FCM) - if enabled
    if (isChannelEnabled('PUSH')) {
      notificationPromises.push(this.sendPushToTenant(recipient.id, title, body));
    } else {
      this.logger.debug(`📲 Push notifications disabled by tenant preference`);
    }

    // 2. Telegram (if tenant has Telegram linked and enabled)
    if (isChannelEnabled('TELEGRAM')) {
      const telegramUser = await this.prisma.telegramUser.findFirst({
        where: { tenantId: recipient.id },
      });

      if (telegramUser) {
        const telegramMessage = `<b>${title}</b>\n\n${body}`;
        notificationPromises.push(this.sendTelegramMessage(telegramUser.chatId, telegramMessage));
        this.logger.debug(`💬 Queued Telegram message`);
      }
    } else {
      this.logger.debug(`💬 Telegram notifications disabled by tenant preference`);
    }

    // 3. SMS (if phone number available and enabled)
    if (isChannelEnabled('SMS')) {
      if (recipient.phone) {
        const smsMessage = `${title}: ${body}`;
        notificationPromises.push(this.sendSMS(recipient.phone, smsMessage));
        this.logger.debug(`📱 Queued SMS`);
      }
    } else {
      this.logger.debug(`📱 SMS notifications disabled by tenant preference`);
    }

    // Send all notifications in parallel
    if (notificationPromises.length > 0) {
      await Promise.allSettled(notificationPromises);
      this.logger.log(`✅ Sent ${notificationPromises.length} notification(s) to tenant ${recipient.id}`);
    } else {
      this.logger.warn(`⚠️ No notification channels available for tenant ${recipient.id}`);
    }

    // Log notification to database
    try {
      await this.prisma.notificationLog.create({
        data: {
          tenantId: recipient.id,
          invoiceId: invoiceId || null,
          type,
          title,
          body,
        },
      });
      await this.inAppNotifications.create({
        tenantId: recipient.id,
        type: 'PAYMENT_DUE',
        title,
        message: body,
        data: invoiceId ? { invoiceId } : undefined,
      });
      this.logger.debug(`📝 Notification logged and in-app created for tenant ${recipient.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to log notification: ${error?.message || error}`);
    }
  }

  /**
   * Build reminder notification title based on type
   */
  private buildReminderTitle(type: 'BEFORE_3_DAYS' | 'ON_DUE_DATE' | 'LATE' | 'CANCEL_WARNING'): string {
    switch (type) {
      case 'BEFORE_3_DAYS':
        return 'Upcoming rent payment';
      case 'ON_DUE_DATE':
        return 'Rent due today';
      case 'LATE':
        return 'Your payment is late';
      case 'CANCEL_WARNING':
        return 'Lease at risk';
      default:
        return 'Payment notice';
    }
  }

  /**
   * Build reminder notification body based on type
   */
  private buildReminderBody(type: 'BEFORE_3_DAYS' | 'ON_DUE_DATE' | 'LATE' | 'CANCEL_WARNING', invoiceId?: string): string {
    const invoiceRef = invoiceId ? `Invoice ${invoiceId.substring(0, 8)}...` : 'Your invoice';
    
    switch (type) {
      case 'BEFORE_3_DAYS':
        return `${invoiceRef}: Payment due in 3 days. Please prepare to pay on time.`;
      case 'ON_DUE_DATE':
        return `${invoiceRef}: Payment is due today. Please complete your payment.`;
      case 'LATE':
        return `${invoiceRef}: Your payment is overdue. Please pay as soon as possible.`;
      case 'CANCEL_WARNING':
        return `${invoiceRef}: Your contract may be cancelled soon due to non-payment. Please contact us immediately.`;
      default:
        return `${invoiceRef}: Please check your balance.`;
    }
  }

  /**
   * Send push notifications to all devices registered for a tenant
   * Uses Firebase Cloud Messaging (FCM)
   */
  async sendPushToTenant(tenantId: string, title: string, body: string): Promise<void> {
    // Get all devices for this tenant
    const devices = await this.prisma.tenantDevice.findMany({
      where: { tenantId },
    });

    if (devices.length === 0) {
      this.logger.debug(`📲 No devices registered for tenant ${tenantId}`);
      return;
    }

    this.logger.log(`📲 Sending push to ${devices.length} device(s) for tenant ${tenantId}`);

    // Send to each device (FcmService handles FCM initialization check)
    const pushPromises = devices.map((device) =>
      this.fcmService.sendPushNotification(device.fcmToken, title, body),
    );

    await Promise.allSettled(pushPromises);
    this.logger.debug(`📲 Completed push delivery to ${devices.length} device(s)`);
  }

  /**
   * Send Telegram message to specific chat ID
   * Generic method for any Telegram notification
   */
  async sendTelegramMessage(chatId: string, text: string, imageUrl?: string): Promise<void> {
    try {
      if (!this.bot) {
        this.logger.debug(`💬 [Telegram DISABLED] To: ${chatId}, Message: ${text}`);
        return;
      }
      
      this.logger.log(`📤 Attempting to send Telegram message to chatId=${chatId}, hasImage=${!!imageUrl}`);
      
      // If image is provided, send photo with caption
      if (imageUrl) {
        this.logger.log(`🖼️ Processing image URL: ${imageUrl}`);
        
        // Check if it's a MinIO URL (local/internal) - if so, download and send as buffer
        if (this.minioService.isMinioUrl(imageUrl)) {
          this.logger.log(`📥 Detected MinIO URL, downloading from: ${imageUrl}`);
          const imageBuffer = await this.minioService.downloadFileFromUrl(imageUrl);
          this.logger.log(`✅ Downloaded image buffer, size: ${imageBuffer.length} bytes`);
          
          // Convert buffer to stream for Telegraf
          const imageStream = Readable.from(imageBuffer);
          this.logger.log(`📤 Sending photo as stream to Telegram...`);
          
          // Send photo as stream - Telegraf accepts streams
          await this.bot.telegram.sendPhoto(chatId, { source: imageStream }, {
            caption: text,
            parse_mode: 'HTML',
          });
          this.logger.log(`✅ 📷 Telegram photo with message sent to chatId=${chatId} (from MinIO buffer)`);
        } else {
          this.logger.log(`📤 Sending photo from public URL: ${imageUrl}`);
          // Public URL - send directly
          await this.bot.telegram.sendPhoto(chatId, imageUrl, {
            caption: text,
            parse_mode: 'HTML',
          });
          this.logger.log(`✅ 📷 Telegram photo with message sent to chatId=${chatId} (from public URL)`);
        }
      } else {
        this.logger.log(`📤 Sending text-only message to Telegram...`);
      await this.bot.telegram.sendMessage(chatId, text, {
        parse_mode: 'HTML',
      });
        this.logger.log(`✅ 💬 Telegram message sent to chatId=${chatId}`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to send Telegram to chatId ${chatId}: ${error?.message || 'Unknown error'}`);
      this.logger.error(`Error details: ${JSON.stringify(error, null, 2)}`);
      // Fallback to console
      this.logger.debug(`💬 [Telegram STUB] To: ${chatId}, Message: ${text}`);
      throw error; // Re-throw to see in controller
    }
  }

  /**
   * Send SMS to phone number
   * Delegates to SmsService which handles provider configuration
   */
  async sendSMS(phone: string, text: string): Promise<void> {
    await this.smsService.sendSMS(phone, text);
  }

  /**
   * Send a Telegram message to a specific tenant
   * Looks up TelegramUser by tenantId and sends the message if found
   * Silently skips if no Telegram is linked
   */
  async sendTelegramToTenant(tenantId: string, message: string, imageUrl?: string): Promise<void> {
    try {
      // Use findMany with take: 1 to ensure only ONE telegram user per tenant
      // This prevents duplicate sends if multiple records exist
      const telegramUsers = await this.prisma.telegramUser.findMany({
        where: { tenantId },
        take: 1, // Only get the first one to prevent duplicates
        orderBy: { createdAt: 'desc' }, // Get the most recent one if multiple exist
      });

      if (telegramUsers.length === 0) {
        this.logger.debug(`No Telegram linked for tenant ${tenantId}, skipping`);
        return;
      }

      const telegramUser = telegramUsers[0];
      
      // Prevent duplicate sends by only sending once
      await this.sendTelegramMessage(telegramUser.chatId, message, imageUrl);
      this.logger.log(`📱 Telegram sent to tenant → tenantId=${tenantId} chatId=${telegramUser.chatId}`);
    } catch (error: any) {
      // Silently fail if Telegram send fails
      this.logger.warn(`Failed to send Telegram to tenant ${tenantId}: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Send a Telegram message to all admin users
   * Used for system alerts (new contract, payment created, etc.)
   */
  async sendAdminTelegram(message: string): Promise<void> {
    try {
      if (!this.bot) {
        this.logger.debug('Telegram bot disabled, skipping admin Telegram notifications');
        return;
      }
      const adminUsers = await this.prisma.telegramUser.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      });

      if (adminUsers.length === 0) {
        this.logger.debug('No admin Telegram users found, skipping admin notification');
        return;
      }

      const sendPromises = adminUsers.map(async (admin) => {
        try {
          await this.bot.telegram.sendMessage(admin.chatId, message, {
            parse_mode: 'HTML',
          });
          this.logger.log(`📱 Admin Telegram sent → chatId=${admin.chatId}`);
        } catch (error: any) {
          this.logger.warn(`Failed to send admin Telegram to chatId ${admin.chatId}: ${error?.message || 'Unknown error'}`);
        }
      });

      await Promise.allSettled(sendPromises);
    } catch (error: any) {
      this.logger.error(`Failed to send admin Telegram notifications: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Send payment reminder via both Email and Telegram
   */
  async sendPaymentReminder(
    tenantId: string,
    tenantEmail: string,
    dueDate: string | Date,
    amount: string | number,
    unitName: string,
    imageUrl?: string,
  ): Promise<void> {
    const due = new Date(dueDate);
    const prettyAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;

    // Send email
    const emailResult = await this.mailService.sendPaymentReminder(tenantEmail, dueDate, amount, unitName, imageUrl);
    if ('code' in emailResult) {
      this.logger.warn(`Email payment reminder failed for tenant ${tenantId}: ${emailResult.message}`);
    }

    // Send Telegram (silently continues even if fails)
    const telegramMessage = `
<b>💰 To'lov eslatmasi</b>

Hurmatli ijrachi,

<b>${unitName}</b> uchun to'lovingiz <b>${due.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</b> gacha amalga oshirilishi kerak.

<b>Summa:</b> ${prettyAmount} so'm

Agar to'lovni amalga oshirgan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.

Hurmat bilan,
Darital
    `.trim();

    await this.sendTelegramToTenant(tenantId, telegramMessage, imageUrl);

    const inAppTitle = 'To\'lov eslatmasi';
    const inAppMessage = `${unitName} uchun to'lovingiz ${due.toLocaleDateString('uz-UZ')} gacha. Summa: ${prettyAmount} so'm`;
    await this.inAppNotifications.create({
      tenantId,
      type: 'PAYMENT_DUE',
      title: inAppTitle,
      message: inAppMessage,
      data: { dueDate: due.toISOString(), amount: prettyAmount, unitName },
    });
    await this.prisma.notificationLog.create({
      data: {
        tenantId,
        invoiceId: null,
        type: 'PAYMENT_REMINDER',
        title: 'Payment Reminder',
        body: `Payment reminder sent for ${unitName}, due ${due.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
      },
    });
  }

  /**
   * Send overdue notice via both Email and Telegram
   */
  async sendOverdueNotice(
    tenantId: string,
    tenantEmail: string,
    amount: string | number,
    daysLate: number,
    imageUrl?: string,
  ): Promise<void> {
    const prettyAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;

    // Send email
    const emailResult = await this.mailService.sendOverdueNotice(tenantEmail, amount, daysLate, imageUrl);
    if ('code' in emailResult) {
      this.logger.warn(`Email overdue notice failed for tenant ${tenantId}: ${emailResult.message}`);
    }

    // Send Telegram (silently continues even if fails)
    const telegramMessage = `
<b>⚠️ To'lov muddati o'tgan</b>

Hurmatli ijrachi,

Sizning to'lovingiz muddati <b>${daysLate} kun</b> o'tib ketgan.

<b>To'lanishi kerak bo'lgan summa:</b> ${prettyAmount} so'm

Iltimos, keyingi choralar ko'rilmasligi uchun imkon qadar tezroq to'lovni amalga oshiring.

Hurmat bilan,
Darital
    `.trim();

    await this.sendTelegramToTenant(tenantId, telegramMessage, imageUrl);

    const inAppTitle = 'To\'lov muddati o\'tgan';
    const inAppMessage = `To'lovingiz ${daysLate} kun kechikdi. Summa: ${prettyAmount} so'm`;
    await this.inAppNotifications.create({
      tenantId,
      type: 'PAYMENT_DUE',
      title: inAppTitle,
      message: inAppMessage,
      data: { daysLate, amount: prettyAmount },
    });
    await this.prisma.notificationLog.create({
      data: {
        tenantId,
        invoiceId: null,
        type: 'OVERDUE_NOTICE',
        title: 'Overdue Payment',
        body: `Overdue notice sent: ${daysLate} day(s) late, amount ${prettyAmount}`,
      },
    });
  }

  /**
   * Send admin notification about new contract
   */
  async notifyAdminNewContract(contractId: string, tenantName: string, unitName: string, amount: number): Promise<void> {
    const subject = `New Contract Created • ${tenantName}`;
    const body = `
Contract ID: ${contractId}
Tenant: ${tenantName}
Unit: ${unitName}
Amount: ${amount.toFixed(2)}
    `.trim();

    // Send email to admin
    await this.mailService.sendAdminNotification(subject, body);

    // Send Telegram to all admins
    const telegramMessage = `
<b>📄 New Contract Created</b>

<b>Tenant:</b> ${tenantName}
<b>Unit:</b> ${unitName}
<b>Amount:</b> ${amount.toFixed(2)}
<b>Contract ID:</b> <code>${contractId}</code>
    `.trim();

    await this.sendAdminTelegram(telegramMessage);
  }

  /**
   * Send admin notification about new payment
   */
  async notifyAdminNewPayment(paymentId: string, tenantName: string, amount: number, method: string): Promise<void> {
    const subject = `New Payment Received • ${tenantName}`;
    const body = `
Payment ID: ${paymentId}
Tenant: ${tenantName}
Amount: ${amount.toFixed(2)}
Method: ${method}
    `.trim();

    // Send email to admin
    await this.mailService.sendAdminNotification(subject, body);

    // Send Telegram to all admins
    const telegramMessage = `
<b>💳 New Payment Received</b>

<b>Tenant:</b> ${tenantName}
<b>Amount:</b> ${amount.toFixed(2)}
<b>Method:</b> ${method}
<b>Payment ID:</b> <code>${paymentId}</code>
    `.trim();

    await this.sendAdminTelegram(telegramMessage);
  }

  /**
   * Notify tenant that payment was received and awaiting admin verification
   */
  async notifyTenantPaymentReceived(
    tenantId: string,
    paymentId: string,
    amount: number,
    provider?: string,
    unitName?: string,
  ): Promise<void> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant || !tenant.email) {
        this.logger.debug(`No tenant or email found for tenantId=${tenantId}, skipping notification`);
        return;
      }

      const providerName = provider === 'UZUM' ? 'UZUM Pay' : provider || 'payment gateway';
      const unitInfo = unitName ? `\nUnit: ${unitName}` : '';
      const subject = 'Payment Received - Awaiting Verification';
      const body = `
Dear ${tenant.fullName},

We have received your payment of ${amount.toFixed(2)} UZS via ${providerName}.${unitInfo}

✅ Your payment has been successfully processed by the payment gateway.

Our financial administrators are now verifying the payment. Once verified, your invoice will be marked as paid.

You will receive another notification when the payment is confirmed.

Payment ID: ${paymentId}

Thank you for your payment!

Best regards,
Darital Team
      `.trim();

      // Send email using payment reminder method (with custom subject/body)
      // Note: Using sendPaymentReminder as a workaround, but the actual email content is custom
      await this.mailService.sendPaymentReminder(
        tenant.email, 
        new Date(), 
        amount, 
        'Payment Received', 
        undefined
      );

      // Send Telegram if available
      const unitInfoUz = unitName ? `\n🏠 Xona: <b>${unitName}</b>` : '';
      const telegramMessage = `
✅ <b>To'lov Qabul Qilindi!</b>

Sizning ${amount.toFixed(2)} UZS miqdoridagi to'lovingiz ${providerName} orqali muvaffaqiyatli qabul qilindi.${unitInfoUz}

💼 Moliya administratorlari hozirda to'lovni tekshiryapti. Tekshiruvdan so'ng, hisob-fakturangiz to'landi deb belgilanadi.

Tekshiruv yakunlanganda sizga yana bir xabar yuboramiz.

To'lov ID: <code>${paymentId}</code>

Rahmat!
Darital Jamoasi
      `.trim();

      await this.sendTelegramToTenant(tenantId, telegramMessage);

      // Send push notification if device registered
      const pushBody = unitName 
        ? `Payment for ${unitName}: ${amount.toFixed(2)} UZS is being verified.`
        : `Your payment of ${amount.toFixed(2)} UZS is being verified. You will be notified once confirmed.`;
      await this.sendPushToTenant(
        tenantId,
        'Payment Received ✅',
        pushBody,
      );

      await this.inAppNotifications.create({
        tenantId,
        type: 'PAYMENT_CONFIRMED',
        title: 'To\'lov qabul qilindi',
        message: unitName
          ? `${amount.toFixed(2)} UZS (${unitName}) - tekshiruv kutilmoqda`
          : `${amount.toFixed(2)} UZS - tekshiruv kutilmoqda`,
        data: { paymentId, amount, unitName },
      });

      this.logger.log(`📧 Sent payment received notification to tenant ${tenantId}${unitName ? ` for unit ${unitName}` : ''}`);
    } catch (error: any) {
      this.logger.warn(`Failed to notify tenant payment received: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Notify tenant that payment was verified (accepted or declined)
   */
  async notifyTenantPaymentVerified(
    tenantId: string,
    paymentId: string,
    amount: number,
    verified: boolean,
    reason?: string,
    unitName?: string,
  ): Promise<void> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant || !tenant.email) {
        this.logger.debug(`No tenant or email found for tenantId=${tenantId}, skipping notification`);
        return;
      }

      const unitInfo = unitName ? `\nUnit: ${unitName}` : '';
      const unitInfoUz = unitName ? `\n🏠 Xona: <b>${unitName}</b>` : '';

      if (verified) {
        const subject = 'Payment Verified - Invoice Paid';
        const body = `
Dear ${tenant.fullName},

Great news! Your payment of ${amount.toFixed(2)} UZS has been verified and confirmed by our financial administrators.${unitInfo}

✅ Payment Status: CONFIRMED
✅ Invoice Status: PAID

Your invoice has been successfully marked as paid. Thank you for your payment!

Payment ID: ${paymentId}

Best regards,
Darital Team
        `.trim();

        // Send email using payment reminder method
        await this.mailService.sendPaymentReminder(
          tenant.email, 
          new Date(), 
          amount, 
          'Payment Verified', 
          undefined
        );

        const telegramMessage = `
✅ <b>To'lov Tasdiqlandi!</b>

Sizning ${amount.toFixed(2)} UZS miqdoridagi to'lovingiz muvaffaqiyatli tasdiqlandi!${unitInfoUz}

✅ To'lov holati: TASDIQLANDI
✅ Hisob-faktura holati: TO'LANDI

Hisob-fakturangiz to'landi deb belgilandi. Rahmat!

To'lov ID: <code>${paymentId}</code>

Darital Jamoasi
        `.trim();

        await this.sendTelegramToTenant(tenantId, telegramMessage);

        const pushBody = unitName 
          ? `Payment for ${unitName}: ${amount.toFixed(2)} UZS confirmed!`
          : `Your payment of ${amount.toFixed(2)} UZS has been verified and confirmed!`;
        await this.sendPushToTenant(
          tenantId,
          'Payment Confirmed ✅',
          pushBody,
        );
        await this.inAppNotifications.notifyPaymentConfirmed(tenantId, paymentId, amount);
      } else {
        const subject = 'Payment Verification - Action Required';
        const body = `
Dear ${tenant.fullName},

We regret to inform you that your payment of ${amount.toFixed(2)} UZS could not be verified.${unitInfo}

❌ Payment Status: DECLINED
${reason ? `Reason: ${reason}` : ''}

Please contact our support team if you have any questions or concerns.

Payment ID: ${paymentId}

Best regards,
Darital Team
        `.trim();

        // Send email using payment reminder method
        await this.mailService.sendPaymentReminder(
          tenant.email, 
          new Date(), 
          amount, 
          'Payment Verified', 
          undefined
        );

        const telegramMessage = `
❌ <b>To'lov Tasdiqlanmadi</b>

Sizning ${amount.toFixed(2)} UZS miqdoridagi to'lovingiz tasdiqlanmadi.${unitInfoUz}

❌ To'lov holati: RAD ETILDI
${reason ? `Sabab: ${reason}` : ''}

Savollaringiz bo'lsa, qo'llab-quvvatlash xizmati bilan bog'laning.

To'lov ID: <code>${paymentId}</code>

Darital Jamoasi
        `.trim();

        await this.sendTelegramToTenant(tenantId, telegramMessage);

        const pushBodyDeclined = unitName 
          ? `Payment for ${unitName}: ${amount.toFixed(2)} UZS declined. Contact support.`
          : `Your payment of ${amount.toFixed(2)} UZS could not be verified. Please contact support.`;
        await this.sendPushToTenant(
          tenantId,
          'Payment Declined ❌',
          pushBodyDeclined,
        );
        await this.inAppNotifications.create({
          tenantId,
          type: 'SYSTEM',
          title: 'To\'lov tasdiqlanmadi',
          message: reason
            ? `${amount.toFixed(2)} UZS - rad etildi. Sabab: ${reason}`
            : `${amount.toFixed(2)} UZS - rad etildi. Qo'llab-quvvatlash bilan bog'laning.`,
          data: { paymentId, amount, verified: false, reason },
        });
      }

      this.logger.log(`📧 Sent payment verification notification to tenant ${tenantId} (verified: ${verified})${unitName ? ` for unit ${unitName}` : ''}`);
    } catch (error: any) {
      this.logger.warn(`Failed to notify tenant payment verified: ${error?.message || 'Unknown error'}`);
    }
  }
}

