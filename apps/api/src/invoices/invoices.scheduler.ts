import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoiceStatus } from '@prisma/client';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffInDays(a: Date, b: Date): number {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

@Injectable()
export class InvoicesScheduler {
  private readonly logger = new Logger(InvoicesScheduler.name);
  private dbReady = false;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {
    // Check database readiness on initialization
    this.checkDatabaseReady();
  }

  async checkDatabaseReady(): Promise<void> {
    try {
      this.dbReady = await this.prisma.areCronTablesReady();
      if (this.dbReady) {
        this.logger.log('✅ Database tables ready for invoice scheduler');
      }
    } catch (error: any) {
      this.logger.warn(`Database readiness check failed: ${error?.message || error}`);
      this.dbReady = false;
    }
  }

  // Every day at 09:00
  @Cron('0 9 * * *')
  async handleDailyInvoiceChecks(): Promise<void> {
    // Check database readiness before running
    if (!this.dbReady) {
      this.logger.warn('⏸️ Skipping invoice checks - database tables not ready. Run migrations: npx prisma migrate deploy');
      // Re-check in case migrations were applied
      await this.checkDatabaseReady();
      if (!this.dbReady) {
        return;
      }
    }

    try {
      this.logger.log('Running daily invoice checks...');
      const today = startOfDay(new Date());

      const invoices = await this.prisma.invoice.findMany({
        where: { status: InvoiceStatus.PENDING },
        include: { contract: { include: { tenant: true, unit: true } } },
      });

      for (const inv of invoices) {
        const due = startOfDay(new Date(inv.dueDate));
        const daysUntilDue = diffInDays(due, today); // positive if in future
        const tenant = inv.contract.tenant;
        const unit = inv.contract.unit;

        // Skip if tenant has no email
        if (!tenant?.email) continue;

        if (daysUntilDue === 3) {
          // Reminder 3 days before due date
          await this.notifications.sendPaymentReminder(
            tenant.id,
            tenant.email,
            inv.dueDate,
            inv.amount.toNumber(),
            unit?.name || 'Unit'
          );
          this.logger.log(`Reminder sent to ${tenant.email} (Email + Telegram)`);
        } else if (due.getTime() < today.getTime()) {
          // Overdue: mark and notify
          const daysLate = diffInDays(today, due);
          await this.prisma.invoice.update({ where: { id: inv.id }, data: { status: InvoiceStatus.OVERDUE } });
          await this.notifications.sendOverdueNotice(
            tenant.id,
            tenant.email,
            inv.amount.toNumber(),
            daysLate
          );
          this.logger.log(`Overdue notice sent to ${tenant.email} (Email + Telegram)`);
        }
      }

      this.logger.log('Daily invoice checks completed.');
    } catch (error: any) {
      // Handle table not found errors gracefully
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        this.logger.error(`❌ Database table missing: ${error?.message}`);
        this.logger.error('   Run migrations: npx prisma migrate deploy');
        this.dbReady = false;
        return;
      }
      this.logger.error(`Error in daily invoice checks: ${error?.message || error}`);
      throw error;
    }
  }
}


