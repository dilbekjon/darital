import { fetchApi } from './api';

export interface TelegramUser {
  chatId: string;
  tenantId: string | null;
  role: string;
  tenant: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramUsersResponse {
  ok: boolean;
  users: TelegramUser[];
  total: number;
}

export interface SendMessageResponse {
  ok: boolean;
  message: string;
  details: {
    chatId: string;
    tenantId?: string;
    tenantName?: string;
    message: string;
    sentAt: string;
  };
}

export interface BroadcastResponse {
  ok: boolean;
  message: string;
  sent: number;
  failed: number;
  total: number;
  details: {
    successful: Array<{ chatId: string; success: boolean }>;
    failed: Array<{ chatId: string; error: string }>;
  };
}

export interface BotInfoResponse {
  ok: boolean;
  enabled: boolean;
  bot?: {
    username: string;
    firstName: string;
    id: number;
  };
  error?: string;
}

export async function getTelegramUsers(role?: string): Promise<TelegramUsersResponse> {
  const url = role ? `/telegram/users?role=${role}` : '/telegram/users';
  return fetchApi<TelegramUsersResponse>(url);
}

export async function getTelegramUser(chatId: string): Promise<{ ok: boolean; user: TelegramUser }> {
  return fetchApi<{ ok: boolean; user: TelegramUser }>(`/telegram/users/${chatId}`);
}

export async function sendTelegramMessage(
  tenantId?: string,
  chatId?: string,
  message: string = '',
  imageUrl?: string,
): Promise<SendMessageResponse> {
  return fetchApi<SendMessageResponse>('/telegram/send-message', {
    method: 'POST',
    body: JSON.stringify({ tenantId, chatId, message, imageUrl }),
  });
}

export async function sendTelegramBroadcast(
  message: string,
  role?: string,
): Promise<BroadcastResponse> {
  return fetchApi<BroadcastResponse>('/telegram/send-broadcast', {
    method: 'POST',
    body: JSON.stringify({ message, role }),
  });
}

export async function getTelegramBotInfo(): Promise<BotInfoResponse> {
  return fetchApi<BotInfoResponse>('/telegram/bot-info');
}
