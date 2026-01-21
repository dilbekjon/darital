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
      this.logger.log(`Calling CheckoutUz ${path} with payload:`, JSON.stringify(payload));
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      const responseText = await res.text();
      let data: T;
      try {
        data = JSON.parse(responseText) as T;
      } catch {
        this.logger.error(`CheckoutUz ${path} returned invalid JSON: ${responseText}`);
        throw new Error(`Invalid JSON response from CheckoutUz: ${responseText}`);
      }
      
      if (!res.ok) {
        this.logger.error(`CheckoutUz ${path} failed: ${res.status} - ${JSON.stringify(data)}`);
        throw new Error(`CheckoutUz API error: ${res.status} - ${JSON.stringify(data)}`);
      }
      
      this.logger.log(`CheckoutUz ${path} success:`, JSON.stringify(data));
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.error(`CheckoutUz ${path} timeout after ${this.timeoutMs}ms`);
        throw new Error(`CheckoutUz API timeout: Request took longer than ${this.timeoutMs}ms`);
      }
      throw error;
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
