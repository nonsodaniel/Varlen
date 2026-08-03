import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { SwipeableRow } from './SwipeableRow';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { Avatar } from './ui/Avatar';
import { typography, spacing, radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import type { Task } from '../types';

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  showAvatar?: boolean;
  avatarName?: string;
  avatarColor?: string;
  isLast?: boolean;
}

function formatDueDate(dateStr: string): { label: string; isOverdue: boolean } {
  const date = parseISO(dateStr);
  if (isToday(date)) return { label: 'Today', isOverdue: false };
  if (isTomorrow(date)) return { label: 'Tomorrow', isOverdue: false };
  if (isPast(date)) return { label: `Overdue · ${format(date, 'MMM d')}`, isOverdue: true };
  return { label: format(date, 'MMM d'), isOverdue: false };
}

function formatDueTime(dateStr: string): string | null {
  const date = parseISO(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return null;
  return format(date, 'h:mm a');
}

export function TaskRow({
  task,
  onToggle,
  onDelete,
  showAvatar = false,
  avatarName,
  avatarColor,
  isLast = false,
}: TaskRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;
  const dueTime = task.dueDate ? formatDueTime(task.dueDate) : null;
  const isHigh = task.priority === 'high';
  const hasMetadata = dueInfo || isHigh || task.recurring;

  return (
    <SwipeableRow
      onSwipeRight={() => onToggle(task.id)}
      onSwipeLeft={onDelete ? () => onDelete(task.id) : undefined}
      swipeRightEnabled={!task.completed}
      swipeLeftEnabled={!!onDelete}
    >
      <View
        style={[styles.row, !isLast && styles.rowBorder]}
        accessible={true}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={task.title}
      >
        {showAvatar && (
          <Avatar
            name={avatarName || 'Unassigned'}
            size={24}
            color={avatarColor || colors.textTertiary}
          />
        )}
        <AnimatedCheckbox
          checked={task.completed}
          onToggle={() => onToggle(task.id)}
        />
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              task.completed && styles.titleCompleted,
            ]}
            numberOfLines={expanded ? undefined : 2}
            onPress={() => setExpanded((v) => !v)}
          >
            {task.title}
          </Text>
          {!expanded && task.title.length > 60 && (
            <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={styles.seeMore}>See more</Text>
            </TouchableOpacity>
          )}
          {hasMetadata && !task.completed && (
            <View style={styles.metaRow}>
              {dueInfo && (
                <View style={[styles.metaChip, dueInfo.isOverdue && styles.metaChipOverdue]}>
                  <Ionicons
                    name="calendar-outline"
                    size={10}
                    color={dueInfo.isOverdue ? colors.error : colors.textTertiary}
                  />
                  <Text style={[styles.metaText, dueInfo.isOverdue && { color: colors.error }]}>
                    {dueInfo.label}
                  </Text>
                </View>
              )}
              {dueTime && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={10} color={colors.textTertiary} />
                  <Text style={styles.metaText}>{dueTime}</Text>
                </View>
              )}
              {isHigh && (
                <View style={[styles.metaChip, styles.metaChipHigh]}>
                  <Ionicons name="flag" size={10} color={colors.error} />
                  <Text style={[styles.metaText, { color: colors.error }]}>High</Text>
                </View>
              )}
              {task.recurring && (
                <View style={styles.metaChip}>
                  <Ionicons name="repeat-outline" size={10} color={colors.textTertiary} />
                  <Text style={styles.metaText}>{task.recurring}</Text>
                </View>
              )}
            </View>
          )}
        </View>
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(task.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </SwipeableRow>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowBorder: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.callout,
    color: colors.text,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipOverdue: {},
  metaChipHigh: {},
  metaText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  deleteBtn: {
    padding: 6,
  },
  seeMore: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
});
