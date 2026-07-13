import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { typography, spacing, radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { haptics } from '../hooks/useHaptics';
import { useReactionStore } from '../stores/reactionStore';
import { useAuthStore } from '../stores/authStore';

const QUICK_EMOJIS = ['\u2764\uFE0F', '\uD83D\uDC4F', '\uD83C\uDF89', '\uD83D\uDCAA', '\uD83D\uDD25', '\u2B50'];

interface ReactionBarProps {
  entityType: string;
  entityId: string;
}

export function ReactionBar({ entityType, entityId }: ReactionBarProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const reactions = useReactionStore(
    (s) => s.reactions[`${entityType}:${entityId}`] || [],
  );
  const fetchReactions = useReactionStore((s) => s.fetchReactions);
  const addReaction = useReactionStore((s) => s.addReaction);
  const removeReaction = useReactionStore((s) => s.removeReaction);
  const userId = useAuthStore((s) => s.user?.id);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetchReactions(entityType, entityId);
  }, [entityType, entityId, fetchReactions]);

  // Group reactions by emoji — memoized to avoid recalculating every render
  const grouped = useMemo(
    () =>
      reactions.reduce(
        (acc, r) => {
          if (!acc[r.emoji]) acc[r.emoji] = { count: 0, reactionIds: [], isMine: false };
          acc[r.emoji].count++;
          acc[r.emoji].reactionIds.push(r.id);
          if (r.userId === userId) acc[r.emoji].isMine = true;
          return acc;
        },
        {} as Record<string, { count: number; reactionIds: string[]; isMine: boolean }>,
      ),
    [reactions, userId],
  );

  const handleToggle = useCallback(
    (emoji: string) => {
      haptics.light();
      const group = grouped[emoji];
      if (group?.isMine) {
        // Find my reaction id and remove it
        const myReaction = reactions.find(
          (r) => r.emoji === emoji && r.userId === userId,
        );
        if (myReaction) {
          removeReaction(myReaction.id, entityType, entityId);
        }
      } else {
        addReaction(entityType, entityId, emoji);
      }
    },
    [grouped, reactions, userId, entityType, entityId],
  );

  const handlePickerSelect = useCallback(
    (emoji: string) => {
      setShowPicker(false);
      haptics.light();
      addReaction(entityType, entityId, emoji);
    },
    [entityType, entityId],
  );

  const emojiEntries = Object.entries(grouped);

  return (
    <View style={styles.container}>
      {emojiEntries.map(([emoji, data]) => (
        <Animated.View key={emoji} entering={ZoomIn.duration(200)}>
          <TouchableOpacity
            style={[styles.reactionChip, data.isMine && styles.reactionChipMine]}
            onPress={() => handleToggle(emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {data.count > 1 && (
              <Text style={[styles.reactionCount, data.isMine && styles.reactionCountMine]}>
                {data.count}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      ))}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => {
          haptics.light();
          setShowPicker(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.addBtnText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <Animated.View entering={FadeIn.duration(150)} style={styles.pickerCard}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.pickerEmoji}
                onPress={() => handlePickerSelect(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reactionChipMine: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    ...typography.caption2,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  reactionCountMine: {
    color: colors.primary,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addBtnText: {
    fontSize: 16,
    color: colors.textTertiary,
    fontWeight: '500',
    lineHeight: 18,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  pickerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmojiText: {
    fontSize: 22,
  },
});
