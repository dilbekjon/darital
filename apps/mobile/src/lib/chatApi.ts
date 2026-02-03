import { apiGet, apiPost } from '../api/client';

export interface Conversation {
  id: string;
  tenantId: string;
  adminId?: string;
  topic?: string;
  status: 'OPEN' | 'PENDING' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  isTelegramOrigin?: boolean;
  admin?: {
    id: string;
    fullName: string;
    email: string;
  };
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    status: string;
    fileUrl?: string;
  }>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderRole: 'TENANT' | 'ADMIN';
  senderId: string;
  content?: string;
  fileUrl?: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
}

/**
 * Get all conversations for current tenant
 */
export async function getConversations(): Promise<Conversation[]> {
  return apiGet('/conversations');
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  return apiGet(`/conversations/${conversationId}/messages`);
}

/**
 * Create a new conversation
 */
export async function createConversation(
  topic?: string,
  content?: string
): Promise<Conversation> {
  return apiPost('/conversations', { topic, content });
}

