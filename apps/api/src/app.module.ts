import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
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
import { ThrottlerModule } from '@nestjs/throttler';
import { SentryModule } from './sentry/sentry.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';
import { BuildingsModule } from './buildings/buildings.module';
import { DocumentsModule } from './documents/documents.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { InAppNotificationsModule } from './in-app-notifications/in-app-notifications.module';
import { ExportsModule } from './exports/exports.module';
import { BulkActionsModule } from './bulk-actions/bulk-actions.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { ArchiveModule } from './archive/archive.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './rbac/permissions.guard';
import { CustomThrottlerGuard } from './telegram/custom-throttler.guard';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    PrismaModule, // Import PrismaModule first so PrismaService is available globally
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
    BuildingsModule,
    DocumentsModule,
    ReceiptsModule,
    InAppNotificationsModule,
    ExportsModule,
    BulkActionsModule,
    EmailTemplatesModule,
    ArchiveModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter, // Register global exception filter via DI
    },
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

