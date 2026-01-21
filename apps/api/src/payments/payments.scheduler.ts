import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);
  private dbReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {
    // Check database readiness on initialization
    this.checkDatabaseReady();
  }

  async checkDatabaseReady(): Promise<void> {
    try {
      this.dbReady = await this.prisma.areCronTablesReady();
      if (this.dbReady) {
        this.logger.log('✅ Database tables ready for payments scheduler');
      }
    } catch (error: any) {
      this.logger.warn(`Database readiness check failed: ${error?.message || error}`);
      this.dbReady = false;
    }
  }

  // Check pending CheckoutUz payments every 2 minutes
  @Cron('*/2 * * * *') // Every 2 minutes
  async checkPendingCheckoutUzPayments(): Promise<void> {
    // Check database readiness before running
    if (!this.dbReady) {
      this.logger.warn('⏸️ Skipping payment checks - database tables not ready. Run migrations: npx prisma migrate deploy');
      // Re-check in case migrations were applied
      await this.checkDatabaseReady();
      if (!this.dbReady) {
        return;
      }
    }

    try {
      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.UZUM as any,
          providerPaymentId: { not: null } as any,
        },
        include: { invoice: true },
      });

      if (pendingPayments.length === 0) {
        return;
      }

      this.logger.log(`Checking ${pendingPayments.length} pending CheckoutUz payment(s)...`);

      let receivedCount = 0;
      for (const payment of pendingPayments) {
        try {
          const result = await this.paymentsService.refreshCheckoutUzPayment(payment.id);
          // Payment is now kept as PENDING for admin verification
          if (result?.pending || result?.alreadyConfirmed) {
            if (result?.pending) {
              receivedCount++;
              this.logger.log(`Payment ${payment.id} received, awaiting admin verification`);
            } else if (result?.alreadyConfirmed) {
              // Already confirmed (shouldn't happen for new flow, but handle gracefully)
              receivedCount++;
              this.logger.log(`Payment ${payment.id} already confirmed`);
            }
          }
        } catch (error: any) {
          this.logger.warn(`Failed to refresh payment ${payment.id}: ${error?.message || error}`);
        }
      }

      if (receivedCount > 0) {
        this.logger.log(`✅ Processed ${receivedCount} payment(s), awaiting admin verification`);
      }
    } catch (error: any) {
      // Handle table not found errors gracefully
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        this.logger.error(`❌ Database table missing: ${error?.message}`);
        this.logger.error('   Run migrations: npx prisma migrate deploy');
        this.dbReady = false;
        return;
      }
      this.logger.error(`Error checking pending payments: ${error?.message || error}`);
    }
  }
}
