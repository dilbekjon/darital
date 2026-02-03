import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTenantChat } from '../hooks/useTenantChat';
import { t } from '../lib/i18n';
import type { Conversation } from '../lib/chatApi';
import { useTheme } from '../contexts/ThemeContext';
import { DaritalLoader } from '../components/DaritalLoader';
import { Navbar } from '../components/Navbar';

export default function ChatListScreen({ navigation }: any) {
  const { darkMode } = useTheme();
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
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  };

  const handleStartNewChat = () => {
    if (creating) return;
    setTopicInput('');
    setShowTopicModal(true);
  };

  const handleConfirmNewChat = async () => {
    setCreating(true);
    setShowTopicModal(false);
    try {
      const chatTopic = topicInput?.trim() || '';
      const newConv = await createConversation(chatTopic || undefined, 'Salom, yordam kerak');
      if (newConv) {
        navigation.navigate('ChatRoom', {
          conversationId: newConv.id,
          topic: chatTopic || t.supportChat,
        });
      } else {
        Alert.alert(t.error, 'Chatni boshlash amalga oshmadi.');
      }
    } catch (err) {
      console.warn('[ChatListScreen] Failed to create conversation:', err);
      Alert.alert(t.error, 'Chatni boshlash amalga oshmadi.');
    } finally {
      setCreating(false);
    }
  };

  const handleCancelNewChat = () => {
    setShowTopicModal(false);
    setTopicInput('');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.justNow;
    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    if (diffDays < 7) return `${diffDays} kun oldin`;
    return date.toLocaleDateString('uz-UZ');
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
      style={[
        styles.conversationCard,
        {
          backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
          borderColor: darkMode ? '#374151' : '#E5E7EB',
        },
      ]}
      onPress={() => navigation.navigate('ChatRoom', {
        conversationId: item.id,
        topic: item.topic || t.supportChat,
      })}
    >
      <View style={styles.conversationHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.conversationTitle, { color: darkMode ? '#F9FAFB' : '#111827' }]}>
            {item.topic || t.supportChat}
          </Text>
          {item.admin && (
            <Text style={[styles.conversationSubtitle, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
              {t.chatWith} {item.admin.fullName}
            </Text>
          )}
        </View>
        <Text style={[styles.conversationTime, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
          {formatTime(item.updatedAt)}
        </Text>
      </View>

      {item.messages && item.messages.length > 0 && (
        <Text style={[styles.lastMessage, { color: darkMode ? '#9CA3AF' : '#6B7280' }]} numberOfLines={1}>
          {item.messages[0].content}
        </Text>
      )}

      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        <Text style={[styles.statusText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <DaritalLoader fullScreen darkMode={darkMode} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000000' : '#F0F9FF' }]}>
      <Navbar />
      {!connected && (
        <View style={[styles.offlineBanner, { backgroundColor: darkMode ? '#422006' : '#FEF3C7', borderBottomColor: darkMode ? '#F59E0B' : '#FDE047' }]}>
          <Text style={[styles.offlineText, { color: darkMode ? '#FCD34D' : '#92400E' }]}>⚠️ Ulanish yo‘q</Text>
          <Text style={[styles.offlineSubtext, { color: darkMode ? '#FDE68A' : '#92400E' }]}>Qayta ulanish...</Text>
        </View>
      )}

      <View style={[styles.header, { backgroundColor: darkMode ? '#111827' : '#FFFFFF', borderBottomColor: darkMode ? '#374151' : '#E5E7EB' }]}>
        <Text style={[styles.headerTitle, { color: darkMode ? '#FBBF24' : '#1E40AF' }]}>{t.supportChat}</Text>
        <TouchableOpacity
          style={[styles.newChatButton, creating && styles.newChatButtonDisabled, { backgroundColor: creating ? (darkMode ? '#6B7280' : '#9CA3AF') : (darkMode ? '#EAB308' : '#3B82F6') }]}
          onPress={handleStartNewChat}
          disabled={creating}
        >
          <Text style={styles.newChatButtonText}>{creating ? '...' : `+ ${t.startNewChat}`}</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: darkMode ? '#7F1D1D' : '#FEE2E2' }]}>
          <Text style={[styles.errorText, { color: darkMode ? '#FCA5A5' : '#991B1B' }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: darkMode ? '#EAB308' : '#EF4444' }]} onPress={refreshConversations}>
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
            <Text style={[styles.emptyText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>{t.noConversations}</Text>
            <TouchableOpacity style={[styles.startChatButton, { backgroundColor: darkMode ? '#EAB308' : '#3B82F6' }]} onPress={handleStartNewChat}>
              <Text style={styles.startChatButtonText}>{t.startNewChat}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={showTopicModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelNewChat}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelNewChat}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}>
                <Text style={[styles.modalTitle, { color: darkMode ? '#F9FAFB' : '#111827' }]}>{t.startNewChat}</Text>
                <Text style={[styles.modalHint, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>{t.enterChatTopic}</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: darkMode ? '#4B5563' : '#d1d5db', color: darkMode ? '#F9FAFB' : '#111827', backgroundColor: darkMode ? '#374151' : '#FFFFFF' }]}
                  value={topicInput}
                  onChangeText={setTopicInput}
                  placeholder={t.enterChatTopic}
                  placeholderTextColor="#9ca3af"
                  autoFocus
                  editable={!creating}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalButtonCancel, { backgroundColor: darkMode ? '#374151' : '#f3f4f6' }]} onPress={handleCancelNewChat}>
                    <Text style={[styles.modalButtonCancelText, { color: darkMode ? '#D1D5DB' : '#6b7280' }]}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButtonOk, { backgroundColor: darkMode ? '#EAB308' : '#3b82f6' }]}
                    onPress={handleConfirmNewChat}
                    disabled={creating}
                  >
                    <Text style={[styles.modalButtonOkText, { color: darkMode ? '#000000' : '#ffffff' }]}>{t.ok}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalKeyboard: {
    width: '100%',
    maxWidth: 340,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButtonCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonOk: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  modalButtonOkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

