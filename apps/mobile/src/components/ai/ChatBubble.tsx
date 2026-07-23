import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MindIcon } from '../ui/MindIcon';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, radius, spacing } from '../../constants/theme';
import type { AiMessage } from '../../stores/aiStore';

interface ChatBubbleProps {
  message: AiMessage;
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

export default function ChatBubble({ message }: ChatBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const isError = message.id.startsWith('error-');

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: isError ? '#FEE2E2' : '#EDE9FE' }]}>
          {isError
            ? <Ionicons name="alert-circle" size={14} color="#EF4444" />
            : <MindIcon size={14} color="#8B5CF6" />
          }
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: '#8B5CF6', borderBottomRightRadius: 4 }
            : {
                backgroundColor: isError ? '#FEF2F2' : colors.card,
                borderBottomLeftRadius: 4,
                borderWidth: 1,
                borderColor: isError ? '#FECACA' : colors.border,
              },
        ]}
      >
        {isUser ? (
          <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
            {message.content}
          </Text>
        ) : (
          <RichText
            text={message.content}
            color={isError ? '#991B1B' : colors.text}
          />
        )}
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
  bubble: {
    maxWidth: '78%',
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
});
