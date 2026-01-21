import { Module, Logger } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { MinioModule } from '../minio/minio.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MinioModule,
    ChatModule, // Import ChatModule to access ChatGateway
    TelegrafModule.forRootAsync({
      useFactory: async () => {
        const logger = new Logger('TelegramModule');
        const enabled = process.env.TELEGRAM_ENABLE === 'true';
        const token = process.env.TELEGRAM_BOT_TOKEN || '';
        
        logger.log(`Telegram Bot Configuration: enabled=${enabled}, token=${token ? '***' + token.slice(-4) : 'NOT SET'}`);
        
        // If Telegram is not enabled or no token, use a dummy token and disable polling
        if (!enabled || !token) {
          logger.warn('Telegram bot is DISABLED - TELEGRAM_ENABLE must be "true" and TELEGRAM_BOT_TOKEN must be set');
          return {
            token: 'disabled',
            launchOptions: { polling: false },
            skipUpdates: true,
          } as any;
        }
        
        logger.log('✅ Telegram bot is ENABLED and will start polling');
        
        // Clear any pending updates first to avoid conflicts
        try {
          const clearUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=-1&timeout=1`;
          await fetch(clearUrl).catch(() => {}); // Ignore errors, just try to clear
          logger.log('Cleared pending updates');
        } catch (e) {
          // Ignore
        }
        
        // Wait longer to let any previous instance finish polling
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        return {
          token,
          launchOptions: {
            polling: {
              timeout: 30,
              limit: 100,
              allowedUpdates: ['message', 'callback_query'],
              dropPendingUpdates: true, // Drop pending updates to avoid conflicts
            },
          },
        } as any;
      },
    }),
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegrafModule, TelegramService],
})
export class TelegramModule {}

