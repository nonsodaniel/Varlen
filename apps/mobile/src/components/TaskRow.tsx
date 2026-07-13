import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SwipeableRow } from './SwipeableRow';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { Avatar } from './ui/Avatar';
import { typography, spacing } from '../constants/theme';
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

  return (
    <SwipeableRow
      onSwipeRight={() => onToggle(task.id)}
      onSwipeLeft={onDelete ? () => onDelete(task.id) : undefined}
      swipeRightEnabled={!task.completed}
      swipeLeftEnabled={!!onDelete}
    >
      <View style={[styles.row, !isLast && styles.rowBorder]}>
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
        <Text
          style={[
            styles.title,
            task.completed && styles.titleCompleted,
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
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
  title: {
    ...typography.callout,
    color: colors.text,
    flex: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
});
