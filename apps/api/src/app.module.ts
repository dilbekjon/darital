import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UnitsModule } from './units/units.module';
import { TenantsModule } from './tenants/tenants.module';
import { ContractsModule } from './contracts/contracts.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { BalancesModule } from './balances/balances.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TelegramModule } from './telegram/telegram.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantPortalModule } from './tenant-portal/tenant-portal.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SentryModule } from './sentry/sentry.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './rbac/permissions.guard';
import { CustomThrottlerGuard } from './telegram/custom-throttler.guard';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 60 seconds (1 minute)
          limit: 100, // 100 requests per minute (global default)
        },
      ],
    }),
    SentryModule,
    UsersModule,
    AuthModule,
    UnitsModule,
    TenantsModule,
    ContractsModule,
    InvoicesModule,
    PaymentsModule,
    BalancesModule,
    MailModule,
    NotificationsModule,
    TelegramModule, // Enable Telegram bot
    TenantPortalModule,
    AuditLogsModule,
    ChatModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard, // Custom guard that skips Telegram messages
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Apply JwtAuthGuard globally
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // Apply PermissionsGuard globally after JwtAuthGuard
    },
  ],
})
export class AppModule {}

