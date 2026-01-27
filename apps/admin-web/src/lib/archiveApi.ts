// Archive API helpers for admin panel
import { fetchApi } from './api';

export interface ArchivedTenant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  archivedAt: string;
  archivedBy: string;
  archiveReason?: string;
}

export interface ArchivedContract {
  id: string;
  tenantId: string;
  tenant: { fullName: string; email: string };
  unitId: string;
  unit: { name: string };
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
  archivedAt: string;
  archivedBy: string;
  archiveReason?: string;
}

export interface ArchivedInvoice {
  id: string;
  contractId: string;
  contract: { tenant: { fullName: string } };
  dueDate: string;
  amount: number;
  status: string;
  archivedAt: string;
  archivedBy: string;
  archiveReason?: string;
}

export interface ArchivedPayment {
  id: string;
  invoiceId: string;
  amount: number;
  status: string;
  provider: string;
  paidAt?: string;
  archivedAt: string;
  archivedBy: string;
  archiveReason?: string;
}

export interface ArchiveStats {
  tenants: { active: number; archived: number };
  contracts: { active: number; archived: number };
  invoices: { active: number; archived: number };
  conversations: { active: number; archived: number };
  messages: { archived: number };
  auditLogs: { archived: number };
  notifications: { archived: number };
}

export interface ArchiveSummary {
  stats: ArchiveStats;
  lastArchiveDate?: string;
  totalArchivedSize: number;
}

export interface ArchivedConversation {
  id: string;
  originalId: string;
  tenantId: string;
  adminId?: string;
  topic?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string;
  _count: {
    messages: number;
  };
}

export interface ArchivedMessage {
  id: string;
  originalId: string;
  conversationId: string;
  senderRole: 'TENANT' | 'ADMIN';
  senderId: string;
  content?: string;
  fileUrl?: string;
  status: string;
  createdAt: string;
}

/**
 * Get archive summary and statistics
 */
export async function getArchiveSummary(): Promise<ArchiveSummary> {
  return fetchApi('/archive/summary') as Promise<ArchiveSummary>;
}

/**
 * Run automatic archiving process
 */
export async function runAutoArchive(): Promise<{
  conversationsArchived: number;
  messagesArchived: number;
  auditLogsArchived: number;
  notificationsArchived: number;
}> {
  return fetchApi('/archive/run-auto-archive', { method: 'POST' });
}

/**
 * Get archived conversations with pagination
 */
export async function getArchivedConversations(page = 1, limit = 50): Promise<{
  data: ArchivedConversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  return fetchApi(`/archive/conversations?page=${page}&limit=${limit}`);
}

/**
 * Get archived messages for a conversation
 */
export async function getArchivedMessages(conversationId: string): Promise<ArchivedMessage[]> {
  return fetchApi(`/archive/conversations/${conversationId}/messages`);
}

/**
 * Restore an archived conversation
 */
export async function restoreArchivedConversation(archivedId: string): Promise<any> {
  return fetchApi(`/archive/conversations/${archivedId}/restore`, { method: 'POST' });
}

/**
 * Get archived tenants
 */
export async function getArchivedTenants(): Promise<ArchivedTenant[]> {
  return fetchApi('/tenants?includeArchived=true&onlyArchived=true') as Promise<ArchivedTenant[]>;
}

/**
 * Get archived contracts
 */
export async function getArchivedContracts(): Promise<ArchivedContract[]> {
  return fetchApi('/contracts?includeArchived=true&onlyArchived=true') as Promise<ArchivedContract[]>;
}

/**
 * Get archived invoices
 */
export async function getArchivedInvoices(): Promise<ArchivedInvoice[]> {
  const response = await fetchApi('/invoices?includeArchived=true&onlyArchived=true&page=1&limit=1000') as any;
  return response.data || [];
}

/**
 * Get archived payments
 */
export async function getArchivedPayments(): Promise<ArchivedPayment[]> {
  const response = await fetchApi('/payments?includeArchived=true&onlyArchived=true&page=1&limit=1000') as any;
  return response.data || [];
}

/**
 * Unarchive a tenant
 */
export async function unarchiveTenant(tenantId: string): Promise<void> {
  return fetchApi(`/tenants/${tenantId}/unarchive`, { method: 'PUT' });
}

/**
 * Unarchive a contract
 */
export async function unarchiveContract(contractId: string): Promise<void> {
  return fetchApi(`/contracts/${contractId}/unarchive`, { method: 'PUT' });
}

/**
 * Unarchive an invoice
 */
export async function unarchiveInvoice(invoiceId: string): Promise<void> {
  return fetchApi(`/invoices/${invoiceId}/unarchive`, { method: 'PUT' });
}

/**
 * Clean up old archived data
 */
export async function cleanupOldArchives(days: number): Promise<{
  conversationsDeleted: number;
  messagesDeleted: number;
  auditLogsDeleted: number;
  notificationsDeleted: number;
}> {
  return fetchApi(`/archive/cleanup/${days}`, { method: 'DELETE' });
}

/**
 * Permanently delete an archived tenant
 */
export async function deleteArchivedTenant(tenantId: string): Promise<void> {
  return fetchApi(`/tenants/${tenantId}`, { method: 'DELETE' });
}

/**
 * Permanently delete an archived contract
 */
export async function deleteArchivedContract(contractId: string): Promise<void> {
  return fetchApi(`/contracts/${contractId}`, { method: 'DELETE' });
}

/**
 * Permanently delete an archived invoice
 */
export async function deleteArchivedInvoice(invoiceId: string): Promise<void> {
  return fetchApi(`/invoices/${invoiceId}`, { method: 'DELETE' });
}