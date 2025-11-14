// Chat API helpers for admin panel
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper to get token safely (works in both client and server)
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

// Helper for better error messages
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[ChatAPI] HTTP ${response.status} - ${response.statusText}:`, errorText);
    throw new Error(`Failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export interface Conversation {
  id: string;
  tenantId: string;
  adminId?: string;
  topic?: string;
  status: 'OPEN' | 'PENDING' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
  };
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
 * Get all conversations (tenant sees their own, admin sees all)
 * Supports status filtering: 'pending', 'open', 'closed'
 */
export async function getConversations(status?: 'pending' | 'open' | 'closed'): Promise<Conversation[]> {
  const token = getToken();
  if (!token) {
    console.error('[ChatAPI] No access token found');
    throw new Error('Not authenticated');
  }
  
  const query = status ? `?status=${status}` : '';
  console.log('[ChatAPI] Fetching conversations from:', `${API_BASE}/conversations${query}`);
  
  const response = await fetch(`${API_BASE}/conversations${query}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  return handleResponse<Conversation[]>(response);
}

/**
 * Get conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  console.log('[ChatAPI] Fetching conversation:', id);
  
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  return handleResponse<Conversation>(response);
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  console.log('[ChatAPI] Fetching messages for conversation:', conversationId);
  
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  return handleResponse<Message[]>(response);
}

/**
 * Assign admin to conversation
 */
export async function assignConversation(conversationId: string): Promise<Conversation> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  console.log('[ChatAPI] Assigning conversation:', conversationId);
  
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/assign`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  return handleResponse<Conversation>(response);
}

/**
 * Close conversation
 */
export async function closeConversation(conversationId: string): Promise<Conversation> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  console.log('[ChatAPI] Closing conversation:', conversationId);
  
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/close`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  return handleResponse<Conversation>(response);
}

/**
 * Create a new conversation (tenant initiates chat)
 * Will reuse existing OPEN conversation with same topic if available
 */
export async function createConversation(topic?: string, initialMessage?: string): Promise<Conversation> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  console.log('[ChatAPI] Creating conversation - Topic:', topic || 'None', 'Message:', initialMessage);
  
  const response = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      topic: topic || null,
      content: initialMessage || 'Hello, I need assistance',
    }),
  });

  return handleResponse<Conversation>(response);
}

