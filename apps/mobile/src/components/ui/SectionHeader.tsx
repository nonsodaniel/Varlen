import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../constants/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  onAdd?: () => void;
  dotColor?: string;
}

export function SectionHeader({ title, actionLabel, onAction, onAdd, dotColor }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.actionsRow}>
        {actionLabel && onAction && (
          <TouchableOpacity
            onPress={onAction}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
        {onAdd && (
          <TouchableOpacity
            onPress={onAdd}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.addBtn}
          >
            <Ionicons name="add-circle" size={22} color={dotColor || colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    ...typography.title3,
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  action: {
    ...typography.subhead,
    color: colors.primary,
  },
  addBtn: {
    padding: 2,
  },
});
