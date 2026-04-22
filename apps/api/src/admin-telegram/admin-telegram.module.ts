import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTelegramService } from './admin-telegram.service';

@Module({
  imports: [AuthModule],
  providers: [AdminTelegramService],
  exports: [AdminTelegramService],
})
export class AdminTelegramModule {}
