import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Context, Markup, Telegraf } from 'telegraf';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AdminTelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminTelegramService.name);
  private bot: Telegraf<Context> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    const enabled = process.env.ADMIN_TELEGRAM_ENABLE === 'true';
    const token = process.env.ADMIN_TELEGRAM_BOT_TOKEN || '';

    this.logger.log(`Admin Telegram Bot Configuration: enabled=${enabled}, token=${token ? '***' + token.slice(-4) : 'NOT SET'}`);

    if (!enabled || !token) {
      this.logger.warn('Admin Telegram bot is disabled. Set ADMIN_TELEGRAM_ENABLE=true and ADMIN_TELEGRAM_BOT_TOKEN.');
      return;
    }

    const bot = new Telegraf<Context>(token);
    this.bot = bot;

    bot.catch((err: any) => {
      this.logger.error(`Admin Telegram bot error: ${err?.message || err}`);
      if (err?.response?.error_code === 409) {
        this.logger.warn('Admin Telegram polling conflict detected. Another API instance may be using the same bot token.');
      }
    });

    this.registerHandlers(bot);

    try {
      await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-1&timeout=1`).catch(() => {});
      const botInfo = await bot.telegram.getMe();
      this.logger.log(`Admin Telegram bot initialized: @${botInfo.username} (${botInfo.first_name})`);

      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start admin login' },
        { command: 'logout', description: 'Log out' },
      ]).catch(() => {});

      const webAppUrl = this.getAdminWebBaseUrl();
      if (webAppUrl) {
        await bot.telegram.setChatMenuButton({
          menuButton: {
            type: 'web_app',
            text: 'Admin App',
            web_app: { url: webAppUrl },
          },
        }).catch((err: any) => {
          this.logger.warn(`Failed to configure admin Telegram menu button: ${err?.message || err}`);
        });
      }

      await bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ['message', 'callback_query'],
      });
      this.logger.log('Admin Telegram bot is ready to receive messages.');
    } catch (error: any) {
      this.logger.error(`Failed to initialize Admin Telegram bot: ${error?.message || error}`);
    }
  }

  async onModuleDestroy() {
    if (!this.bot) return;
    this.logger.log('Shutting down Admin Telegram bot...');
    this.bot.stop('app shutdown');
  }

  private registerHandlers(bot: Telegraf<Context>) {
    bot.start((ctx) => this.handleStart(ctx));
    bot.command('logout', (ctx) => this.handleLogout(ctx));
    bot.action('admin_start_login', async (ctx) => {
      await ctx.answerCbQuery();
      await this.startLogin(ctx);
    });
    bot.action('admin_logout', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleLogout(ctx);
    });
    bot.action('admin_app_missing', async (ctx) => {
      await ctx.answerCbQuery('Admin app URL is not configured.');
      await ctx.reply('Admin app URL sozlanmagan. ADMIN_TELEGRAM_WEBAPP_URL ni .env.production ga qo‘shing.');
    });
    bot.on('text', (ctx) => this.handleText(ctx));
  }

  private getChatId(ctx: Context): string | null {
    return ctx.chat?.id ? String(ctx.chat.id) : null;
  }

  private getAdminWebBaseUrl(): string | null {
    const value =
      process.env.ADMIN_TELEGRAM_WEBAPP_URL ||
      process.env.ADMIN_WEBAPP_URL ||
      process.env.ADMIN_APP_URL;
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private buildAdminLoginUrl(baseUrl: string, token: string): string {
    const url = new URL('/tg-login', baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private generateCode(): string {
    return crypto.randomInt(10000000, 99999999).toString();
  }

  private async ensureAdminTelegramUser(ctx: Context) {
    const chatId = this.getChatId(ctx);
    if (!chatId) return null;

    const telegramUserId = ctx.from?.id ? String(ctx.from.id) : undefined;
    const telegramUsername = ctx.from?.username ?? null;

    const existing = await this.prisma.adminTelegramUser.findUnique({ where: { chatId } });
    if (existing) {
      if (
        (telegramUserId && existing.telegramUserId !== telegramUserId) ||
        existing.telegramUsername !== telegramUsername
      ) {
        return this.prisma.adminTelegramUser.update({
          where: { chatId },
          data: {
            telegramUserId: telegramUserId || existing.telegramUserId,
            telegramUsername,
          },
        });
      }
      return existing;
    }

    return this.prisma.adminTelegramUser.create({
      data: {
        chatId,
        telegramUserId,
        telegramUsername,
        authStep: 'waiting_email',
      },
    });
  }

  private isAuthorized(user: { adminId: string | null; isAuthenticated: boolean } | null | undefined): boolean {
    return Boolean(user?.adminId && user?.isAuthenticated);
  }

  private async handleStart(ctx: Context) {
    const chatId = this.getChatId(ctx);
    if (!chatId) return;

    const telegramUser = await this.ensureAdminTelegramUser(ctx);
    if (this.isAuthorized(telegramUser)) {
      await ctx.reply('Siz admin botga kirgansiz.');
      await this.showMainMenu(ctx, chatId);
      return;
    }

    await this.startLogin(ctx);
  }

  private async startLogin(ctx: Context) {
    const chatId = this.getChatId(ctx);
    if (!chatId) return;

    await this.ensureAdminTelegramUser(ctx);
    await this.prisma.adminTelegramUser.update({
      where: { chatId },
      data: {
        isAuthenticated: false,
        authStep: 'waiting_email',
        pendingAdminId: null,
        pendingEmail: null,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    await ctx.reply('Admin emailingizni yuboring.');
  }

  private async showMainMenu(ctx: Context, chatId: string) {
    const telegramUser = await this.prisma.adminTelegramUser.findUnique({ where: { chatId } });

    if (!this.isAuthorized(telegramUser) || !telegramUser?.adminId) {
      await ctx.reply(
        'Admin botga kirish kerak.',
        Markup.inlineKeyboard([[Markup.button.callback('Kirish', 'admin_start_login')]]),
      );
      return;
    }

    const baseUrl = this.getAdminWebBaseUrl();
    let appButton;
    if (baseUrl) {
      const token = await this.authService.createAdminTelegramAppToken(chatId, telegramUser.adminId);
      appButton = Markup.button.webApp('App', this.buildAdminLoginUrl(baseUrl, token));
    } else {
      appButton = Markup.button.callback('App', 'admin_app_missing');
    }

    await ctx.reply(
      'Darital Admin',
      Markup.inlineKeyboard([[appButton], [Markup.button.callback('Logout', 'admin_logout')]]),
    );
  }

  private async handleText(ctx: Context) {
    const chatId = this.getChatId(ctx);
    if (!chatId) return;

    const text = (ctx.message as any)?.text?.trim();
    if (!text) return;

    const telegramUser = await this.ensureAdminTelegramUser(ctx);
    if (!telegramUser) return;

    if (this.isAuthorized(telegramUser)) {
      await this.showMainMenu(ctx, chatId);
      return;
    }

    if (telegramUser.authStep === 'waiting_code') {
      await this.verifyCode(ctx, telegramUser, text);
      return;
    }

    await this.handleEmail(ctx, chatId, text);
  }

  private async handleEmail(ctx: Context, chatId: string, text: string) {
    const email = text.toLowerCase();
    if (!email.includes('@')) {
      await ctx.reply('To‘g‘ri admin email kiriting.');
      return;
    }

    const admin = await this.prisma.user.findUnique({ where: { email } });
    if (!admin) {
      await ctx.reply('Bu email bilan admin topilmadi.');
      return;
    }

    const code = this.generateCode();
    const mailResult = await this.mailService.sendAdminTelegramLoginCode(admin.email, admin.fullName, code);
    if ('code' in mailResult) {
      this.logger.warn(`Admin Telegram login email failed for ${admin.email}: ${mailResult.message}`);
      await ctx.reply('Email kod yuborilmadi. Mail sozlamalarini tekshiring.');
      return;
    }

    await this.prisma.adminTelegramUser.update({
      where: { chatId },
      data: {
        authStep: 'waiting_code',
        pendingAdminId: admin.id,
        pendingEmail: admin.email,
        otpHash: await bcrypt.hash(code, 10),
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0,
      },
    });

    await ctx.reply('8 xonali kod emailingizga yuborildi. Kodni shu yerga yozing.');
  }

  private async verifyCode(
    ctx: Context,
    telegramUser: {
      chatId: string;
      pendingAdminId: string | null;
      otpHash: string | null;
      otpExpiresAt: Date | null;
      otpAttempts: number;
    },
    code: string,
  ) {
    if (!telegramUser.pendingAdminId || !telegramUser.otpHash || !telegramUser.otpExpiresAt) {
      await this.startLogin(ctx);
      return;
    }

    if (telegramUser.otpExpiresAt < new Date()) {
      await this.prisma.adminTelegramUser.update({
        where: { chatId: telegramUser.chatId },
        data: {
          authStep: 'waiting_email',
          pendingAdminId: null,
          pendingEmail: null,
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      });
      await ctx.reply('Kod muddati tugadi. Emailni qayta yuboring.');
      return;
    }

    const valid = await bcrypt.compare(code.trim(), telegramUser.otpHash);
    if (!valid) {
      const attempts = telegramUser.otpAttempts + 1;
      await this.prisma.adminTelegramUser.update({
        where: { chatId: telegramUser.chatId },
        data: { otpAttempts: attempts },
      });

      if (attempts >= 5) {
        await this.prisma.adminTelegramUser.update({
          where: { chatId: telegramUser.chatId },
          data: {
            authStep: 'waiting_email',
            pendingAdminId: null,
            pendingEmail: null,
            otpHash: null,
            otpExpiresAt: null,
            otpAttempts: 0,
          },
        });
        await ctx.reply('Juda ko‘p noto‘g‘ri urinish. /start bilan qayta boshlang.');
        return;
      }

      await ctx.reply(`Kod noto‘g‘ri. Qolgan urinishlar: ${5 - attempts}`);
      return;
    }

    await this.prisma.adminTelegramUser.update({
      where: { chatId: telegramUser.chatId },
      data: {
        adminId: telegramUser.pendingAdminId,
        isAuthenticated: true,
        authStep: null,
        pendingAdminId: null,
        pendingEmail: null,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    await ctx.reply('Admin botga kirdingiz.');
    await this.showMainMenu(ctx, telegramUser.chatId);
  }

  private async handleLogout(ctx: Context) {
    const chatId = this.getChatId(ctx);
    if (!chatId) return;

    await this.ensureAdminTelegramUser(ctx);
    await this.prisma.adminTelegramUser.update({
      where: { chatId },
      data: {
        adminId: null,
        isAuthenticated: false,
        authStep: 'waiting_email',
        pendingAdminId: null,
        pendingEmail: null,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    await ctx.reply('Admin botdan chiqdingiz. Qayta kirish uchun /start bosing.');
  }
}
