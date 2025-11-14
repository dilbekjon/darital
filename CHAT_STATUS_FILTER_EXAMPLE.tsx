/**
 * Example: Admin Chat with Status Filter Tabs
 * 
 * This shows how to integrate the new status filtering into your admin chat page.
 * Copy this pattern into your existing admin chat page component.
 */

'use client';

import { useState, useEffect } from 'react';
import { getConversations, closeConversation, type Conversation } from '@/lib/chatApi';

type StatusFilter = 'all' | 'pending' | 'open' | 'closed';

export default function AdminChatWithFilters() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Load conversations based on active filter
  const loadConversations = async (filter: StatusFilter) => {
    setLoading(true);
    try {
      // If filter is 'all', don't pass status parameter
      const data = filter === 'all' 
        ? await getConversations() 
        : await getConversations(filter);
      
      setConversations(data);
      console.log(`[AdminChat] Loaded ${data.length} ${filter} conversations`);
    } catch (error) {
      console.error('[AdminChat] Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load conversations when filter changes
  useEffect(() => {
    loadConversations(activeFilter);
  }, [activeFilter]);

  // Handle conversation closing
  const handleCloseConversation = async (conversationId: string) => {
    try {
      await closeConversation(conversationId);
      console.log('[AdminChat] Conversation closed:', conversationId);
      
      // Refresh the list
      await loadConversations(activeFilter);
      
      // Clear selection if closed conversation was selected
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('[AdminChat] Failed to close conversation:', error);
      alert('Failed to close conversation');
    }
  };

  // Filter tabs component
  const FilterTabs = () => {
    const filters: { label: string; value: StatusFilter }[] = [
      { label: 'All', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'Open', value: 'open' },
      { label: 'Closed', value: 'closed' },
    ];

    return (
      <div className="flex gap-2 border-b border-gray-200 mb-4">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === filter.value
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar: Conversation List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Support Chat</h1>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pt-4">
          <FilterTabs />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No {activeFilter !== 'all' ? activeFilter : ''} conversations
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{conv.tenant.fullName}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      conv.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : conv.status === 'OPEN'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {conv.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {conv.messages[0]?.content || 'No messages yet'}
                </p>
                <span className="text-xs text-gray-400">
                  {new Date(conv.updatedAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold">{selectedConversation.tenant.fullName}</h2>
                <p className="text-sm text-gray-500">{selectedConversation.tenant.email}</p>
              </div>
              
              {/* Close Button (only for OPEN/PENDING conversations) */}
              {(selectedConversation.status === 'OPEN' || selectedConversation.status === 'PENDING') && (
                <button
                  onClick={() => handleCloseConversation(selectedConversation.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Close Chat
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Your existing message display component here */}
              <p className="text-gray-500 text-center">Messages for {selectedConversation.id}</p>
            </div>

            {/* Input Area (disabled for closed conversations) */}
            <div className="p-4 bg-white border-t border-gray-200">
              {selectedConversation.status === 'CLOSED' ? (
                <div className="text-center text-gray-500">
                  This conversation is closed
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

