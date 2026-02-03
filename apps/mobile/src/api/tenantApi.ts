import { apiGet, apiPost, apiPatch } from './client';

export interface TenantProfile {
  fullName: string;
  phone: string;
  contracts: { id: string; unitId: string; unit?: { name: string }; amount: number; status: string; startDate: string; endDate: string; pdfUrl: string }[];
}

export interface TenantInvoice {
  id: string;
  unitName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  latestPayment?: { status: string; method?: string; paidAt?: string; rawPayload?: any };
}

export interface TenantPayment {
  id: string;
  invoiceId: string;
  method: 'ONLINE' | 'OFFLINE';
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  paidAt: string | null;
  provider?: string | null;
  providerPaymentId?: string | null;
  rawPayload?: any;
  createdAt?: string;
  unitName?: string;
}

export interface PaymentIntentResponse {
  paymentId: string;
  invoiceId: string;
  amount: number;
  provider: string;
  providerPaymentId?: string;
  checkoutUrl: string | null;
  /** True when invoice already paid */
  alreadyPaid?: boolean;
  /** Error code when checkout URL not available (e.g. PAYMENT_NOT_CONFIGURED, CHECKOUT_ERROR) */
  error?: string;
  /** User-facing error message from backend */
  message?: string;
}

export interface TenantContract {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
  pdfUrl: string;
  unit?: { name: string };
}

export interface TenantDocument {
  id: string;
  type: string;
  name: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  channel: string;
  enabled: boolean;
}

export async function getTenantProfile(): Promise<TenantProfile> {
  return apiGet('/tenant/me');
}

export async function getTenantInvoices(): Promise<TenantInvoice[]> {
  const result = await apiGet('/tenant/invoices');
  if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
    return result.data;
  }
  return Array.isArray(result) ? result : [];
}

export async function getTenantPayments(): Promise<TenantPayment[]> {
  return apiGet('/tenant/payments');
}

export async function createTenantPaymentIntent(
  invoiceId: string,
  provider: 'UZUM' | 'CLICK' | 'PAYME' | 'NONE' = 'UZUM'
): Promise<PaymentIntentResponse> {
  const data = await apiPost('/tenant/payments/intent', { invoiceId, provider });
  return data as PaymentIntentResponse;
}

export async function refreshTenantPayment(paymentId: string): Promise<void> {
  await apiPost(`/tenant/payments/${paymentId}/refresh`, {});
}

export async function getTenantBalance(): Promise<{ current: number }> {
  return apiGet('/tenant/balance');
}

export async function getTenantContracts(): Promise<TenantContract[]> {
  const profile = await apiGet<any>('/tenant/me');
  if (profile?.contracts && Array.isArray(profile.contracts)) {
    return profile.contracts.map((c: any) => ({
      id: c.id,
      unitId: c.unitId,
      tenantId: c.tenantId,
      startDate: c.startDate,
      endDate: c.endDate,
      amount: typeof c.amount === 'object' && c.amount?.toNumber ? c.amount.toNumber() : Number(c.amount),
      status: c.status,
      pdfUrl: c.pdfUrl || '',
      unit: c.unit,
    }));
  }
  return [];
}

export async function getTenantDocuments(): Promise<TenantDocument[]> {
  return apiGet('/tenant/documents');
}

export async function getReceiptForPayment(paymentId: string): Promise<any> {
  return apiGet(`/tenant/receipts/payment/${paymentId}`);
}

export async function getNotificationPreferences(): Promise<{ preferences: NotificationPreference[] }> {
  return apiGet('/tenant/notifications/preferences');
}

export async function updateNotificationPreferences(preferences: NotificationPreference[]): Promise<void> {
  await apiPatch('/tenant/notifications/preferences', { preferences });
}

export async function getChartData(): Promise<{ chartData: any[]; summary: any } | null> {
  try {
    return await apiGet('/tenant/receipts/chart-data');
  } catch {
    return null;
  }
}
