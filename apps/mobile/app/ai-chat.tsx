import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { typography, spacing, radius } from '../src/constants/theme';
import { useAiStore, AiMessage, AiConversation } from '../src/stores/aiStore';
import ChatBubble from '../src/components/ai/ChatBubble';
import TypingIndicator from '../src/components/ai/TypingIndicator';
import QuickPrompts from '../src/components/ai/QuickPrompts';
import PlannerSheet from '../src/components/ai/PlannerSheet';

export default function AiChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    messages,
    isTyping,
    activeConversationId,
    conversations,
    sendMessage,
    retryMessage,
    removeMessage,
    startNewConversation,
    fetchConversations,
    loadConversation,
    deleteConversation,
    fetchUsage,
    usage,
  } = useAiStore();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const initialPromptSent = useRef(false);

  useEffect(() => {
    fetchConversations();
    fetchUsage();
  }, []);

  // Handle deep-linked prompt from AiInsightCard or other screens
  useEffect(() => {
    if (params.prompt && !initialPromptSent.current) {
      initialPromptSent.current = true;
      // Start fresh conversation with the prompt
      startNewConversation();
      const tid = setTimeout(() => {
        sendMessage(params.prompt!);
      }, 300);
      return () => clearTimeout(tid);
    }
  }, [params.prompt]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const tid = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      return () => clearTimeout(tid);
    }
  }, [messages.length, isTyping]);

  const isLimitReached = usage !== null && usage.remaining <= 0;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isTyping || isLimitReached) return;
    setInput('');
    sendMessage(text);
  }, [input, isTyping, isLimitReached, sendMessage]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    if (isLimitReached) return;
    sendMessage(prompt);
  }, [isLimitReached, sendMessage]);

  const handleNewChat = useCallback(() => {
    startNewConversation();
    setShowHistory(false);
  }, [startNewConversation]);

  const handleLoadConversation = useCallback((conv: AiConversation) => {
    loadConversation(conv.id);
    setShowHistory(false);
  }, [loadConversation]);

  const handleDeleteConversation = useCallback((conv: AiConversation) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConversation(conv.id),
        },
      ],
    );
  }, [deleteConversation]);

  const handleRetryMessage = useCallback((msg: AiMessage) => {
    retryMessage(msg.id);
  }, [retryMessage]);

  const handleRemoveMessage = useCallback((msg: AiMessage) => {
    removeMessage(msg.id);
  }, [removeMessage]);

  const renderMessage = useCallback(({ item }: { item: AiMessage }) => (
    <ChatBubble
      message={item}
      onRetry={handleRetryMessage}
      onDelete={handleRemoveMessage}
    />
  ), [handleRetryMessage, handleRemoveMessage]);

  if (showHistory) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* History Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm },
          ]}
        >
          <TouchableOpacity
            onPress={() => setShowHistory(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Conversations
          </Text>
          <TouchableOpacity onPress={handleNewChat}>
            <Ionicons name="create-outline" size={22} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {/* Conversation List */}
        <FlatList keyboardDismissMode="on-drag"
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyHistory}>
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={colors.textTertiary}
              />
              <Text
                style={[styles.emptyHistoryText, { color: colors.textSecondary }]}
              >
                No conversations yet
              </Text>
              <Text
                style={[styles.emptyHistoryHint, { color: colors.textTertiary }]}
              >
                Start a conversation to see your history here
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.historyItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleLoadConversation(item)}
              onLongPress={() => handleDeleteConversation(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.historyIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="chatbubble-outline" size={16} color="#8B5CF6" />
              </View>
              <View style={styles.historyItemContent}>
                <Text
                  style={[styles.historyTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.title || 'Untitled'}
                </Text>
                {item.lastMessage && (
                  <Text
                    style={[
                      styles.historyPreview,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                )}
                <Text
                  style={[
                    styles.historyDate,
                    { color: colors.textTertiary },
                  ]}
                >
                  {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerBadge}>
            <Ionicons name="sparkles" size={14} color="#8B5CF6" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Assistant
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowPlanner(true)}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="map-outline" size={20} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              fetchConversations();
              setShowHistory(true);
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNewChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {messages.length === 0 ? (
          <QuickPrompts onSelect={handleQuickPrompt} onPlan={() => setShowPlanner(true)} />
        ) : (
          <FlatList keyboardDismissMode="on-drag"
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Usage Banner */}
        {usage !== null && (
          <View
            style={[
              styles.usageBanner,
              {
                backgroundColor: isLimitReached
                  ? isDark ? '#451A1A' : '#FEF2F2'
                  : colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            {isLimitReached
              ? <Ionicons name="alert-circle" size={14} color="#EF4444" />
              : <Ionicons name="sparkles-outline" size={14} color={colors.textTertiary} />
            }
            <Text
              style={[
                styles.usageBannerText,
                { color: isLimitReached ? '#EF4444' : colors.textTertiary },
              ]}
            >
              {isLimitReached
                ? 'Daily limit reached. Try again tomorrow.'
                : `${usage.remaining}/${usage.dailyLimit} messages remaining today`}
            </Text>
          </View>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: isDark ? colors.elevated : colors.background,
                borderColor: isLimitReached ? '#FCA5A5' : colors.border,
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                isLimitReached
                  ? 'Daily limit reached'
                  : 'Ask for help with anything...'
              }
              placeholderTextColor={isLimitReached ? '#FCA5A5' : colors.textTertiary}
              multiline
              maxLength={2000}
              style={[styles.textInput, { color: colors.text }]}
              editable={!isTyping && !isLimitReached}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              disabled={!input.trim() || isTyping || isLimitReached}
              onPress={handleSend}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    input.trim() && !isTyping && !isLimitReached
                      ? '#8B5CF6'
                      : isDark ? colors.border : '#E5E7EB',
                },
              ]}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <PlannerSheet
        visible={showPlanner}
        onClose={() => setShowPlanner(false)}
        onChatPrompt={(prompt) => {
          startNewConversation();
          setShowPlanner(false);
          setTimeout(() => sendMessage(prompt), 300);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerBtn: {
    padding: 2,
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  usageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
  },
  usageBannerText: {
    ...typography.caption1,
    fontWeight: '500',
  },
  inputBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginBottom: 1,
  },
  emptyHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: spacing.sm,
  },
  emptyHistoryText: {
    ...typography.headline,
  },
  emptyHistoryHint: {
    ...typography.callout,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  historyItemContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  historyTitle: {
    ...typography.subhead,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyPreview: {
    ...typography.footnote,
    marginBottom: 4,
  },
  historyDate: {
    ...typography.caption1,
  },
});
