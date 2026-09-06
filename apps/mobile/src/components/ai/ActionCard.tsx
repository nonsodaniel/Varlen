import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useCalendarStore } from '../../stores/calendarStore';
import { useExpenseStore } from '../../stores/expenseStore';
import { useGoalStore } from '../../stores/goalStore';
import { useHabitStore } from '../../stores/habitStore';
import { useModeStore } from '../../stores/modeStore';
import { typography, spacing, radius } from '../../constants/theme';
import type { AiAction } from '../../stores/aiStore';
import { haptics } from '../../hooks/useHaptics';

const ACTION_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  task:      { icon: 'checkbox-outline',    color: '#8B5CF6', bg: '#EDE9FE', label: 'Task' },
  event:     { icon: 'calendar-outline',    color: '#F59E0B', bg: '#FEF3C7', label: 'Event' },
  meal_plan: { icon: 'restaurant-outline',  color: '#EC4899', bg: '#FCE7F3', label: 'Meal Plan' },
  expense:   { icon: 'card-outline',        color: '#10B981', bg: '#ECFDF5', label: 'Expense' },
  goal:      { icon: 'trophy-outline',      color: '#F59E0B', bg: '#FEF3C7', label: 'Goal' },
  habit:     { icon: 'repeat-outline',      color: '#06B6D4', bg: '#CFFAFE', label: 'Habit' },
};

function getDisplayTitle(action: AiAction): string {
  if (action.type === 'meal_plan') {
    const parts = [
      action.breakfast && `🌅 ${action.breakfast}`,
      action.lunch && `☀️ ${action.lunch}`,
      action.dinner && `🌙 ${action.dinner}`,
    ].filter(Boolean);
    return parts.length ? parts.join('  ') : `Meal plan for ${action.date ?? 'today'}`;
  }
  return action.title || action.name || 'Untitled';
}

function getDisplaySub(action: AiAction): string | null {
  if (action.type === 'task') {
    const parts = [];
    if (action.dueDate) parts.push(`Due ${action.dueDate}`);
    if (action.priority) parts.push(`${action.priority} priority`);
    return parts.join(' · ') || null;
  }
  if (action.type === 'event' && action.startDate) {
    const d = new Date(action.startDate);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  if (action.type === 'meal_plan') return action.date ?? null;
  if (action.type === 'expense' && action.amount != null) {
    return `$${action.amount}${action.category ? ` · ${action.category}` : ''}`;
  }
  if (action.type === 'habit') return action.frequency ?? null;
  if (action.type === 'goal' && action.targetDate) return `Target: ${action.targetDate}`;
  return null;
}

interface ActionCardProps {
  action: AiAction;
  index: number;
  onCreated: (index: number) => void;
}

export function ActionCard({ action, index, onCreated }: ActionCardProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const meta = ACTION_META[action.type] ?? ACTION_META.task;

  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';
  const mode = useModeStore((s) => s.mode);
  const isShared = mode !== 'personal';

  const addTask = useTaskStore((s) => s.addTask);
  const addEvent = useCalendarStore((s) => s.addEvent);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const addGoal = useGoalStore((s) => s.addGoal);
  const addHabit = useHabitStore((s) => s.addHabit);

  const handleCreate = async () => {
    if (action.created || loading) return;
    haptics.medium();

    // Meal plan: navigate to the meal plan screen with suggestions
    if (action.type === 'meal_plan') {
      router.push('/meal-plan' as any);
      onCreated(index);
      return;
    }

    setLoading(true);
    try {
      switch (action.type) {
        case 'task':
          await addTask({
            title: action.title ?? 'Task',
            description: action.description,
            completed: false,
            dueDate: action.dueDate,
            priority: (action.priority as any) ?? 'medium',
            createdBy: userId,
            shared: isShared,
          });
          break;

        case 'event':
          await addEvent({
            title: action.title ?? 'Event',
            description: action.description,
            startDate: action.startDate ?? new Date().toISOString(),
            endDate: action.endDate ?? new Date(Date.now() + 3600000).toISOString(),
            allDay: false,
            color: '#F59E0B',
            location: action.location,
            createdBy: userId,
            shared: isShared,
          });
          break;

        case 'expense': {
          const validCategories = ['groceries','dining','utilities','rent','transport','entertainment','health','other'];
          const cat = validCategories.includes(action.category ?? '') ? action.category as any : 'other';
          await addExpense({
            title: action.title ?? 'Expense',
            amount: action.amount ?? 0,
            currency: 'USD',
            category: cat,
            date: new Date().toISOString(),
            paidBy: userId,
            splitBetween: [],
            settled: false,
          });
          break;
        }

        case 'goal':
          await addGoal({
            title: action.title ?? 'Goal',
            progress: 0,
            target: 100,
            unit: '%',
            deadline: action.targetDate ?? '',
            color: '#F59E0B',
            createdBy: userId,
          });
          break;

        case 'habit':
          await addHabit({
            title: action.name ?? action.title ?? 'Habit',
            emoji: '⭐',
            frequency: action.frequency ?? 'daily',
            createdBy: userId,
            color: '#06B6D4',
          });
          break;
      }
      onCreated(index);
    } catch (err) {
      console.warn('[ActionCard] create failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = isDark ? meta.color + '18' : meta.bg;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: action.created ? meta.color + '50' : colors.borderLight }]}>
      <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={meta.icon as any} size={16} color={meta.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {getDisplayTitle(action)}
        </Text>
        {getDisplaySub(action) ? (
          <Text style={[styles.sub, { color: colors.textTertiary }]} numberOfLines={1}>
            {getDisplaySub(action)}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[
          styles.addBtn,
          { backgroundColor: action.created ? bgColor : meta.color },
        ]}
        onPress={handleCreate}
        disabled={action.created || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : action.created ? (
          <Ionicons name="checkmark" size={16} color={meta.color} />
        ) : (
          <Ionicons name={action.type === 'meal_plan' ? 'arrow-forward' : 'add'} size={18} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 1,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.subhead,
    fontWeight: '600',
    lineHeight: 18,
  },
  sub: {
    ...typography.caption2,
    lineHeight: 14,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
