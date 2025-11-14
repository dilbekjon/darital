import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTenantChat } from '../hooks/useTenantChat';
import { useLanguage } from '../contexts/LanguageContext';
import type { Conversation } from '../lib/chatApi';

export default function ChatListScreen({ navigation }: any) {
  const { t } = useLanguage(); // Safe hook that always returns translations
  
  const {
    loading,
    error,
    conversations,
    connected,
    refreshConversations,
    createConversation,
  } = useTenantChat();

  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  const handleStartNewChat = async () => {
    if (creating) return;
    
    // Prompt user for topic
    Alert.prompt(
      t.startNewChat,
      t.enterChatTopic,
      [
        {
          text: t.cancel,
          style: 'cancel',
        },
        {
          text: t.ok,
          onPress: async (topic) => {
            setCreating(true);
            try {
              const chatTopic = topic?.trim() || '';
              const newConv = await createConversation(chatTopic || undefined, 'Hello, I need assistance');
              
              if (newConv) {
                navigation.navigate('ChatRoom', { 
                  conversationId: newConv.id,
                  topic: chatTopic || t.supportChat,
                });
              } else {
                Alert.alert('Error', 'Failed to start chat. Please try again.');
              }
            } catch (err) {
              console.warn('[ChatListScreen] Failed to create conversation:', err);
              Alert.alert('Error', 'Failed to start chat');
            } finally {
              setCreating(false);
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.justNow;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return '#10b981'; // green
      case 'PENDING':
        return '#f59e0b'; // yellow
      case 'CLOSED':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => navigation.navigate('ChatRoom', { 
        conversationId: item.id,
        topic: item.topic || t.supportChat,
      })}
    >
      <View style={styles.conversationHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.conversationTitle}>
            {item.topic || t.supportChat}
          </Text>
          {item.admin && (
            <Text style={styles.conversationSubtitle}>
              {t.chatWith} {item.admin.fullName}
            </Text>
          )}
        </View>
        <Text style={styles.conversationTime}>
          {formatTime(item.updatedAt)}
        </Text>
      </View>

      {item.messages && item.messages.length > 0 && (
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.messages[0].content}
        </Text>
      )}

      <View style={styles.statusBadge}>
        <View
          style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]}
        />
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection Status Banner */}
      {!connected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ Disconnected</Text>
          <Text style={styles.offlineSubtext}>Reconnecting to chat server...</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.supportChat}</Text>
        <TouchableOpacity 
          style={[styles.newChatButton, creating && styles.newChatButtonDisabled]} 
          onPress={handleStartNewChat}
          disabled={creating}
        >
          <Text style={styles.newChatButtonText}>
            {creating ? '...' : `+ ${t.startNewChat}`}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshConversations}>
            <Text style={styles.retryButtonText}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        extraData={conversations}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>{t.noConversations}</Text>
            <TouchableOpacity style={styles.startChatButton} onPress={handleStartNewChat}>
              <Text style={styles.startChatButtonText}>{t.startNewChat}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fde047',
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
  offlineSubtext: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  newChatButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newChatButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  newChatButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  conversationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  conversationSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  conversationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
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
    color: '#6b7280',
    marginBottom: 24,
  },
  startChatButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

