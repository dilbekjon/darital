import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Update, Ctx, Start, Help, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { AdminRole, Role } from '@prisma/client'; // Import AdminRole and Role enums

// Conversation state management
interface ConversationState {
  step: 'waiting_name' | 'waiting_email' | 'waiting_password' | 'completed';
  name?: string;
  email?: string;
}

@Update()
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private conversationStates = new Map<string, ConversationState>();

  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {
    // Add error handler to catch polling conflicts
    this.bot.catch((err: any, ctx: Context) => {
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
      const tenant = await this.prisma.tenant.findUnique({ where: { id: telegramUser.tenantId } });
      await ctx.reply(
        `✅ Siz allaqachon bog'langansiz!\n\n` +
        `Ism: ${tenant?.fullName || 'Noma\'lum'}\n` +
        `Email: ${tenant?.email || 'N/A'}\n` +
        `Rol: ${telegramUser.role}\n\n` +
        `Yordam uchun: /help`
      );
        this.logger.log(`✅ Sent welcome message to existing user: chatId=${chatId}`);
      return;
    }

    // Start new registration conversation
    this.conversationStates.set(chatId, { step: 'waiting_name' });
    
    await ctx.reply(
      `👋 Darital botiga xush kelibsiz!\n\n` +
      `Ro'yxatdan o'tish uchun, iltimos, ma'lumotlaringizni kiriting.\n\n` +
      `Ism va familiyangizni kiriting:`
    );
    
      this.logger.log(`✅ Registration started for chatId=${chatId}`);
    } catch (error: any) {
      this.logger.error(`❌ Error handling /start command: ${error?.message || error}`);
      try {
        await ctx.reply(`❌ Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`);
      } catch (replyError) {
        this.logger.error(`Failed to send error message: ${replyError}`);
      }
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

    const state = this.conversationStates.get(chatId);
    if (!state) return;

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

    // Clear conversation state
    this.conversationStates.delete(chatId);

    await ctx.reply(
      `✅ Muvaffaqiyatli ulandi!\n\n` +
      `Ism: ${tenant.fullName}\n` +
      `Email: ${tenant.email}\n` +
      `Rol: ${telegramUser.role}\n\n` +
      `Endi siz barcha bildirishnomalarni qabul qilasiz.\n\n` +
      `Yordam uchun: /help`
    );
  }
}

