import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

type ErrorContext = {
  source?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  userId?: string;
  ip?: string;
  userAgent?: string | string[];
};

interface RecentErrorInfo {
  lastSent: number;
  count: number;
}

@Injectable()
export class ErrorAlertService {
  private readonly logger = new Logger(ErrorAlertService.name);

  // In-memory deduplication and rate limiting (per process)
  private readonly recentErrors = new Map<string, RecentErrorInfo>();
  private readonly globalTimestamps: number[] = [];

  private isProduction(): boolean {
    const env = process.env.APP_ENV || process.env.NODE_ENV || 'development';
    return env === 'production';
  }

  private getTelegramConfig():
    | { token: string; chatId: string }
    | null {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
      return null;
    }

    return { token, chatId };
  }

  async notifyError(options: {
    error: any;
    context?: ErrorContext;
  }): Promise<void> {
    if (!this.isProduction()) {
      return;
    }

    const config = this.getTelegramConfig();
    if (!config) {
      return;
    }

    const now = Date.now();
    const { error, context } = options;

    // Build a stable signature to deduplicate identical errors
    const signatureKey = this.buildSignatureKey(error, context);
    const existing = this.recentErrors.get(signatureKey);
    const dedupWindowMs = 5 * 60 * 1000; // 5 minutes

    if (existing && now - existing.lastSent < dedupWindowMs) {
      existing.count += 1;
      this.recentErrors.set(signatureKey, existing);
      return;
    }

    this.recentErrors.set(signatureKey, {
      lastSent: now,
      count: existing ? existing.count + 1 : 1,
    });

    // Global rate limit: max 20 alerts per 5 minutes per process
    this.globalTimestamps.push(now);
    const windowStart = now - dedupWindowMs;
    while (this.globalTimestamps.length && this.globalTimestamps[0] < windowStart) {
      this.globalTimestamps.shift();
    }
    if (this.globalTimestamps.length > 20) {
      if (this.globalTimestamps.length === 21) {
        this.logger.warn(
          'Error alerts rate-limited: too many errors in the last 5 minutes.',
        );
      }
      return;
    }

    const message = this.buildMessage(error, context);

    try {
      await this.sendTelegramMessage(config.token, config.chatId, message);
    } catch (err: any) {
      this.logger.error(
        'Failed to send Telegram error alert',
        err?.stack || err?.message || String(err),
      );
    }
  }

  private buildSignatureKey(error: any, context?: ErrorContext): string {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);

    const base = [
      context?.source || 'unknown',
      context?.method || '',
      context?.url || '',
      context?.statusCode || '',
      this.truncate(message, 120),
    ].join('|');

    return this.truncate(base, 200);
  }

  private buildMessage(error: any, context?: ErrorContext): string {
    const appName = process.env.APP_NAME || 'Darital API';
    const env = process.env.APP_ENV || process.env.NODE_ENV || 'development';
    const time = new Date().toISOString();

    const lines: string[] = [];
    lines.push(`🚨 ${appName} error`);
    lines.push(`Env: ${env}`);
    lines.push(`Time: ${time}`);

    if (context?.source) {
      lines.push(`Source: ${context.source}`);
    }
    if (context?.method || context?.url) {
      lines.push(
        `Request: ${(context.method || 'UNKNOWN').toUpperCase()} ${context.url || ''
        }`.trim(),
      );
    }
    if (typeof context?.statusCode === 'number') {
      lines.push(`Status: ${context.statusCode}`);
    }
    if (context?.userId) {
      lines.push(`User: ${context.userId}`);
    }
    if (context?.ip) {
      lines.push(`IP: ${context.ip}`);
    }
    if (context?.userAgent) {
      lines.push(`UA: ${String(context.userAgent)}`);
    }

    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);

    lines.push('');
    lines.push(`Message: ${this.truncate(msg, 300)}`);

    const stack = error instanceof Error ? error.stack : undefined;
    if (stack) {
      const firstLines = stack.split('\n').slice(0, 6).join('\n');
      lines.push('');
      lines.push('Stack:');
      lines.push(this.truncate(firstLines, 700));
    }

    return lines.join('\n');
  }

  private truncate(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
  }

  private sendTelegramMessage(
    token: string,
    chatId: string,
    text: string,
  ): Promise<void> {
    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    });

    const options: https.RequestOptions = {
      method: 'POST',
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        // Drain response to avoid socket leaks
        res.on('data', () => {});
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `Telegram API responded with status ${res.statusCode || 'UNKNOWN'}`,
              ),
            );
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  }
}

