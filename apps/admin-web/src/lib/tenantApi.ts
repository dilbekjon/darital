import { fetchApi, ApiError, normalizeListResponse } from './api';

interface TenantProfile {
  fullName: string;
  phone: string;
  contracts: { unit: { name: string } }[];
}

interface Invoice {
  id: string;
  unitName: string;
  amount: number;
  bankAmount?: number;
  cashAmount?: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  derivedStatus?: 'PENDING' | 'PAID' | 'OVERDUE';
  totalPaid?: number;
  totalRemaining?: number;
  paymentSummary?: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    hasPending: boolean;
    hasAnyPayments: boolean;
  };
  latestPayment?: {
    id: string;
    status: string;
    method: 'ONLINE' | 'OFFLINE';
    source?: 'ONLINE' | 'BANK' | 'CASH';
    createdAt?: string | null;
  } | null;
}

interface Payment {
  id: string;
  invoiceId: string;
  method: 'ONLINE' | 'OFFLINE';
  source?: 'ONLINE' | 'BANK' | 'CASH';
  amount: number;
  status: 'PENDING' | 'CONFIRMED';
  paidAt: string;
  createdAt?: string;
  invoiceDueDate?: string | null;
  invoiceStatus?: string | null;
  collectedAt?: string | null;
  tenantConfirmedAt?: string | null;
  tenantConfirmedAmount?: number | null;
  collectorReceivedAmount?: number | null;
  custodyStatus?:
    | 'NOT_APPLICABLE'
    | 'AWAITING_TENANT_CONFIRMATION'
    | 'DECLARED_BY_TENANT'
    | 'WITH_COLLECTOR'
    | 'DISPUTED'
    | 'RECEIVED_BY_COMPANY'
    | 'CANCELLED';
  custodySummary?: {
    differenceFromRecorded?: number | null;
    differenceBetweenTenantAndCollector?: number | null;
    steps?: {
      tenantConfirmedAt?: string | null;
      collectorConfirmedAt?: string | null;
      cashierApprovedAt?: string | null;
    };
  };
}

interface Balance {
  current: number;
}

interface Contract {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  pdfUrl: string;
  unit?: {
    name: string;
  };
}

export async function getTenantProfile(): Promise<TenantProfile> {
  return fetchApi<TenantProfile>('/tenant/me');
}

export async function getTenantInvoices(): Promise<Invoice[]> {
  const response = await fetchApi<any>('/tenant/invoices');
  return normalizeListResponse<Invoice>(response).items;
}

export async function getTenantPayments(): Promise<Payment[]> {
  const response = await fetchApi<any>('/tenant/payments');
  return normalizeListResponse<Payment>(response).items;
}

export async function confirmTenantCashGiven(paymentId: string, amount?: string): Promise<any> {
  return fetchApi(`/tenant/payments/${paymentId}/confirm-cash-given`, {
    method: 'POST',
    body: JSON.stringify(amount ? { amount } : {}),
  });
}

export async function getTenantBalance(): Promise<Balance> {
  return fetchApi<Balance>('/tenant/balance');
}

export async function getTenantContracts(): Promise<Contract[]> {
  // First, try to get contracts from /tenant/me endpoint
  // The backend returns tenant profile with contracts array
  const profile = await fetchApi<any>('/tenant/me');
  
  // Return contracts with unit info if available
  if (profile.contracts && Array.isArray(profile.contracts)) {
    return profile.contracts.map((contract: any) => ({
      id: contract.id,
      unitId: contract.unitId,
      tenantId: contract.tenantId,
      startDate: contract.startDate,
      endDate: contract.endDate,
      amount: contract.amount,
      status: contract.status,
      pdfUrl: contract.pdfUrl,
      unit: contract.unit,
    }));
  }
  
  return [];
}

export async function getContractById(contractId: string): Promise<Contract> {
  // Get all contracts and find the specific one
  const contracts = await getTenantContracts();
  const contract = contracts.find((c) => c.id === contractId);
  
  if (!contract) {
    throw new Error('Contract not found');
  }
  
  return contract;
}
