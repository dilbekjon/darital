import { fetchApi, ApiError } from './api';

interface TenantProfile {
  fullName: string;
  phone: string;
  contracts: { unit: { name: string } }[];
}

interface Invoice {
  id: string;
  unitName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

interface Payment {
  id: string;
  invoiceId: string;
  method: 'ONLINE' | 'OFFLINE';
  amount: number;
  status: 'PENDING' | 'CONFIRMED';
  paidAt: string;
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
  return fetchApi<Invoice[]>('/tenant/invoices');
}

export async function getTenantPayments(): Promise<Payment[]> {
  return fetchApi<Payment[]>('/tenant/payments');
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
