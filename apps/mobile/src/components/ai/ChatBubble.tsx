import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, radius, spacing } from '../../constants/theme';
import { useAiStore } from '../../stores/aiStore';
import type { AiMessage } from '../../stores/aiStore';
import { ActionCard } from './ActionCard';

interface ChatBubbleProps {
  message: AiMessage;
  onRetry?: (msg: AiMessage) => void;
  onDelete?: (msg: AiMessage) => void;
}

/** Lightweight markdown-ish renderer for AI responses */
function RichText({ text, color }: { text: string; color: string }) {
  const { colors } = useTheme();
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Numbered list item: "1. text" or "1) text"
        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
        if (numberedMatch) {
          return (
            <View key={lineIdx} style={styles.listRow}>
              <Text style={[styles.listBullet, { color }]}>{numberedMatch[1]}.</Text>
              <Text style={[styles.messageText, { color, flex: 1 }]}>
                {renderInline(numberedMatch[2], color)}
              </Text>
            </View>
          );
        }

        // Bullet list item: "- text" or "• text" or "* text"
        const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
        if (bulletMatch) {
          return (
            <View key={lineIdx} style={styles.listRow}>
              <Text style={[styles.listBullet, { color }]}>{'\u2022'}</Text>
              <Text style={[styles.messageText, { color, flex: 1 }]}>
                {renderInline(bulletMatch[1], color)}
              </Text>
            </View>
          );
        }

        // Heading: "### text" or "## text"
        if (trimmed.startsWith('#')) {
          const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
          if (headingMatch) {
            return (
              <Text
                key={lineIdx}
                style={[
                  styles.messageText,
                  styles.headingText,
                  { color, marginTop: lineIdx > 0 ? 8 : 0 },
                ]}
              >
                {headingMatch[1]}
              </Text>
            );
          }
        }

        // Empty line = spacer
        if (!trimmed) {
          return <View key={lineIdx} style={styles.lineBreak} />;
        }

        // Regular text
        return (
          <Text key={lineIdx} style={[styles.messageText, { color }]}>
            {renderInline(trimmed, color)}
          </Text>
        );
      })}
    </View>
  );
}

/** Render inline bold markers: **text** */
function renderInline(text: string, color: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '700', color }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

export default function ChatBubble({ message, onRetry, onDelete }: ChatBubbleProps) {
  const { colors } = useTheme();
  const markActionCreated = useAiStore((s) => s.markActionCreated);
  const isUser = message.role === 'user';
  const isFailed = !!message._failed;
  const hasActions = !isUser && (message.actions?.length ?? 0) > 0;

  const handleActionCreated = useCallback((index: number) => {
    markActionCreated(message.id, index);
  }, [message.id, markActionCreated]);

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: '#EDE9FE' }]}>
          <Ionicons name="sparkles" size={14} color="#8B5CF6" />
        </View>
      )}
      <View style={styles.bubbleCol}>
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: '#8B5CF6', borderBottomRightRadius: 4, opacity: isFailed ? 0.55 : 1 }
              : {
                  backgroundColor: colors.card,
                  borderBottomLeftRadius: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
          ]}
        >
          {isUser ? (
            <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
              {message.content}
            </Text>
          ) : (
            <RichText text={message.content} color={colors.text} />
          )}
        </View>
        {isFailed && (
          <View style={styles.failedRow}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
            <Text style={[styles.failedLabel, { color: colors.error }]}>Failed to send</Text>
            <TouchableOpacity onPress={() => onRetry?.(message)} style={styles.failedBtn} activeOpacity={0.7}>
              <Text style={[styles.failedBtnText, { color: '#8B5CF6' }]}>Retry</Text>
            </TouchableOpacity>
            <Text style={[styles.failedDot, { color: colors.textTertiary }]}>·</Text>
            <TouchableOpacity onPress={() => onDelete?.(message)} style={styles.failedBtn} activeOpacity={0.7}>
              <Text style={[styles.failedBtnText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        {hasActions && message.actions!.map((action, i) => (
          <ActionCard
            key={i}
            action={action}
            index={i}
            onCreated={handleActionCreated}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  bubbleCol: {
    maxWidth: '82%',
    flexShrink: 1,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  headingText: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 2,
  },
  listBullet: {
    ...typography.body,
    lineHeight: 22,
    width: 18,
    fontWeight: '600',
  },
  lineBreak: {
    height: 6,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 2,
    flexWrap: 'wrap',
  },
  failedLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  failedDot: {
    fontSize: 11,
  },
  failedBtn: {
    paddingVertical: 1,
  },
  failedBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
