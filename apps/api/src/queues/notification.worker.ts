import 'reflect-metadata';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReminderJobData } from './bullmq.provider';

async function bootstrapWorker() {
  const appContext = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });

  const prisma = appContext.get(PrismaService);
  const notifications = appContext.get(NotificationsService);

  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<ReminderJobData>(
    'notifications',
    async (job: Job<ReminderJobData>) => {
      if (job.name !== 'reminder') return;
      const { tenantId, invoiceId, type } = job.data;

      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
          console.warn(`Tenant not found for reminder job: tenantId=${tenantId}`);
          return;
        }

        await notifications.sendReminder(tenant, type, invoiceId);
        console.log(`✅ Sent reminder to Tenant ${tenant.fullName} for invoice ${invoiceId} [${type}]`);
      } catch (err: any) {
        console.error(`❌ Failed to process reminder job for tenantId=${tenantId}, invoiceId=${invoiceId}:`, err?.message || err);
        throw err; // Let BullMQ handle retries
      }
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`🎯 Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed: ${err?.message || err}`);
  });

  const shutdown = async () => {
    await worker.close();
    await connection.quit();
    await appContext.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrapWorker().catch((error) => {
  console.error('❌ Failed to start notification worker:', error);
  process.exit(1);
});
