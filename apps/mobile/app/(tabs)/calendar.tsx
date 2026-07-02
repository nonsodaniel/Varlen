import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  format, isSameDay, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, addMonths, subMonths,
} from 'date-fns';
import { colors, typography, spacing, radius, shadows } from '../../src/constants/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { getUserColor, getUserName } from '../../src/data/mock';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const router = useRouter();
  const { events } = useCalendarStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const padded: (Date | null)[] = Array(getDay(monthStart)).fill(null);
    return [...padded, ...days];
  }, [currentMonth]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEvents = events
    .filter((e) => e.startDate.startsWith(selectedDateStr))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const eventDateColors = useMemo(() => {
    const map = new Map<string, string[]>();
    events.forEach((e) => {
      const key = e.startDate.split('T')[0];
      const arr = map.get(key) || [];
      const c = getUserColor(e.createdBy);
      if (!arr.includes(c)) arr.push(c);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Calendar</Text>
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}
            activeOpacity={0.7}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={styles.navArrow}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={styles.navArrow}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar grid card */}
        <View style={styles.calCard}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={styles.weekCell}>
                <Text style={styles.weekText}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={styles.grid}>
            {calendarDays.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={styles.dayCell} />;
              const ds = format(day, 'yyyy-MM-dd');
              const isSel = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const dc = eventDateColors.get(ds);
              return (
                <TouchableOpacity
                  key={ds}
                  style={styles.dayCell}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.7}
                >
                  {isSel ? (
                    <View style={styles.selectedDayCircle}>
                      <Text style={styles.selectedText}>{format(day, 'd')}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.dayText, isToday && styles.todayText]}>
                      {format(day, 'd')}
                    </Text>
                  )}
                  {dc && (
                    <View style={styles.dotsRow}>
                      {dc.slice(0, 3).map((c, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            { backgroundColor: isSel ? 'rgba(255,255,255,0.8)' : c },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Day events section */}
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
          </Text>
          <View style={styles.dayCountBadge}>
            <Text style={styles.dayCount}>
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </Text>
          </View>
        </View>

        {dayEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={24} color={colors.textTertiary} />
            <Text style={styles.noEventsText}>No events scheduled</Text>
          </View>
        ) : (
          dayEvents.map((event) => {
            const eventColor = event.color || colors.primary;
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.eventRow}
                onPress={() => router.push(`/event/${event.id}`)}
                activeOpacity={0.6}
              >
                <View style={[styles.eventAccent, { backgroundColor: eventColor }]} />
                <View style={styles.eventContent}>
                  <View style={styles.eventTop}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    {event.recurring && (
                      <Ionicons name="repeat-outline" size={13} color={colors.textTertiary} />
                    )}
                    {event.shared && (
                      <Ionicons name="people-outline" size={13} color={colors.textTertiary} />
                    )}
                  </View>
                  <Text style={styles.eventTime}>
                    {event.allDay
                      ? 'All day'
                      : `${format(parseISO(event.startDate), 'h:mm a')} \u2014 ${format(parseISO(event.endDate), 'h:mm a')}`}
                  </Text>
                  {event.location && (
                    <View style={styles.eventLoc}>
                      <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                      <Text style={styles.eventLocText}>{event.location}</Text>
                    </View>
                  )}
                </View>
                <Avatar
                  name={getUserName(event.createdBy)}
                  size={26}
                  color={getUserColor(event.createdBy)}
                />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-event')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  screenTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },
  todayBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  todayBtnText: {
    ...typography.subhead,
    color: colors.primary,
  },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  monthTitle: {
    ...typography.title3,
    color: colors.text,
  },

  // Calendar card
  calCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    ...typography.callout,
    color: colors.text,
  },
  todayText: {
    color: colors.primary,
    fontWeight: '700',
  },
  selectedText: {
    ...typography.callout,
    color: colors.textInverse,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    bottom: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // Day events header
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dayTitle: {
    ...typography.headline,
    color: colors.text,
  },
  dayCountBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  dayCount: {
    ...typography.caption1,
    color: colors.primary,
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  noEventsText: {
    ...typography.callout,
    color: colors.textTertiary,
  },

  // Event cards
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  eventAccent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  eventContent: {
    flex: 1,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventTitle: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
  },
  eventTime: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eventLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  eventLocText: {
    ...typography.caption2,
    color: colors.textTertiary,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    zIndex: 100,
  },
});
