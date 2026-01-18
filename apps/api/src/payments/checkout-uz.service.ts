import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

interface CheckoutUzCreateInvoiceResponse {
  ok: boolean;
  order_id?: number | string;
  pay_url?: string;
  error?: {
    message?: string;
  };
}

interface CheckoutUzStatusInvoiceResponse {
  ok: boolean;
  payment?: {
    id?: string;
    amount?: string;
    status?: string;
    transaction_id?: string;
    paid_at?: string;
  };
  error?: {
    message?: string;
  };
}

@Injectable()
export class CheckoutUzService {
  private readonly logger = new Logger(CheckoutUzService.name);
  private readonly baseUrl = process.env.CHECKOUTUZ_BASE_URL || 'https://checkout.uz/api';
  private readonly apiKey = process.env.CHECKOUTUZ_API_KEY || '';
  private readonly timeoutMs = Number(process.env.CHECKOUTUZ_TIMEOUT_MS || 10000);

  private assertConfigured() {
    if (!this.apiKey) {
      throw new Error('CHECKOUTUZ_API_KEY is not configured');
    }
  }

  private normalizeAmount(amount: number | string | Decimal) {
    if (amount instanceof Decimal) return amount.toNumber();
    return typeof amount === 'string' ? Number(amount) : amount;
  }

  private async postJson<T>(path: string, payload: Record<string, unknown>) {
    this.assertConfigured();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as T;
      if (!res.ok) {
        this.logger.warn(`CheckoutUz ${path} failed: ${res.status}`);
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  async createInvoice(amount: number | string | Decimal) {
    const payload = {
      api_key: this.apiKey,
      amount: this.normalizeAmount(amount),
    };
    const response = await this.postJson<CheckoutUzCreateInvoiceResponse>('/create_invoice', payload);
    return response;
  }

  async getInvoiceStatus(orderId: string | number) {
    const payload = {
      api_key: this.apiKey,
      order_id: String(orderId),
    };
    const response = await this.postJson<CheckoutUzStatusInvoiceResponse>('/status_invoice', payload);
    return response;
  }
}
