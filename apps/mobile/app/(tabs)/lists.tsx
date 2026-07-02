import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { colors, typography, spacing, radius, shadows, categoryColors } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { useListStore } from '../../src/stores/listStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useExpenseStore } from '../../src/stores/expenseStore';
import { getUserName, getUserColor, currentUser, mockSubscriptions, mockBudgets, mockRoutines } from '../../src/data/mock';

type LifeSpace = 'tasks' | 'shopping' | 'money' | 'routines';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.md;
const GRID_PADDING = spacing.xl;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

const SPACE_ACCENTS = {
  tasks: { color: categoryColors.household.icon, bg: categoryColors.household.bg },
  shopping: { color: categoryColors.groceries.icon, bg: categoryColors.groceries.bg },
  money: { color: colors.primary, bg: colors.primaryLight },
  routines: { color: categoryColors.transport.icon, bg: categoryColors.transport.bg },
} as const;

export default function ListsScreen() {
  const router = useRouter();
  const [activeSpace, setActiveSpace] = useState<LifeSpace>('tasks');
  const { tasks } = useTaskStore();
  const { lists } = useListStore();
  const { expenses, getBalance } = useExpenseStore();

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const totalItems = lists.reduce((sum, l) => sum + l.items.length, 0);
  const listNames = lists.map(l => l.name).join(', ');

  const balance = getBalance();
  const unsettledCount = expenses.filter(e => !e.settled).length;

  const dayOfWeek = new Date().getDay();
  const todayRoutineCount = mockRoutines.filter(r => r.enabled && r.days.includes(dayOfWeek)).length;
  const nextRoutine = mockRoutines
    .filter(r => r.enabled && r.days.includes(dayOfWeek))
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Life</Text>
        </View>

        {/* Life Spaces Grid */}
        <View style={styles.grid}>
          {/* Row 1 */}
          <View style={styles.gridRow}>
            {/* Tasks Card */}
            <TouchableOpacity
              style={[
                styles.spaceCard,
                activeSpace === 'tasks' && styles.spaceCardActive,
                activeSpace === 'tasks' && { borderColor: SPACE_ACCENTS.tasks.color },
              ]}
              onPress={() => setActiveSpace('tasks')}
              activeOpacity={0.7}
            >
              <View style={styles.spaceCardInner}>
                <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.tasks.bg }]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={SPACE_ACCENTS.tasks.color} />
                </View>
                <Text style={styles.spaceTitle}>Tasks & Chores</Text>
                <Text style={styles.spaceStat}>{pendingTasks} pending</Text>
                <View style={styles.spaceProgressTrack}>
                  <View
                    style={[
                      styles.spaceProgressFill,
                      {
                        width: `${Math.round(taskProgress * 100)}%`,
                        backgroundColor: SPACE_ACCENTS.tasks.color,
                      },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/* Shopping Card */}
            <TouchableOpacity
              style={[
                styles.spaceCard,
                activeSpace === 'shopping' && styles.spaceCardActive,
                activeSpace === 'shopping' && { borderColor: SPACE_ACCENTS.shopping.color },
              ]}
              onPress={() => setActiveSpace('shopping')}
              activeOpacity={0.7}
            >
              <View style={styles.spaceCardInner}>
                <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.shopping.bg }]}>
                  <Ionicons name="cart-outline" size={22} color={SPACE_ACCENTS.shopping.color} />
                </View>
                <Text style={styles.spaceTitle}>Shopping</Text>
                <Text style={styles.spaceStat}>{lists.length} lists · {totalItems} items</Text>
                <Text style={styles.spaceSubtext} numberOfLines={1}>{listNames}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.gridRow}>
            {/* Money Card */}
            <TouchableOpacity
              style={[
                styles.spaceCard,
                activeSpace === 'money' && styles.spaceCardActive,
                activeSpace === 'money' && { borderColor: SPACE_ACCENTS.money.color },
              ]}
              onPress={() => setActiveSpace('money')}
              activeOpacity={0.7}
            >
              <View style={styles.spaceCardInner}>
                <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.money.bg }]}>
                  <Ionicons name="wallet-outline" size={22} color={SPACE_ACCENTS.money.color} />
                </View>
                <Text style={styles.spaceTitle}>Money</Text>
                <Text style={[styles.spaceStatHighlight, { color: balance.net >= 0 ? colors.success : colors.error }]}>
                  {balance.net >= 0 ? '+' : '-'}${Math.abs(balance.net).toFixed(2)}
                </Text>
                <Text style={styles.spaceSubtext}>{unsettledCount} unsettled</Text>
              </View>
            </TouchableOpacity>

            {/* Routines Card */}
            <TouchableOpacity
              style={[
                styles.spaceCard,
                activeSpace === 'routines' && styles.spaceCardActive,
                activeSpace === 'routines' && { borderColor: SPACE_ACCENTS.routines.color },
              ]}
              onPress={() => setActiveSpace('routines')}
              activeOpacity={0.7}
            >
              <View style={styles.spaceCardInner}>
                <View style={[styles.spaceIconWrap, { backgroundColor: SPACE_ACCENTS.routines.bg }]}>
                  <Ionicons name="repeat-outline" size={22} color={SPACE_ACCENTS.routines.color} />
                </View>
                <Text style={styles.spaceTitle}>Routines</Text>
                <Text style={styles.spaceStat}>{todayRoutineCount} today</Text>
                {nextRoutine && (
                  <Text style={styles.spaceSubtext}>Next: {nextRoutine.time}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Content Area */}
        <View style={styles.contentArea}>
          {activeSpace === 'tasks' && <TasksContent />}
          {activeSpace === 'shopping' && <ShoppingContent />}
          {activeSpace === 'money' && <MoneyContent />}
          {activeSpace === 'routines' && <RoutinesContent />}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      {activeSpace !== 'routines' && (
        <FAB activeSpace={activeSpace} />
      )}
    </SafeAreaView>
  );
}

// ─── FAB ──────────────────────────────────────────────────

function FAB({ activeSpace }: { activeSpace: LifeSpace }) {
  const router = useRouter();
  const { addList } = useListStore();

  const handlePress = useCallback(() => {
    switch (activeSpace) {
      case 'tasks':
        router.push('/add-task');
        break;
      case 'shopping': {
        const nl = {
          id: `list-${Date.now()}`,
          name: 'New List',
          items: [],
          shared: true,
          createdBy: currentUser.id,
          updatedAt: new Date().toISOString().split('T')[0],
        };
        addList(nl);
        router.push(`/list/${nl.id}`);
        break;
      }
      case 'money':
        router.push('/add-expense');
        break;
    }
  }, [activeSpace, router, addList]);

  const labels: Record<string, string> = {
    tasks: 'Add task',
    shopping: 'New list',
    money: 'Add expense',
  };

  return (
    <TouchableOpacity style={styles.fab} onPress={handlePress} activeOpacity={0.9}>
      <Ionicons name="add" size={24} color={colors.textInverse} />
      <Text style={styles.fabLabel}>{labels[activeSpace]}</Text>
    </TouchableOpacity>
  );
}

// ─── TASKS CONTENT ────────────────────────────────────────

function TasksContent() {
  const { tasks, toggleTask } = useTaskStore();
  const [showDone, setShowDone] = useState(false);

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  const grouped = pending.reduce<Record<string, typeof pending>>((acc, task) => {
    const cat = task.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  const categoryOrder = ['household', 'errand', 'personal', 'work', 'other'];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (categoryOrder.indexOf(a) === -1 ? 99 : categoryOrder.indexOf(a)) -
              (categoryOrder.indexOf(b) === -1 ? 99 : categoryOrder.indexOf(b))
  );

  return (
    <View>
      {sortedCategories.map((cat) => {
        const catKey = cat as keyof typeof categoryColors;
        const cc = categoryColors[catKey] || categoryColors.other;
        return (
          <View key={cat} style={styles.taskGroup}>
            <View style={styles.taskGroupHeader}>
              <View style={[styles.taskGroupDot, { backgroundColor: cc.icon }]} />
              <Text style={styles.taskGroupLabel}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              <View style={styles.taskGroupCountBadge}>
                <Text style={styles.taskGroupCount}>{grouped[cat].length}</Text>
              </View>
            </View>
            <View style={styles.taskGroupCard}>
              {grouped[cat].map((task, idx) => (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskRow,
                    idx < grouped[cat].length - 1 && styles.taskRowBorder,
                  ]}
                  onPress={() => toggleTask(task.id)}
                  activeOpacity={0.6}
                >
                  <View style={[
                    styles.taskCheck,
                    task.priority === 'high' && { borderColor: colors.error },
                  ]} />
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={styles.taskMeta}>
                      {task.assignedTo && (
                        <Avatar name={getUserName(task.assignedTo)} size={18} color={getUserColor(task.assignedTo)} />
                      )}
                      {task.recurring && <Ionicons name="repeat-outline" size={12} color={colors.textTertiary} />}
                      {task.isChore && <Ionicons name="home-outline" size={12} color={colors.textTertiary} />}
                    </View>
                  </View>
                  {task.dueDate && (
                    <Text style={styles.taskDue}>{format(new Date(task.dueDate + 'T00:00:00'), 'MMM d')}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* Done section */}
      {done.length > 0 && (
        <View style={styles.doneSection}>
          <TouchableOpacity style={styles.doneHeader} onPress={() => setShowDone(!showDone)} activeOpacity={0.6}>
            <Ionicons
              name={showDone ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={colors.textTertiary}
            />
            <Text style={styles.doneLabel}>Done ({done.length})</Text>
          </TouchableOpacity>
          {showDone && (
            <View style={styles.taskGroupCard}>
              {done.map((task, idx) => (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskRowDone,
                    idx < done.length - 1 && styles.taskRowBorder,
                  ]}
                  onPress={() => toggleTask(task.id)}
                  activeOpacity={0.6}
                >
                  <View style={styles.taskCheckDone}>
                    <Ionicons name="checkmark" size={13} color={colors.textInverse} />
                  </View>
                  <Text style={styles.taskTitleDone}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── SHOPPING CONTENT ─────────────────────────────────────

function ShoppingContent() {
  const router = useRouter();
  const { lists, addList } = useListStore();

  const handleNew = () => {
    const nl = {
      id: `list-${Date.now()}`,
      name: 'New List',
      items: [],
      shared: true,
      createdBy: currentUser.id,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    addList(nl);
    router.push(`/list/${nl.id}`);
  };

  return (
    <View>
      {lists.map((list) => {
        const unchecked = list.items.filter(i => !i.checked).length;
        const total = list.items.length;
        const pct = total > 0 ? Math.round(((total - unchecked) / total) * 100) : 0;
        const progress = total > 0 ? (total - unchecked) / total : 0;
        return (
          <TouchableOpacity
            key={list.id}
            style={styles.shoppingCard}
            onPress={() => router.push(`/list/${list.id}`)}
            activeOpacity={0.6}
          >
            <View style={styles.shoppingHeader}>
              <View style={styles.shoppingIconWrap}>
                <Ionicons name="bag-outline" size={18} color={categoryColors.groceries.icon} />
              </View>
              <View style={styles.shoppingInfo}>
                <Text style={styles.shoppingName}>{list.name}</Text>
                <Text style={styles.shoppingMeta}>
                  {unchecked} remaining · {pct}% complete
                </Text>
              </View>
              <ProgressRing
                progress={progress}
                size={48}
                strokeWidth={4}
                color={categoryColors.groceries.icon}
              >
                <Text style={styles.shoppingRingText}>{pct}%</Text>
              </ProgressRing>
            </View>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.createRow} onPress={handleNew} activeOpacity={0.6}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.createText}>Create new list</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── MONEY CONTENT ────────────────────────────────────────

function MoneyContent() {
  const { expenses, getBalance } = useExpenseStore();
  const balance = getBalance();
  const unsettled = expenses.filter(e => !e.settled);

  const catIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    groceries: 'cart-outline',
    dining: 'restaurant-outline',
    utilities: 'flash-outline',
    rent: 'home-outline',
    transport: 'car-outline',
    entertainment: 'film-outline',
    health: 'heart-outline',
    other: 'ellipsis-horizontal-outline',
  };

  return (
    <View>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>Net balance</Text>
          <Text style={[
            styles.balanceAmount,
            { color: balance.net >= 0 ? colors.success : colors.error },
          ]}>
            {balance.net >= 0 ? '+' : '-'}${Math.abs(balance.net).toFixed(2)}
          </Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceBottom}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>You owe</Text>
            <Text style={styles.balanceItemValue}>${balance.userOwes.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceItemDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Owed to you</Text>
            <Text style={styles.balanceItemValue}>${balance.partnerOwes.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Budgets */}
      <Text style={styles.sectionLabel}>BUDGETS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.budgetScroll}
      >
        {mockBudgets.map((b) => {
          const pct = Math.round((b.spent / b.limit) * 100);
          const progress = b.spent / b.limit;
          const cc = categoryColors[b.category] || categoryColors.other;
          const isOver = pct > 90;
          return (
            <View key={b.id} style={styles.budgetCard}>
              <View style={styles.budgetRingRow}>
                <ProgressRing
                  progress={Math.min(progress, 1)}
                  size={48}
                  strokeWidth={4}
                  color={isOver ? colors.error : cc.icon}
                >
                  <Text style={[styles.budgetRingText, { color: isOver ? colors.error : cc.icon }]}>{pct}%</Text>
                </ProgressRing>
              </View>
              <Text style={styles.budgetCategory}>
                {b.category.charAt(0).toUpperCase() + b.category.slice(1)}
              </Text>
              <Text style={styles.budgetSpent}>${b.spent}</Text>
              <Text style={styles.budgetLimit}>of ${b.limit}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Subscriptions */}
      <Text style={styles.sectionLabel}>SUBSCRIPTIONS</Text>
      <View style={styles.subsCard}>
        {mockSubscriptions.map((sub, idx) => (
          <View key={sub.id} style={[styles.subRow, idx < mockSubscriptions.length - 1 && styles.subRowBorder]}>
            <View style={styles.subInfo}>
              <Text style={styles.subName}>{sub.name}</Text>
              <Text style={styles.subMeta}>
                {sub.cycle} · next {format(new Date(sub.nextBillingDate), 'MMM d')}
              </Text>
            </View>
            <Text style={styles.subAmount}>${sub.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Recent Expenses */}
      <Text style={styles.sectionLabel}>RECENT EXPENSES</Text>
      <View style={styles.expensesCard}>
        {unsettled.map((exp, idx) => {
          const cc = categoryColors[exp.category] || categoryColors.other;
          return (
            <View
              key={exp.id}
              style={[
                styles.expenseRow,
                idx < unsettled.length - 1 && styles.expenseRowBorder,
              ]}
            >
              <View style={[styles.expenseIcon, { backgroundColor: cc.bg }]}>
                <Ionicons
                  name={catIcons[exp.category] || 'ellipsis-horizontal-outline'}
                  size={16}
                  color={cc.icon}
                />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseTitle}>{exp.title}</Text>
                <Text style={styles.expenseMeta}>
                  {getUserName(exp.paidBy)} · {format(new Date(exp.date + 'T00:00:00'), 'MMM d')}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>${exp.amount.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── ROUTINES CONTENT ─────────────────────────────────────

function RoutinesContent() {
  const dayOfWeek = new Date().getDay();
  const todayRoutines = mockRoutines.filter(r => r.enabled && r.days.includes(dayOfWeek));
  const otherRoutines = mockRoutines.filter(r => r.enabled && !r.days.includes(dayOfWeek));
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View>
      {/* Today's Routines */}
      <Text style={styles.sectionLabel}>TODAY</Text>
      {todayRoutines.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No routines scheduled today</Text>
        </View>
      ) : (
        <View style={styles.routineCard}>
          {todayRoutines.map((r, idx) => (
            <View key={r.id} style={[styles.routineRow, idx < todayRoutines.length - 1 && styles.routineRowBorder]}>
              <View style={styles.routineTimeWrap}>
                <Text style={styles.routineTime}>{r.time}</Text>
              </View>
              <View style={styles.routineInfo}>
                <Text style={styles.routineTitle}>{r.title}</Text>
                <Text style={styles.routineCategory}>{r.category}</Text>
              </View>
              <Avatar name={getUserName(r.assignedTo)} size={28} color={getUserColor(r.assignedTo)} />
            </View>
          ))}
        </View>
      )}

      {/* Other Routines */}
      {otherRoutines.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>OTHER DAYS</Text>
          <View style={styles.routineCard}>
            {otherRoutines.map((r, idx) => (
              <View key={r.id} style={[styles.routineRow, idx < otherRoutines.length - 1 && styles.routineRowBorder]}>
                <View style={styles.routineTimeWrap}>
                  <Text style={styles.routineTime}>{r.time}</Text>
                </View>
                <View style={styles.routineInfo}>
                  <Text style={styles.routineTitle}>{r.title}</Text>
                  <View style={styles.dayDotsRow}>
                    {dayLabels.map((label, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dayDot,
                          r.days.includes(i) && styles.dayDotActive,
                        ]}
                      >
                        <Text style={[
                          styles.dayDotText,
                          r.days.includes(i) && styles.dayDotTextActive,
                        ]}>
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Avatar name={getUserName(r.assignedTo)} size={28} color={getUserColor(r.assignedTo)} />
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },

  // Grid
  grid: {
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  spaceCard: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.md,
  },
  spaceCardActive: {
    ...shadows.md,
  },
  spaceCardInner: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  spaceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  spaceTitle: {
    ...typography.headline,
    color: colors.text,
  },
  spaceStat: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  spaceStatHighlight: {
    ...typography.headline,
    marginTop: 2,
  },
  spaceSubtext: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  spaceProgressTrack: {
    height: 3,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  spaceProgressFill: {
    height: 3,
    borderRadius: 2,
  },

  // Content area
  contentArea: {
    paddingHorizontal: GRID_PADDING,
  },

  // Section label (shared)
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0,
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyText: {
    ...typography.callout,
    color: colors.textTertiary,
  },

  // ─── Tasks ──────────────────────────
  taskGroup: {
    marginTop: spacing.lg,
  },
  taskGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  taskGroupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskGroupLabel: {
    ...typography.subhead,
    color: colors.text,
    flex: 1,
  },
  taskGroupCountBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  taskGroupCount: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  taskGroupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  taskRowBorder: {
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskTitle: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskDue: {
    ...typography.caption1,
    color: colors.textTertiary,
  },

  // Done
  doneSection: {
    marginTop: spacing['2xl'],
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  doneLabel: {
    ...typography.subhead,
    color: colors.textTertiary,
  },
  taskRowDone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    opacity: 0.5,
  },
  taskCheckDone: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitleDone: {
    ...typography.body,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
    flex: 1,
  },

  // ─── Shopping ───────────────────────
  shoppingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  shoppingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shoppingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: categoryColors.groceries.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  shoppingInfo: {
    flex: 1,
  },
  shoppingName: {
    ...typography.headline,
    color: colors.text,
  },
  shoppingMeta: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 1,
  },
  shoppingRingText: {
    ...typography.caption2,
    color: categoryColors.groceries.icon,
    fontWeight: '600',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  createText: {
    ...typography.subhead,
    color: colors.primary,
  },

  // ─── Money ──────────────────────────
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  balanceTop: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  balanceLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    ...typography.largeTitle,
    marginTop: spacing.xs,
  },
  balanceDivider: {
    marginHorizontal: spacing.lg,
  },
  balanceBottom: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemDivider: {
  },
  balanceItemLabel: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  balanceItemValue: {
    ...typography.headline,
    color: colors.text,
    marginTop: 2,
  },

  // Budgets
  budgetScroll: {
    paddingRight: spacing.xl,
    gap: spacing.sm,
  },
  budgetCard: {
    width: 130,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  budgetRingRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  budgetRingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  budgetCategory: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  budgetSpent: {
    ...typography.headline,
    color: colors.text,
  },
  budgetLimit: {
    ...typography.caption2,
    color: colors.textTertiary,
  },

  // Subscriptions
  subsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  subRowBorder: {
  },
  subInfo: {
    flex: 1,
  },
  subName: {
    ...typography.body,
    color: colors.text,
  },
  subMeta: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  subAmount: {
    ...typography.headline,
    color: colors.text,
  },

  // Expenses
  expensesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  expenseRowBorder: {
  },
  expenseIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    ...typography.body,
    color: colors.text,
  },
  expenseMeta: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  expenseAmount: {
    ...typography.headline,
    color: colors.text,
  },

  // ─── Routines ───────────────────────
  routineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  routineRowBorder: {
  },
  routineTimeWrap: {
    width: 48,
  },
  routineTime: {
    ...typography.caption1,
    color: colors.primary,
  },
  routineInfo: {
    flex: 1,
  },
  routineTitle: {
    ...typography.body,
    color: colors.text,
  },
  routineCategory: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
    textTransform: 'capitalize',
  },

  // Day dots
  dayDotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.xs,
  },
  dayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: colors.primaryLight,
  },
  dayDotText: {
    ...typography.caption2,
    color: colors.textTertiary,
  },
  dayDotTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: 28,
    backgroundColor: colors.primary,
    ...shadows.lg,
    zIndex: 100,
  },
  fabLabel: {
    ...typography.subhead,
    color: colors.textInverse,
  },
});
