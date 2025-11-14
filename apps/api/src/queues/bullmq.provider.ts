import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export type ReminderType = 'BEFORE_3_DAYS' | 'ON_DUE_DATE' | 'LATE' | 'CANCEL_WARNING';

export interface ReminderJobData {
  tenantId: string;
  invoiceId: string;
  type: ReminderType;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue<ReminderJobData>('notifications', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
  },
});
