import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Update, Ctx, Start, Help, Command, On, Action } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma.service';
import { MinioService } from '../minio/minio.service';
import { ChatGateway } from '../chat/chat.gateway';
import * as bcrypt from 'bcryptjs';
import { AdminRole, Role } from '@prisma/client'; // Import AdminRole and Role enums
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// Conversation state management
interface ConversationState {
  step: 'waiting_name' | 'waiting_email' | 'waiting_password' | 'completed' | 'choosing_language' | 'main_menu' | 'writing_chat';
  name?: string;
  email?: string;
  language?: 'uz' | 'ru' | 'en';
}

@Update()
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private conversationStates = new Map<string, ConversationState>();
  private chatGateway: ChatGateway | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
    @Optional() private readonly minioService?: MinioService,
    private readonly moduleRef?: ModuleRef,
  ) {
    // Add error handler to catch polling conflicts
    this.bot.catch((err: any) => {
      this.logger.error(`Telegram bot error: ${err.message || err}`);
      if (err?.response?.error_code === 409) {
        this.logger.warn('⚠️ Conflict detected - another bot instance may be running');
        this.logger.warn('The bot will retry polling in a few seconds...');
        // Don't crash, just log the error
      }
    });
  }

  async onModuleInit() {
    const enabled = process.env.TELEGRAM_ENABLE === 'true';
    const token = process.env.TELEGRAM_BOT_TOKEN || '';
    
    if (!enabled || !token) {
      this.logger.warn('Telegram bot is disabled - skipping initialization');
      return;
    }

    try {
      // Get bot info to verify it's working
      const botInfo = await this.bot.telegram.getMe();
      this.logger.log(`✅ Telegram bot initialized successfully: @${botInfo.username} (${botInfo.first_name})`);
      this.logger.log(`📱 Bot is ready to receive messages. Users can start chatting with @${botInfo.username}`);
    } catch (error: any) {
      // Handle conflict error gracefully - another instance might be running
      if (error?.response?.error_code === 409) {
        this.logger.warn(`⚠️ Telegram bot conflict detected: ${error?.response?.description || error?.message}`);
        this.logger.warn(`This usually means another bot instance is running. The bot will continue but polling may not work.`);
        this.logger.warn(`To fix: Stop all other bot instances or wait a few seconds and restart.`);
      } else {
        this.logger.error(`❌ Failed to initialize Telegram bot: ${error?.message || error}`);
        this.logger.error(`Check your TELEGRAM_BOT_TOKEN and ensure it's valid`);
      }
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Shutting down Telegram bot...');
      await this.bot.stop('SIGTERM');
    } catch (error: any) {
      this.logger.error(`Error stopping Telegram bot: ${error?.message || error}`);
    }
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) {
      this.logger.warn('Received /start command but no chatId found');
      return;
    }

    this.logger.log(`📩 Received /start command from chatId: ${chatId}, userId: ${ctx.from?.id}, username: ${ctx.from?.username || 'N/A'}`);
    
    try {
    // Check if user already has a linked account
    const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
    
    if (telegramUser?.tenantId) {
        // User is registered - show main menu
        const state = this.conversationStates.get(chatId) || { language: 'uz' as const };
        await this.showMainMenu(ctx, chatId, state.language || 'uz');
      return;
    }

      // New user - show language selection
      await this.showLanguageSelection(ctx);
      this.conversationStates.set(chatId, { step: 'choosing_language' });
      this.logger.log(`✅ Language selection shown for chatId=${chatId}`);
    } catch (error: any) {
      this.logger.error(`❌ Error handling /start command: ${error?.message || error}`);
      try {
        await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
      } catch (replyError) {
        this.logger.error(`Failed to send error message: ${replyError}`);
      }
    }
  }

  /**
   * Show language selection buttons (reply keyboard at bottom)
   */
  private async showLanguageSelection(ctx: Context) {
    const keyboard = Markup.keyboard([
      ['🇺🇿 O\'zbek tili'],
      ['🇷🇺 Русский язык'],
      ['🇬🇧 English'],
    ]).resize().oneTime();

    await ctx.reply(
      `👋 Welcome to Darital Bot!\n\n` +
      `Iltimos, tilni tanlang / Пожалуйста, выберите язык / Please select a language:`,
      keyboard
    );
  }

  /**
   * Show main menu with reply keyboard buttons (persistent at bottom)
   */
  private async showMainMenu(ctx: Context, chatId: string, lang: 'uz' | 'ru' | 'en' = 'uz') {
    const texts = this.getMenuTexts(lang);
    
    const keyboard = Markup.keyboard([
      [texts.writeChat, texts.checkStatus],
      [texts.checkDeadlines, texts.checkBalance],
      [texts.changeLanguage, texts.help],
    ]).resize().persistent();

    // Update conversation state to main_menu
    const state = this.conversationStates.get(chatId) || { step: 'main_menu' as const, language: lang };
    state.step = 'main_menu';
    state.language = lang;
    this.conversationStates.set(chatId, state);

    await ctx.reply(texts.mainMenuTitle, keyboard);
  }

  /**
   * Get menu texts based on language
   */
  private getMenuTexts(lang: 'uz' | 'ru' | 'en') {
    if (lang === 'ru') {
      return {
        mainMenuTitle: '🏠 Главное меню\n\nВыберите действие:',
        writeChat: '💬 Написать в чат',
        checkStatus: '📊 Проверить статус',
        checkDeadlines: '📅 Проверить сроки',
        checkBalance: '💰 Проверить баланс',
        changeLanguage: '🌐 Изменить язык',
        help: '❓ Помощь',
        back: '⬅️ Назад',
      };
    } else if (lang === 'en') {
      return {
        mainMenuTitle: '🏠 Main Menu\n\nChoose an action:',
        writeChat: '💬 Write a Chat',
        checkStatus: '📊 Check Status',
        checkDeadlines: '📅 Check Deadlines',
        checkBalance: '💰 Check Balance',
        changeLanguage: '🌐 Change Language',
        help: '❓ Help',
        back: '⬅️ Back',
      };
    } else {
      // Uzbek (default)
      return {
        mainMenuTitle: '🏠 Bosh menyu\n\nAmalni tanlang:',
        writeChat: '💬 Chatga yozish',
        checkStatus: '📊 Statusni tekshirish',
        checkDeadlines: '📅 Muddatlarni tekshirish',
        checkBalance: '💰 Balansni tekshirish',
        changeLanguage: '🌐 Tilni o\'zgartirish',
        help: '❓ Yordam',
        back: '⬅️ Orqaga',
      };
    }
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply(
      `📚 Mavjud buyruqlar:\n\n` +
      `/start - Ro'yxatdan o'tish yoki hisobni ulash\n` +
      `/help - Yordam ko'rsatish\n` +
      `/status - Hisob holatini tekshirish\n` +
      `/notifytest - Test xabar yuborish\n` +
      `/bekor - Ro'yxatdan o'tishni bekor qilish`
    );
  }

  @Command('status')
  async onStatus(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { chatId },
    });

    if (!telegramUser) {
      await ctx.reply(`❌ Siz ro'yxatdan o'tmagansiz. Ro'yxatdan o'tish uchun /start yuboring.`);
      return;
    }

    if (telegramUser.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: telegramUser.tenantId } });
      await ctx.reply(
        `✅ Hisob ulangan:\n\n` +
        `Ism: ${tenant?.fullName || 'Noma\'lum'}\n` +
        `Email: ${tenant?.email || 'N/A'}\n` +
        `Rol: ${telegramUser.role}`
      );
    } else {
      await ctx.reply(
        `⚠️ Ro'yxatdan o'tgansiz, lekin hisob ulanmagan.\n\n` +
        `Hisobni ulash uchun /start buyrug'ini yuboring.`
      );
    }
  }

  @Command('notifytest')
  async onNotifyTest(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { chatId },
    });

    if (!telegramUser) {
      await ctx.reply(`❌ Siz ro'yxatdan o'tmagansiz. Avval /start buyrug'ini yuboring.`);
      return;
    }

    await ctx.reply(
      `Bu Darital tizimidan test eslatma ✅`,
      { parse_mode: 'HTML' }
    );
    this.logger.log(`Test notification sent to chatId=${chatId}`);
  }

  @Command('bekor')
  async onCancel(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    this.conversationStates.delete(chatId);
    await ctx.reply(
      `❌ Ro'yxatdan o'tish bekor qilindi.\n\n` +
      `Qaytadan boshlash uchun /start yuboring.`
    );
  }

  // Language selection handlers
  @Action('lang_uz')
  async onLanguageUz(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId) || { step: 'choosing_language' };
    state.language = 'uz';
    state.step = 'main_menu';
    this.conversationStates.set(chatId, state);

    const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
    if (telegramUser?.tenantId) {
      await this.showMainMenu(ctx, chatId, 'uz');
    } else {
      // Start registration with Uzbek
      state.step = 'waiting_name';
      this.conversationStates.set(chatId, state);
      await ctx.editMessageText(
        `👋 Darital botiga xush kelibsiz!\n\n` +
        `Ro'yxatdan o'tish uchun, iltimos, ma'lumotlaringizni kiriting.\n\n` +
        `Ism va familiyangizni kiriting:`
      );
    }
  }

  @Action('lang_ru')
  async onLanguageRu(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId) || { step: 'choosing_language' };
    state.language = 'ru';
    state.step = 'main_menu';
    this.conversationStates.set(chatId, state);

    const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
    if (telegramUser?.tenantId) {
      await this.showMainMenu(ctx, chatId, 'ru');
    } else {
      // Start registration with Russian
      state.step = 'waiting_name';
      this.conversationStates.set(chatId, state);
      await ctx.editMessageText(
        `👋 Добро пожаловать в бот Darital!\n\n` +
        `Для регистрации, пожалуйста, введите ваши данные.\n\n` +
        `Введите ваше имя и фамилию:`
      );
    }
  }

  @Action('lang_en')
  async onLanguageEn(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId) || { step: 'choosing_language' };
    state.language = 'en';
    state.step = 'main_menu';
    this.conversationStates.set(chatId, state);

    const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
    if (telegramUser?.tenantId) {
      await this.showMainMenu(ctx, chatId, 'en');
    } else {
      // Start registration with English
      state.step = 'waiting_name';
      this.conversationStates.set(chatId, state);
      await ctx.editMessageText(
        `👋 Welcome to Darital Bot!\n\n` +
        `To register, please enter your information.\n\n` +
        `Enter your full name:`
      );
    }
  }

  // Main menu handlers
  @Action('menu_write_chat')
  async onMenuWriteChat(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId);
    const lang = state?.language || 'uz';

    const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
    if (!telegramUser?.tenantId) {
      await ctx.reply(this.getText(lang, 'not_registered'));
      return;
    }

    const texts = this.getMenuTexts(lang);
    await ctx.editMessageText(
      texts.writeChat + '\n\n' + this.getText(lang, 'type_message'),
      Markup.inlineKeyboard([[Markup.button.callback(texts.back, 'menu_main')]])
    );
  }

  /**
   * Helper: Handle check status (called from text or action)
   */
  private async handleCheckStatus(ctx: Context, chatId: string, lang: 'uz' | 'ru' | 'en') {
    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
      if (!telegramUser?.tenantId) {
        await ctx.reply(this.getText(lang, 'not_registered'));
        return;
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: telegramUser.tenantId },
        include: {
          contracts: {
            include: {
              unit: true,
              invoices: {
                include: { payments: true },
                orderBy: { dueDate: 'asc' },
              },
            },
          },
        },
      });

      if (!tenant) {
        await ctx.reply(this.getText(lang, 'tenant_not_found'));
        return;
      }

      // Count invoices and payments
      const totalInvoices = tenant.contracts.flatMap(c => c.invoices).length;
      const pendingInvoices = tenant.contracts
        .flatMap(c => c.invoices)
        .filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE').length;
      const paidInvoices = tenant.contracts
        .flatMap(c => c.invoices)
        .filter(inv => inv.status === 'PAID').length;

      const statusText = lang === 'ru'
        ? `📊 Ваш статус:\n\n` +
          `Имя: ${tenant.fullName}\n` +
          `Email: ${tenant.email || 'N/A'}\n` +
          `Всего счетов: ${totalInvoices}\n` +
          `Ожидающие: ${pendingInvoices}\n` +
          `Оплаченные: ${paidInvoices}`
        : lang === 'en'
        ? `📊 Your Status:\n\n` +
          `Name: ${tenant.fullName}\n` +
          `Email: ${tenant.email || 'N/A'}\n` +
          `Total Invoices: ${totalInvoices}\n` +
          `Pending: ${pendingInvoices}\n` +
          `Paid: ${paidInvoices}`
        : `📊 Sizning statusingiz:\n\n` +
          `Ism: ${tenant.fullName}\n` +
          `Email: ${tenant.email || 'N/A'}\n` +
          `Jami hisoblar: ${totalInvoices}\n` +
          `Kutilayotgan: ${pendingInvoices}\n` +
          `To'langan: ${paidInvoices}`;

      await ctx.reply(statusText);
    } catch (error: any) {
      this.logger.error(`Error checking status: ${error.message}`);
      await ctx.reply(this.getText(lang, 'error_occurred'));
    }
  }

  @Action('menu_check_status')
  async onMenuCheckStatus(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId);
    const lang = state?.language || 'uz';
    await this.handleCheckStatus(ctx, chatId, lang);
  }

  /**
   * Helper: Handle check deadlines (called from text or action)
   */
  private async handleCheckDeadlines(ctx: Context, chatId: string, lang: 'uz' | 'ru' | 'en') {
    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
      if (!telegramUser?.tenantId) {
        await ctx.reply(this.getText(lang, 'not_registered'));
        return;
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: telegramUser.tenantId },
        include: {
          contracts: {
            include: {
              unit: true,
              invoices: {
                where: {
                  status: { in: ['PENDING', 'OVERDUE'] },
                },
                include: { payments: true },
                orderBy: { dueDate: 'asc' },
                take: 10,
              },
            },
          },
        },
      });

      if (!tenant) {
        await ctx.reply(this.getText(lang, 'tenant_not_found'));
        return;
      }

      const pendingInvoices = tenant.contracts.flatMap(c => c.invoices);
      const now = new Date();

      if (pendingInvoices.length === 0) {
        const noDeadlines = lang === 'ru'
          ? '✅ У вас нет ожидающих счетов.'
          : lang === 'en'
          ? '✅ You have no pending invoices.'
          : '✅ Sizda kutilayotgan hisoblar yo\'q.';
        await ctx.reply(noDeadlines);
        return;
      }

      let deadlinesText = lang === 'ru'
        ? '📅 Предстоящие сроки:\n\n'
        : lang === 'en'
        ? '📅 Upcoming Deadlines:\n\n'
        : '📅 Kelgusi muddatlar:\n\n';

      for (const invoice of pendingInvoices.slice(0, 5)) {
        const contract = tenant.contracts.find(c => c.invoices.some(i => i.id === invoice.id));
        const unitName = contract?.unit?.name || 'N/A';
        const dueDate = new Date(invoice.dueDate);
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const amount = invoice.amount.toNumber();

        const status = invoice.status === 'OVERDUE' ? '🔴' : daysLeft <= 3 ? '🟡' : '🟢';

        if (lang === 'ru') {
          deadlinesText += `${status} ${unitName}\n`;
          deadlinesText += `   Сумма: ${amount.toLocaleString()} UZS\n`;
          deadlinesText += daysLeft < 0
            ? `   Просрочено: ${Math.abs(daysLeft)} дн.\n\n`
            : `   Осталось: ${daysLeft} дн.\n\n`;
        } else if (lang === 'en') {
          deadlinesText += `${status} ${unitName}\n`;
          deadlinesText += `   Amount: ${amount.toLocaleString()} UZS\n`;
          deadlinesText += daysLeft < 0
            ? `   Overdue: ${Math.abs(daysLeft)} days\n\n`
            : `   Days left: ${daysLeft}\n\n`;
        } else {
          deadlinesText += `${status} ${unitName}\n`;
          deadlinesText += `   Summa: ${amount.toLocaleString()} UZS\n`;
          deadlinesText += daysLeft < 0
            ? `   Muddati o'tgan: ${Math.abs(daysLeft)} kun\n\n`
            : `   Qolgan: ${daysLeft} kun\n\n`;
        }
      }

      await ctx.reply(deadlinesText);
    } catch (error: any) {
      this.logger.error(`Error checking deadlines: ${error.message}`);
      await ctx.reply(this.getText(lang, 'error_occurred'));
    }
  }

  @Action('menu_check_deadlines')
  async onMenuCheckDeadlines(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId);
    const lang = state?.language || 'uz';
    await this.handleCheckDeadlines(ctx, chatId, lang);
  }

  /**
   * Helper: Handle check balance (called from text or action)
   */
  private async handleCheckBalance(ctx: Context, chatId: string, lang: 'uz' | 'ru' | 'en') {
    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
      if (!telegramUser?.tenantId) {
        await ctx.reply(this.getText(lang, 'not_registered'));
        return;
      }

      const balance = await this.prisma.balance.findUnique({
        where: { tenantId: telegramUser.tenantId },
      });

      const balanceText = lang === 'ru'
        ? `💰 Ваш баланс:\n\n${(balance?.current.toNumber() || 0).toLocaleString()} UZS`
        : lang === 'en'
        ? `💰 Your Balance:\n\n${(balance?.current.toNumber() || 0).toLocaleString()} UZS`
        : `💰 Sizning balansingiz:\n\n${(balance?.current.toNumber() || 0).toLocaleString()} UZS`;

      await ctx.reply(balanceText);
    } catch (error: any) {
      this.logger.error(`Error checking balance: ${error.message}`);
      await ctx.reply(this.getText(lang, 'error_occurred'));
    }
  }

  @Action('menu_check_balance')
  async onMenuCheckBalance(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId);
    const lang = state?.language || 'uz';
    await this.handleCheckBalance(ctx, chatId, lang);
  }

  /**
   * Helper: Handle help (called from text or action)
   */
  private async handleHelp(ctx: Context, lang: 'uz' | 'ru' | 'en') {
    const helpText = lang === 'ru'
      ? `❓ Помощь\n\n` +
        `Этот бот помогает вам:\n` +
        `• Проверять статус ваших счетов\n` +
        `• Просматривать сроки оплаты\n` +
        `• Общаться с администрацией\n` +
        `• Проверять баланс\n\n` +
        `Используйте кнопки меню для навигации.`
      : lang === 'en'
      ? `❓ Help\n\n` +
        `This bot helps you:\n` +
        `• Check your invoice status\n` +
        `• View payment deadlines\n` +
        `• Chat with administration\n` +
        `• Check your balance\n\n` +
        `Use menu buttons to navigate.`
      : `❓ Yordam\n\n` +
        `Bu bot sizga yordam beradi:\n` +
        `• Hisoblaringiz holatini tekshirish\n` +
        `• To'lov muddatlarini ko'rish\n` +
        `• Ma'muriyat bilan suhbatlashish\n` +
        `• Balansingizni tekshirish\n\n` +
        `Navigatsiya uchun menyu tugmalaridan foydalaning.`;

    await ctx.reply(helpText);
  }

  @Action('menu_help')
  async onMenuHelp(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId);
    const lang = state?.language || 'uz';
    await this.handleHelp(ctx, lang);
  }

  @Action('menu_main')
  async onMenuMain(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    await ctx.answerCbQuery();
    const state = this.conversationStates.get(chatId);
    const lang = state?.language || 'uz';
    await this.showMainMenu(ctx, chatId, lang);
  }

  /**
   * Get text by language
   */
  private getText(lang: 'uz' | 'ru' | 'en', key: string): string {
    const texts: Record<string, Record<string, string>> = {
      uz: {
        not_registered: '⚠️ Siz ro\'yxatdan o\'tmagansiz. /start buyrug\'ini yuboring.',
        tenant_not_found: '❌ Hisob topilmadi.',
        error_occurred: '❌ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
        type_message: 'Xabaringizni yozing:',
        complete_registration: '⚠️ Iltimos, ro\'yxatdan o\'tishni yakunlang. /start buyrug\'ini yuboring.',
      },
      ru: {
        not_registered: '⚠️ Вы не зарегистрированы. Отправьте /start.',
        tenant_not_found: '❌ Аккаунт не найден.',
        error_occurred: '❌ Произошла ошибка. Пожалуйста, попробуйте снова.',
        type_message: 'Введите ваше сообщение:',
        complete_registration: '⚠️ Пожалуйста, завершите регистрацию. Отправьте /start.',
      },
      en: {
        not_registered: '⚠️ You are not registered. Send /start.',
        tenant_not_found: '❌ Account not found.',
        error_occurred: '❌ An error occurred. Please try again.',
        type_message: 'Type your message:',
        complete_registration: '⚠️ Please complete registration. Send /start.',
      },
    };

    return texts[lang]?.[key] || texts.uz[key] || key;
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    // Check if user is in registration flow (only ignore during registration steps)
    const state = this.conversationStates.get(chatId);
    if (state && (state.step === 'waiting_name' || state.step === 'waiting_email' || state.step === 'waiting_password' || state.step === 'choosing_language')) {
      return; // Ignore photos during registration
    }

    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({
        where: { chatId },
      });

      if (!telegramUser || !telegramUser.tenantId) {
        await ctx.reply(`⚠️ Siz ro'yxatdan o'tmagansiz. /start buyrug'ini yuboring.`);
        return;
      }

      // Get the largest photo size
      const photo = ctx.message && 'photo' in ctx.message ? ctx.message.photo : [];
      if (photo.length === 0) return;

      const largestPhoto = photo[photo.length - 1]; // Last one is largest
      const fileId = largestPhoto.file_id;

      // Download and store file
      const fileUrl = await this.downloadAndStoreTelegramFile(fileId, 'photo.jpg');
      
      // Get caption if exists
      const caption = ctx.message && 'caption' in ctx.message ? ctx.message.caption : undefined;

      // Add message to conversation
      await this.handleTenantInquiry(chatId, telegramUser.tenantId, caption || '📷 Photo', fileUrl);

      await ctx.reply(`✅ Rasm qabul qilindi! Administrator tez orada javob beradi.`);
    } catch (error: any) {
      this.logger.error(`Error handling photo: ${error.message}`);
      await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
    }
  }

  @On('voice')
  async onVoice(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) {
      this.logger.warn('Received voice message but no chatId found');
      return;
    }

    this.logger.log(`🎤 Received voice message from chatId=${chatId}`);

    // Check if user is in registration flow (only ignore during registration steps)
    const state = this.conversationStates.get(chatId);
    if (state && (state.step === 'waiting_name' || state.step === 'waiting_email' || state.step === 'waiting_password' || state.step === 'choosing_language')) {
      this.logger.debug(`Ignoring voice message during registration for chatId=${chatId}`);
      return; // Ignore voice messages during registration
    }

    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({
        where: { chatId },
      });

      if (!telegramUser || !telegramUser.tenantId) {
        this.logger.warn(`Voice message from unregistered user chatId=${chatId}`);
        await ctx.reply(`⚠️ Siz ro'yxatdan o'tmagansiz. /start buyrug'ini yuboring.`);
        return;
      }

      const voice = ctx.message && 'voice' in ctx.message ? ctx.message.voice : null;
      if (!voice) {
        this.logger.warn(`Voice message has no voice data for chatId=${chatId}`);
        return;
      }

      const fileId = voice.file_id;
      const duration = voice.duration || 0;
      const fileSize = voice.file_size || 0;

      this.logger.log(`📥 Downloading voice file: fileId=${fileId}, duration=${duration}s, size=${fileSize} bytes`);

      // Download and store voice file (as .ogg)
      const fileUrl = await this.downloadAndStoreTelegramFile(fileId, `voice-${Date.now()}.ogg`);
      
      this.logger.log(`✅ Voice file stored at: ${fileUrl}`);

      // Add message to conversation
      await this.handleTenantInquiry(chatId, telegramUser.tenantId, `🎤 Voice message (${Math.floor(duration)}s)`, fileUrl);

      this.logger.log(`✅ Voice message added to conversation for tenant ${telegramUser.tenantId}`);
      await ctx.reply(`✅ Ovozli xabar qabul qilindi! Administrator tez orada javob beradi.`);
    } catch (error: any) {
      this.logger.error(`❌ Error handling voice message: ${error.message}`, error.stack);
      await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
    }
  }

  @On('video_note')
  async onVideoNote(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    // Check if user is in registration flow (only ignore during registration steps)
    const state = this.conversationStates.get(chatId);
    if (state && (state.step === 'waiting_name' || state.step === 'waiting_email' || state.step === 'waiting_password' || state.step === 'choosing_language')) {
      return; // Ignore video notes during registration
    }

    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({
        where: { chatId },
      });

      if (!telegramUser || !telegramUser.tenantId) {
        await ctx.reply(`⚠️ Siz ro'yxatdan o'tmagansiz. /start buyrug'ini yuboring.`);
        return;
      }

      const videoNote = ctx.message && 'video_note' in ctx.message ? ctx.message.video_note : null;
      if (!videoNote) return;

      const fileId = videoNote.file_id;
      const duration = videoNote.duration || 0;

      // Download and store video note
      const fileUrl = await this.downloadAndStoreTelegramFile(fileId, 'video_note.mp4');

      // Add message to conversation
      await this.handleTenantInquiry(chatId, telegramUser.tenantId, `📹 Video note (${Math.floor(duration)}s)`, fileUrl);

      await ctx.reply(`✅ Video xabar qabul qilindi! Administrator tez orada javob beradi.`);
    } catch (error: any) {
      this.logger.error(`Error handling video note: ${error.message}`);
      await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
    }
  }

  @On('video')
  async onVideo(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    // Check if user is in registration flow (only ignore during registration steps)
    const state = this.conversationStates.get(chatId);
    if (state && (state.step === 'waiting_name' || state.step === 'waiting_email' || state.step === 'waiting_password' || state.step === 'choosing_language')) {
      return; // Ignore videos during registration
    }

    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({
        where: { chatId },
      });

      if (!telegramUser || !telegramUser.tenantId) {
        await ctx.reply(`⚠️ Siz ro'yxatdan o'tmagansiz. /start buyrug'ini yuboring.`);
        return;
      }

      const video = ctx.message && 'video' in ctx.message ? ctx.message.video : null;
      if (!video) return;

      const fileId = video.file_id;
      const fileName = video.file_name || 'video.mp4';
      const duration = video.duration || 0;

      // Download and store video
      const fileUrl = await this.downloadAndStoreTelegramFile(fileId, fileName);

      // Get caption if exists
      const caption = ctx.message && 'caption' in ctx.message ? ctx.message.caption : undefined;

      // Add message to conversation
      await this.handleTenantInquiry(chatId, telegramUser.tenantId, caption || `🎥 Video (${Math.floor(duration)}s)`, fileUrl);

      await ctx.reply(`✅ Video qabul qilindi! Administrator tez orada javob beradi.`);
    } catch (error: any) {
      this.logger.error(`Error handling video: ${error.message}`);
      await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
    }
  }

  @On('document')
  async onDocument(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    // Check if user is in registration flow (only ignore during registration steps)
    const state = this.conversationStates.get(chatId);
    if (state && (state.step === 'waiting_name' || state.step === 'waiting_email' || state.step === 'waiting_password' || state.step === 'choosing_language')) {
      return; // Ignore documents during registration
    }

    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({
        where: { chatId },
      });

      if (!telegramUser || !telegramUser.tenantId) {
        await ctx.reply(`⚠️ Siz ro'yxatdan o'tmagansiz. /start buyrug'ini yuboring.`);
        return;
      }

      const document = ctx.message && 'document' in ctx.message ? ctx.message.document : null;
      if (!document) return;

      const fileId = document.file_id;
      const fileName = document.file_name || 'document';

      // Download and store file
      const fileUrl = await this.downloadAndStoreTelegramFile(fileId, fileName);

      // Get caption if exists
      const caption = ctx.message && 'caption' in ctx.message ? ctx.message.caption : undefined;

      // Add message to conversation
      await this.handleTenantInquiry(chatId, telegramUser.tenantId, caption || `📎 ${fileName}`, fileUrl);

      await ctx.reply(`✅ Fayl qabul qilindi! Administrator tez orada javob beradi.`);
    } catch (error: any) {
      this.logger.error(`Error handling document: ${error.message}`);
      await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
    }
  }

  @On('text')
  async onMessage(@Ctx() ctx: Context) {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) {
      this.logger.warn('Received text message but no chatId found');
      return;
    }

    const message = (ctx.message && 'text' in ctx.message) ? ctx.message.text : '';
    this.logger.log(`📨 Received text message from chatId=${chatId}, userId=${ctx.from?.id}: "${message}"`);
    
    // Ignore commands
    if (message.startsWith('/')) return;

    // Check if user is in registration flow
    const state = this.conversationStates.get(chatId);
    const lang = state?.language || 'uz';

    if (state) {
      // Handle language selection (button clicks)
      if (state.step === 'choosing_language') {
        if (message.includes('🇺🇿') || message.includes("O'zbek")) {
          state.language = 'uz';
          state.step = 'waiting_name';
          this.conversationStates.set(chatId, state);
          await ctx.reply(`👋 Darital botiga xush kelibsiz!\n\nRo'yxatdan o'tish uchun, iltimos, ma'lumotlaringizni kiriting.\n\nIsm va familiyangizni kiriting:`, Markup.removeKeyboard());
          return;
        } else if (message.includes('🇷🇺') || message.includes('Русский')) {
          state.language = 'ru';
          state.step = 'waiting_name';
          this.conversationStates.set(chatId, state);
          await ctx.reply(`👋 Добро пожаловать в бот Darital!\n\nДля регистрации, пожалуйста, введите ваши данные.\n\nВведите ваше имя и фамилию:`, Markup.removeKeyboard());
          return;
        } else if (message.includes('🇬🇧') || message.includes('English')) {
          state.language = 'en';
          state.step = 'waiting_name';
          this.conversationStates.set(chatId, state);
          await ctx.reply(`👋 Welcome to Darital Bot!\n\nTo register, please enter your information.\n\nEnter your full name:`, Markup.removeKeyboard());
          return;
        }
      }

      // Handle menu button clicks
      if (state.step === 'main_menu') {
        const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
        const texts = this.getMenuTexts(lang);

        // Check if message matches any menu button (exact match or contains button text)
        // IMPORTANT: Return early to prevent button text from being sent to conversation
        const messageUpper = message.toUpperCase();
        const writeChatText = texts.writeChat.toUpperCase().replace(/💬\s*/g, '').trim();
        if (message === texts.writeChat || 
            message.trim() === texts.writeChat.replace(/💬\s*/g, '').trim() || 
            messageUpper.includes('CHAT') && messageUpper.includes('BOSHLASH') ||
            messageUpper.includes('CHATNI') || 
            messageUpper.includes('BOSHLASH') ||
            message.includes('чат') || 
            message.includes('yozish')) {
          if (!telegramUser?.tenantId) {
            await ctx.reply(this.getText(lang, 'not_registered'));
            return; // Exit early - don't send button text to conversation
          }
          // Set state to writing_chat so next message is treated as chat message
          state.step = 'writing_chat';
          this.conversationStates.set(chatId, state);
          await ctx.reply(this.getText(lang, 'type_message'));
          return; // Exit early - don't send button text to conversation
        } else if (message === texts.checkStatus || message === texts.checkStatus.replace(/📊\s*/g, '').trim() || (message.includes('Status') && !message.includes(' ')) || message.includes('статус') || message.includes('Statusni')) {
          if (!telegramUser?.tenantId) {
            await ctx.reply(this.getText(lang, 'not_registered'));
            return; // Exit early
          }
          await this.handleCheckStatus(ctx, chatId, lang);
          return; // Exit early - don't send button text to conversation
        } else if (message === texts.checkDeadlines || message === texts.checkDeadlines.replace(/📅\s*/g, '').trim() || (message.includes('Deadline') && !message.includes(' ')) || message.includes('сроки') || message.includes('Muddat')) {
          if (!telegramUser?.tenantId) {
            await ctx.reply(this.getText(lang, 'not_registered'));
            return; // Exit early
          }
          await this.handleCheckDeadlines(ctx, chatId, lang);
          return; // Exit early - don't send button text to conversation
        } else if (message === texts.checkBalance || message === texts.checkBalance.replace(/💰\s*/g, '').trim() || (message.includes('Balance') && !message.includes(' ')) || message.includes('баланс') || message.includes('Balans')) {
          if (!telegramUser?.tenantId) {
            await ctx.reply(this.getText(lang, 'not_registered'));
            return; // Exit early
          }
          await this.handleCheckBalance(ctx, chatId, lang);
          return; // Exit early - don't send button text to conversation
        } else if (message === texts.changeLanguage || message === texts.changeLanguage.replace(/🌐\s*/g, '').trim() || message.includes('Language') || message.includes('язык') || message.includes('Tilni')) {
          await this.showLanguageSelection(ctx);
          state.step = 'choosing_language';
          this.conversationStates.set(chatId, state);
          return; // Exit early - don't send button text to conversation
        } else if (message === texts.help || message === texts.help.replace(/❓\s*/g, '').trim() || message.includes('Help') || message.includes('Помощь') || message.includes('Yordam')) {
          await this.handleHelp(ctx, lang);
          return; // Exit early - don't send button text to conversation
        }
        // If no button matched and user is registered, treat as chat message
        if (telegramUser?.tenantId) {
          // Proceed to handle as regular message below
        } else {
          await ctx.reply(this.getText(lang, 'complete_registration'));
          return; // Exit early
        }
      }

      // Handle writing chat state - user clicked "Write Chat" button and is now typing
      if (state.step === 'writing_chat') {
        const telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
        if (!telegramUser?.tenantId) {
          await ctx.reply(this.getText(lang, 'not_registered'));
          return;
        }
        // User is writing a chat message - send it to conversation
        // (This will be handled by the code below that calls handleTenantInquiry)
      }

      // Handle registration steps
      if (state.step === 'waiting_name' || state.step === 'waiting_email' || state.step === 'waiting_password') {
    try {
      switch (state.step) {
        case 'waiting_name':
          await this.handleNameInput(ctx, chatId, message, state);
          break;
        case 'waiting_email':
          await this.handleEmailInput(ctx, chatId, message, state);
          break;
        case 'waiting_password':
          await this.handlePasswordInput(ctx, chatId, message, state);
          break;
      }
    } catch (error) {
      this.logger.error(`Error in conversation: ${error.message}`);
      await ctx.reply(
        `❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.\n\n` +
        `Bekor qilish uchun: /bekor`
      );
        }
        return;
      }
    }

    // If not in registration, check if user is already registered
    // If yes, treat as support inquiry and create conversation/message
    try {
      const telegramUser = await this.prisma.telegramUser.findUnique({
        where: { chatId },
      });

      if (!telegramUser || !telegramUser.tenantId) {
        // User not registered, prompt to start
        await ctx.reply(
          `⚠️ Siz ro'yxatdan o'tmagansiz.\n\n` +
          `Ro'yxatdan o'tish uchun /start buyrug'ini yuboring.\n\n` +
          `Yordam uchun: /help`
        );
        return;
      }

      // User is registered, create/find conversation and add message
      await this.handleTenantInquiry(chatId, telegramUser.tenantId, message);
      
      // Confirm message received
      await ctx.reply(
        `✅ Xabaringiz qabul qilindi! Administrator tez orada javob beradi.\n\n` +
        `Yaxshi xizmat uchun rahmat! 🙏`
      );
    } catch (error: any) {
      this.logger.error(`Error handling tenant inquiry: ${error.message}`);
      await ctx.reply(
        `❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`
      );
    }
  }

  /**
   * Handle tenant inquiry from Telegram
   * Always uses the same OPEN/PENDING conversation per tenant (single tab per user)
   */
  private async handleTenantInquiry(chatId: string, tenantId: string, content?: string, fileUrl?: string) {
    // ALWAYS find the most recent OPEN/PENDING conversation for this tenant (single tab per user)
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        status: { in: ['PENDING', 'OPEN'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      // Create new conversation only if no OPEN/PENDING exists
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          topic: `Telegram Chat`,
          status: 'PENDING',
        },
      });
      this.logger.log(`Created new conversation ${conversation.id} for Telegram from tenant ${tenantId}`);
    }

    // Build fileUrl: if file was provided, use it; otherwise mark as Telegram message
    const finalFileUrl = fileUrl || `telegram:${chatId}`;

    // Create message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderRole: 'TENANT',
        senderId: tenantId,
        content: content || (fileUrl ? '📎 File attached' : ''),
        fileUrl: finalFileUrl,
        status: 'SENT',
      },
    });

    this.logger.log(`Added Telegram message to conversation ${conversation.id} from tenant ${tenantId}${fileUrl ? ` with file: ${fileUrl}` : ''}`);

    // Update conversation updatedAt
    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
      include: {
        tenant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Emit socket events for real-time updates (if ChatGateway is available)
    const gateway = this.getChatGateway();
    if (gateway) {
      try {
        // Get the created message to emit
        const createdMessage = await this.prisma.message.findFirst({
          where: {
            conversationId: conversation.id,
            senderId: tenantId,
            fileUrl: finalFileUrl,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (createdMessage) {
          gateway.emitMessageCreated(conversation.id, {
            ...createdMessage,
            content: createdMessage.content || undefined,
            fileUrl: createdMessage.fileUrl || undefined,
            createdAt: createdMessage.createdAt.toISOString(),
          });
          gateway.emitConversationUpdated(updatedConversation);
          this.logger.log(`✅ Emitted socket events for Telegram message in conversation ${conversation.id}`);
        }
      } catch (error: any) {
        // Don't fail if socket emission fails
        this.logger.debug(`Socket emission failed (non-critical): ${error.message}`);
      }
    }
  }

  /**
   * Get ChatGateway instance lazily to avoid circular dependency
   */
  private getChatGateway(): ChatGateway | null {
    if (!this.chatGateway && this.moduleRef) {
      try {
        this.chatGateway = this.moduleRef.get(ChatGateway, { strict: false });
      } catch {
        // Gateway not available yet (during module initialization)
        return null;
      }
    }
    return this.chatGateway;
  }

  /**
   * Download file from Telegram and store it (MinIO or local storage)
   */
  private async downloadAndStoreTelegramFile(fileId: string, fileName?: string): Promise<string> {
    try {
      // Get file info from Telegram
      const fileInfo = await this.bot.telegram.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;

      // Download file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file from Telegram: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';
      const ext = fileName ? fileName.split('.').pop() : fileInfo.file_path?.split('.').pop() || 'bin';
      const safeName = fileName || `telegram-${fileId}.${ext}`;

      // Try to upload to MinIO first (if enabled and available)
      if (this.minioService) {
        try {
          // Create a temporary file object for MinIO
          const tempFile: Express.Multer.File = {
            fieldname: 'file',
            originalname: safeName,
            encoding: '7bit',
            mimetype: mimeType,
            size: buffer.length,
            buffer: buffer,
            destination: '',
            filename: safeName,
            path: '',
            stream: null as any,
          };

          const url = await this.minioService.uploadFile(tempFile, 'chat');
          this.logger.log(`✅ Uploaded Telegram file to MinIO: ${url}`);
          return url;
        } catch (minioError: any) {
          // If MinIO fails (not configured, disabled, or error), fall back to local storage
          this.logger.warn(`MinIO upload failed (${minioError.message || 'unknown error'}), falling back to local storage`);
          // Continue to local storage fallback below
        }
      }

      // Fallback to local storage
      const uploadsDir = join(__dirname, '..', '..', 'uploads', 'chat');
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }

      const safeFileName = `${Date.now()}-${safeName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = join(uploadsDir, safeFileName);
      writeFileSync(filePath, buffer);

      const url = `/uploads/chat/${safeFileName}`;
      this.logger.log(`✅ Saved Telegram file locally: ${url}`);
      return url;
    } catch (error: any) {
      this.logger.error(`Failed to download/store Telegram file: ${error.message}`);
      throw error;
    }
  }

  private async handleNameInput(ctx: Context, chatId: string, name: string, state: ConversationState) {
    if (name.length < 2) {
      await ctx.reply(`❌ Ism juda qisqa. Iltimos, to'liq ism va familiyangizni kiriting:`);
      return;
    }

    state.name = name;
    state.step = 'waiting_email';
    this.conversationStates.set(chatId, state);

    await ctx.reply(`Rahmat! Endi email manzilingizni kiriting:`);
  }

  private async handleEmailInput(ctx: Context, chatId: string, email: string, state: ConversationState) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await ctx.reply(`❌ Noto'g'ri email format. Iltimos, to'g'ri email kiriting:`);
      return;
    }

    state.email = email;
    state.step = 'waiting_password';
    this.conversationStates.set(chatId, state);

    await ctx.reply(`Email qabul qilindi. Endi parolingizni kiriting:`);
  }

  private async handlePasswordInput(ctx: Context, chatId: string, password: string, state: ConversationState) {
    const { email } = state;

    // Try to find and verify tenant
    const tenant = await this.prisma.tenant.findUnique({ where: { email } });
    
    if (!tenant) {
      await ctx.reply(
        `❌ Bu email bilan hisob topilmadi.\n\n` +
        `Iltimos, to'g'ri email kiritganingizni tekshiring yoki administratorga murojaat qiling.\n\n` +
        `Qaytadan boshlash uchun: /start`
      );
      this.conversationStates.delete(chatId);
      return;
    }

    // Verify password against Tenant table
    const isPasswordValid = await bcrypt.compare(password, tenant.password);
    
    if (!isPasswordValid) {
      await ctx.reply(
        `❌ Parol noto'g'ri.\n\n` +
        `Iltimos, qaytadan urinib ko'ring.\n\n` +
        `Bekor qilish uchun: /bekor`
      );
      // Reset to waiting for password again
      state.step = 'waiting_password';
      this.conversationStates.set(chatId, state);
      return;
    }

    // Check if user with this email exists (for role assignment)
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    // Map AdminRole to Role for TelegramUser
    let telegramUserRole: Role;
    if (user?.role === AdminRole.TENANT_USER) {
      telegramUserRole = Role.TENANT;
    } else if (user?.role) {
      // If it's any other AdminRole, treat as ADMIN for telegram purposes
      telegramUserRole = Role.ADMIN;
    } else {
      // Default to TENANT if no user found (shouldn't happen if tenant was found)
      telegramUserRole = Role.TENANT;
    }

    // Create or update TelegramUser
    let telegramUser = await this.prisma.telegramUser.findUnique({ where: { chatId } });
    
    if (!telegramUser) {
      telegramUser = await this.prisma.telegramUser.create({
        data: {
          chatId,
          tenantId: tenant.id,
          role: telegramUserRole,
        },
      });
      this.logger.log(`New TelegramUser created and linked: chatId=${chatId}, tenantId=${tenant.id}`);
    } else {
      await this.prisma.telegramUser.update({
        where: { chatId },
        data: {
          tenantId: tenant.id,
          role: telegramUserRole,
        },
      });
      this.logger.log(`TelegramUser linked: chatId=${chatId}, tenantId=${tenant.id}`);
    }

    // Get language from state or default to Uzbek
    const lang = state.language || 'uz';

    // Update conversation state to main_menu
    this.conversationStates.set(chatId, { step: 'main_menu', language: lang });

    // Show success message
    const successText = lang === 'ru'
      ? `✅ Успешно подключено!\n\n` +
        `Имя: ${tenant.fullName}\n` +
        `Email: ${tenant.email}\n` +
        `Роль: ${telegramUser.role}`
      : lang === 'en'
      ? `✅ Successfully connected!\n\n` +
        `Name: ${tenant.fullName}\n` +
        `Email: ${tenant.email}\n` +
        `Role: ${telegramUser.role}`
      : `✅ Muvaffaqiyatli ulandi!\n\n` +
      `Ism: ${tenant.fullName}\n` +
      `Email: ${tenant.email}\n` +
        `Rol: ${telegramUser.role}`;

    await ctx.reply(successText);

    // Show main menu
    await this.showMainMenu(ctx, chatId, lang);
  }

  /**
   * Send a message to a Telegram user by chatId
   * This is the main method for sending messages from admin panel
   */
  async sendMessage(chatId: string, message: string, imageUrl?: string): Promise<void> {
    const enabled = process.env.TELEGRAM_ENABLE === 'true';
    if (!enabled) {
      this.logger.warn('Telegram bot is disabled - message not sent');
      throw new Error('Telegram bot is disabled');
    }

    try {
      if (imageUrl) {
        // Send message with image
        await this.bot.telegram.sendPhoto(chatId, imageUrl, {
          caption: message,
          parse_mode: 'HTML',
        });
        this.logger.log(`✅ Telegram message with image sent to chatId=${chatId}`);
      } else {
        // Send text message only
        await this.bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'HTML',
        });
        this.logger.log(`✅ Telegram message sent to chatId=${chatId}`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to send Telegram message to chatId=${chatId}: ${error?.message || error}`);
      
      // Handle specific Telegram API errors
      if (error?.response?.error_code === 403) {
        throw new Error(`User blocked the bot or bot was removed. chatId: ${chatId}`);
      }
      if (error?.response?.error_code === 400) {
        throw new Error(`Invalid chatId or message format. chatId: ${chatId}`);
      }
      
      throw error;
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{ id: number; is_bot: boolean; first_name: string; username?: string; can_join_groups?: boolean; can_read_all_group_messages?: boolean; supports_inline_queries?: boolean }> {
    try {
      const botInfo = await this.bot.telegram.getMe();
      return botInfo;
    } catch (error: any) {
      this.logger.error(`Failed to get bot info: ${error?.message || error}`);
      throw error;
    }
  }
}

