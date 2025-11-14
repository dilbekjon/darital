import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private isInitialized = false;

  onModuleInit() {
    const dsn = process.env.SENTRY_DSN;

    if (dsn) {
      try {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV || 'development',
          // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
          // Adjust this value in production as needed
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        });

        this.isInitialized = true;
        this.logger.log('Sentry initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Sentry', error);
      }
    } else {
      this.logger.log('Sentry DSN not provided - error tracking disabled');
    }
  }

  /**
   * Capture an exception and send it to Sentry
   * @param exception - The exception to capture
   * @param context - Optional context information
   */
  captureException(exception: any, context?: Record<string, any>): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      if (context) {
        Sentry.setContext('additional', context);
      }

      Sentry.captureException(exception);
    } catch (error) {
      this.logger.error('Failed to capture exception in Sentry', error);
    }
  }

  /**
   * Capture a message and send it to Sentry
   * @param message - The message to capture
   * @param level - The severity level
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.captureMessage(message, level);
    } catch (error) {
      this.logger.error('Failed to capture message in Sentry', error);
    }
  }

  /**
   * Set user context for Sentry
   * @param user - User information
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Sentry.setUser(user);
    } catch (error) {
      this.logger.error('Failed to set user in Sentry', error);
    }
  }

  /**
   * Check if Sentry is initialized
   */
  isEnabled(): boolean {
    return this.isInitialized;
  }
}

