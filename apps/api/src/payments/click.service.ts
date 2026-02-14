import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface ClickPrepareParams {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  amount: string;
  action: string;
  error?: string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickCompleteParams {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  merchant_prepare_id: string;
  amount: string;
  action: string;
  error?: string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
}

const CLICK_PAY_BASE = 'https://my.click.uz/services/pay';

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);
  private readonly merchantId = process.env.CLICK_MERCHANT_ID || '';
  private readonly serviceId = process.env.CLICK_SERVICE_ID || '';
  private readonly secretKey = process.env.CLICK_SECRET_KEY || '';

  isConfigured(): boolean {
    return Boolean(
      this.merchantId?.trim() &&
        this.serviceId?.trim() &&
        this.secretKey?.trim(),
    );
  }

  buildPayUrl(params: {
    amount: number;
    merchantTransId: string;
    returnUrl?: string;
    cardType?: 'uzcard' | 'humo';
  }): string {
    if (!this.isConfigured()) {
      throw new Error('CLICK_MERCHANT_ID, CLICK_SERVICE_ID, CLICK_SECRET_KEY are required');
    }
    const { amount, merchantTransId, returnUrl, cardType } = params;
    const url = new URL(CLICK_PAY_BASE);
    url.searchParams.set('service_id', this.serviceId);
    url.searchParams.set('merchant_id', this.merchantId);
    url.searchParams.set('amount', String(amount));
    url.searchParams.set('transaction_param', merchantTransId);
    if (returnUrl) url.searchParams.set('return_url', returnUrl);
    if (cardType) url.searchParams.set('card_type', cardType);
    return url.toString();
  }

  private md5(str: string): string {
    return createHash('md5').update(str, 'utf8').digest('hex');
  }

  verifyPrepareSign(params: ClickPrepareParams): boolean {
    const str =
      String(params.click_trans_id) +
      params.service_id +
      this.secretKey +
      params.merchant_trans_id +
      params.amount +
      params.action +
      params.sign_time;
    const expected = this.md5(str);
    return expected === params.sign_string;
  }

  verifyCompleteSign(params: ClickCompleteParams): boolean {
    const str =
      String(params.click_trans_id) +
      params.service_id +
      this.secretKey +
      params.merchant_trans_id +
      params.merchant_prepare_id +
      params.amount +
      params.action +
      params.sign_time;
    const expected = this.md5(str);
    return expected === params.sign_string;
  }

  buildPrepareResponse(params: {
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_prepare_id: number;
    error: number;
    error_note: string;
  }): string {
    return [
      `click_trans_id=${params.click_trans_id}`,
      `merchant_trans_id=${params.merchant_trans_id}`,
      `merchant_prepare_id=${params.merchant_prepare_id}`,
      `error=${params.error}`,
      `error_note=${params.error_note}`,
    ].join('&');
  }

  buildCompleteResponse(params: {
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_confirm_id: number | null;
    error: number;
    error_note: string;
  }): string {
    return [
      `click_trans_id=${params.click_trans_id}`,
      `merchant_trans_id=${params.merchant_trans_id}`,
      `merchant_confirm_id=${params.merchant_confirm_id ?? ''}`,
      `error=${params.error}`,
      `error_note=${params.error_note}`,
    ].join('&');
  }

  parsePrepareBody(body: Record<string, any>): ClickPrepareParams | null {
    const click_trans_id = body?.click_trans_id;
    const service_id = body?.service_id;
    const merchant_trans_id = body?.merchant_trans_id;
    const amount = body?.amount;
    const action = body?.action;
    const sign_time = body?.sign_time;
    const sign_string = body?.sign_string;
    if (
      click_trans_id == null ||
      service_id == null ||
      merchant_trans_id == null ||
      amount == null ||
      action == null ||
      sign_time == null ||
      sign_string == null
    ) {
      return null;
    }
    return {
      click_trans_id: String(click_trans_id),
      service_id: String(service_id),
      click_paydoc_id: body.click_paydoc_id != null ? String(body.click_paydoc_id) : undefined,
      merchant_trans_id: String(merchant_trans_id),
      amount: String(amount),
      action: String(action),
      error: body.error != null ? String(body.error) : undefined,
      error_note: body.error_note,
      sign_time: String(sign_time),
      sign_string: String(sign_string),
    };
  }

  parseCompleteBody(body: Record<string, any>): ClickCompleteParams | null {
    const click_trans_id = body?.click_trans_id;
    const service_id = body?.service_id;
    const merchant_trans_id = body?.merchant_trans_id;
    const merchant_prepare_id = body?.merchant_prepare_id;
    const amount = body?.amount;
    const action = body?.action;
    const sign_time = body?.sign_time;
    const sign_string = body?.sign_string;
    if (
      click_trans_id == null ||
      service_id == null ||
      merchant_trans_id == null ||
      merchant_prepare_id == null ||
      amount == null ||
      action == null ||
      sign_time == null ||
      sign_string == null
    ) {
      return null;
    }
    return {
      click_trans_id: String(click_trans_id),
      service_id: String(service_id),
      click_paydoc_id: body.click_paydoc_id != null ? String(body.click_paydoc_id) : undefined,
      merchant_trans_id: String(merchant_trans_id),
      merchant_prepare_id: String(merchant_prepare_id),
      amount: String(amount),
      action: String(action),
      error: body.error != null ? String(body.error) : undefined,
      error_note: body.error_note,
      sign_time: String(sign_time),
      sign_string: String(sign_string),
    };
  }
}
