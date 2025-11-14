import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { notificationQueue, ReminderJobData } from './bullmq.provider';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every day at 09:00
  @Cron('0 9 * * *')
  async scheduleReminders() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const threeDays = addDays(todayStart, 3);
    const threeDaysStart = startOfDay(threeDays);
    const threeDaysEnd = endOfDay(threeDays);

    const cancelThreshold = addDays(todayStart, -17);

    // BEFORE_3_DAYS: due in exactly 3 days
    const dueIn3Days = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: threeDaysStart,
          lte: threeDaysEnd,
        },
      },
      include: {
        contract: true,
      },
    });

    // ON_DUE_DATE: due today
    const dueToday = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        contract: true,
      },
    });

    // CANCEL_WARNING: dueDate < today - 17 days
    const cancelWarning = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          lt: cancelThreshold,
        },
      },
      include: {
        contract: true,
      },
    });

    // LATE: past due but not yet in cancel warning window
    const late = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          lt: todayStart,
          gte: cancelThreshold,
        },
      },
      include: {
        contract: true,
      },
    });

    const jobs: ReminderJobData[] = [];

    for (const inv of dueIn3Days) {
      jobs.push({ tenantId: inv.contract.tenantId, invoiceId: inv.id, type: 'BEFORE_3_DAYS' });
    }
    for (const inv of dueToday) {
      jobs.push({ tenantId: inv.contract.tenantId, invoiceId: inv.id, type: 'ON_DUE_DATE' });
    }
    for (const inv of late) {
      jobs.push({ tenantId: inv.contract.tenantId, invoiceId: inv.id, type: 'LATE' });
    }
    for (const inv of cancelWarning) {
      jobs.push({ tenantId: inv.contract.tenantId, invoiceId: inv.id, type: 'CANCEL_WARNING' });
    }

    if (jobs.length === 0) {
      this.logger.log('No reminder jobs to enqueue for today');
      return;
    }

    // Enqueue in bulk
    await notificationQueue.addBulk(
      jobs.map((data) => ({ name: 'reminder', data }))
    );

    this.logger.log(`Enqueued ${jobs.length} reminder job(s)`);
  }
}
