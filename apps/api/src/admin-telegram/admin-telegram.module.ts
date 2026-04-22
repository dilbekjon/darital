import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { AdminTelegramService } from './admin-telegram.service';

@Module({
  imports: [AuthModule, MailModule],
  providers: [AdminTelegramService],
  exports: [AdminTelegramService],
})
export class AdminTelegramModule {}
