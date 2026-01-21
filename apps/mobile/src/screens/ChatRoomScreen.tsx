import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// Constants import removed - using constants-fallback instead
import { useTenantChat } from '../hooks/useTenantChat';
import { useLanguage } from '../contexts/LanguageContext';
import type { Message } from '../lib/chatApi';

export default function ChatRoomScreen({ route, navigation }: any) {
  const { conversationId, topic } = route.params;
  const { t } = useLanguage(); // Safe hook that always returns translations
  
  const {
    loading,
    error,
    messages,
    connected,
    currentConversation,
    refreshMessages,
    sendMessage,
  } = useTenantChat();

  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load messages and ensure socket subscription when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (conversationId) {
        console.log(`[ChatRoomScreen] 📥 Screen focused, loading messages for conversation: ${conversationId}`);
        refreshMessages(conversationId);
      }
      
      return () => {
        console.log(`[ChatRoomScreen] 📤 Screen blurred, conversation: ${conversationId}`);
        // Cleanup is handled by useTenantChat hook
      };
    }, [conversationId, refreshMessages])
  );

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending || !connected || currentConversation?.status === 'CLOSED') return;

    setSending(true);
    const content = messageInput.trim();
    setMessageInput('');

    try {
      await sendMessage(conversationId, content);
    } catch (err) {
      console.warn('[ChatRoomScreen] Failed to send message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore message input on error
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return t.justNow;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (fileUrl: string) => {
    if (fileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) return '🖼️';
    if (fileUrl.match(/\.(pdf)$/i)) return '📄';
    if (fileUrl.match(/\.(doc|docx)$/i)) return '📝';
    if (fileUrl.match(/\.(xls|xlsx)$/i)) return '📊';
    return '📎';
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isTenant = item.senderRole === 'TENANT';
    const { getApiUrl } = require('../lib/constants-fallback');
    const apiUrl = getApiUrl().replace('/api', '');
    
    return (
      <View
        style={[
          styles.messageContainer,
          isTenant ? styles.tenantMessageContainer : styles.adminMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isTenant ? styles.tenantBubble : styles.adminBubble,
          ]}
        >
          {item.fileUrl && (
            <TouchableOpacity
              style={styles.fileAttachment}
              onPress={() => {
                // Open file in browser or external app
                const url = `${apiUrl}${item.fileUrl}`;
                console.log('Opening file:', url);
                // You can use Linking.openURL(url) if needed
              }}
            >
              <Text style={styles.fileIcon}>{getFileIcon(item.fileUrl)}</Text>
              <Text
                style={[
                  styles.fileText,
                  isTenant ? styles.tenantText : styles.adminText,
                ]}
              >
                View File
              </Text>
            </TouchableOpacity>
          )}
          {item.content && (
            <Text
              style={[
                styles.messageText,
                isTenant ? styles.tenantText : styles.adminText,
              ]}
            >
              {item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isTenant ? styles.tenantTimeText : styles.adminTimeText,
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
            {isTenant && (
              <Text style={styles.readReceipt}>
                {item.status === 'READ' ? '✓✓' : item.status === 'DELIVERED' ? '✓' : ''}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Topic Header */}
      <View style={styles.topicHeader}>
        <Text style={styles.topicTitle}>{topic || t.supportChat}</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={[
          styles.statusDot,
          { backgroundColor: connected ? '#10b981' : '#ef4444' }
        ]} />
        <Text style={styles.statusText}>
          {connected ? t.connected : t.connecting}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>{t.noConversations}</Text>
            <Text style={styles.emptySubtext}>{t.typeMessage}</Text>
          </View>
        }
      />

      {/* Closed Conversation Banner */}
      {currentConversation?.status === 'CLOSED' && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerText}>
            This conversation is closed. You cannot send messages.
          </Text>
        </View>
      )}

      {/* Input Box */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            currentConversation?.status === 'CLOSED' && styles.textInputDisabled,
          ]}
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder={currentConversation?.status === 'CLOSED' ? 'Conversation closed' : t.typeMessage}
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
          editable={!sending && currentConversation?.status !== 'CLOSED'}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageInput.trim() || sending || !connected || currentConversation?.status === 'CLOSED') && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!messageInput.trim() || sending || !connected || currentConversation?.status === 'CLOSED'}
        >
          <Text style={styles.sendButtonText}>
            {sending ? '...' : t.send}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  topicHeader: {
    padding: 12,
    backgroundColor: '#3b82f6',
    borderBottomWidth: 1,
    borderBottomColor: '#2563eb',
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  tenantMessageContainer: {
    alignSelf: 'flex-end',
  },
  adminMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tenantBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  tenantText: {
    color: '#ffffff',
  },
  adminText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  tenantTimeText: {
    color: '#dbeafe',
  },
  adminTimeText: {
    color: '#9ca3af',
  },
  readReceipt: {
    fontSize: 11,
    color: '#dbeafe',
    marginLeft: 4,
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  fileText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  closedBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#fbbf24',
  },
  closedBannerText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  textInputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
});

