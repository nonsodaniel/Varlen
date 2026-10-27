import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert, InteractionManager, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  format, isSameDay, parseISO, isValid, startOfWeek, addDays, addWeeks, subWeeks,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths,
  isAfter, isBefore, addDays as addD,
} from 'date-fns';
import { typography, spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useModeStore } from '../../src/stores/modeStore';
import type { CalendarEvent, LifeMode } from '../../src/types';

const EVENT_ALL_MODES: { mode: LifeMode; label: string; emoji: string }[] = [
  { mode: 'personal', label: 'Personal', emoji: '🙋' },
  { mode: 'couple', label: 'Couple', emoji: '💑' },
  { mode: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { mode: 'parenting', label: 'Parenting', emoji: '🍼' },
];

function safeFormat(dateStr: string, fmt: string, fallback = ''): string {
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}
import { Avatar } from '../../src/components/ui/Avatar';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { getUserColor, getUserName } from '../../src/utils/userHelpers';

function EventModeShareModal({
  event,
  onClose,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const updateEvent = useCalendarStore((s) => s.updateEvent);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);
  const mode = useModeStore((s) => s.mode);
  const [selected, setSelected] = useState<LifeMode[]>([]);

  // Initialise selection when event changes
  React.useEffect(() => {
    if (event) {
      setSelected(event.visibleModes ?? []);
    }
  }, [event?.id]);

  if (!event) return null;

  const toggle = (m: LifeMode) => {
    if (m === event.mode || m === mode) return; // can't remove home mode
    setSelected((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  const handleApply = () => {
    updateEvent(event.id, { visibleModes: selected });
    onClose();
  };

  const handleDelete = () => {
    onClose();
    setTimeout(() => deleteEvent(event.id), 300);
  };

  return (
    <Modal visible={!!event} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
      <View style={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        ...shadows.lg,
      }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ ...typography.headline, color: colors.text, marginBottom: 4 }}>Share Event</Text>
        <Text style={{ ...typography.caption1, color: colors.textSecondary, marginBottom: 20 }} numberOfLines={1}>
          {event.title}
        </Text>
        {EVENT_ALL_MODES.map(({ mode: m, label, emoji }) => {
          const isHome = m === (event.mode ?? mode);
          const isOn = isHome || selected.includes(m);
          return (
            <TouchableOpacity
              key={m}
              onPress={() => toggle(m)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight,
                opacity: isHome ? 0.5 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
                <Text style={{ ...typography.body, color: colors.text }}>{label}{isHome ? ' (home)' : ''}</Text>
              </View>
              <View style={{
                width: 22, height: 22, borderRadius: 11, borderWidth: 2,
                borderColor: isOn ? colors.primary : colors.border,
                backgroundColor: isOn ? colors.primary : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {isOn && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={handleApply}
          style={{
            marginTop: 20, backgroundColor: colors.primary,
            borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
          }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.callout, color: '#fff', fontWeight: '700' }}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          style={{ marginTop: 12, alignItems: 'center', paddingVertical: 10 }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.callout, color: colors.error }}>Delete Event</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={{ marginTop: 4, alignItems: 'center', paddingVertical: 10 }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.callout, color: colors.textSecondary }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const allEvents = useCalendarStore((s) => s.events);
  const fetchEvents = useCalendarStore((s) => s.fetchEvents);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);
  const mode = useModeStore((s) => s.mode);
  const scrollRef = useRef<any>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [mode]);
  const [shareEvent, setShareEvent] = useState<CalendarEvent | null>(null);

  // Mode-filtered events
  const events = useMemo(() => allEvents.filter((e) => {
    if (!e.mode && !e.visibleModes?.length) return true;
    if (e.visibleModes?.includes(mode as LifeMode)) return true;
    return e.mode === mode;
  }), [allEvents, mode]);

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => { fetchEvents(); });
    return () => task.cancel();
  }, [fetchEvents]));
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerDate, setMonthPickerDate] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Generate 7 days for the week strip
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Events for selected day
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEvents = events
    .filter((e) => e.startDate.startsWith(selectedDateStr))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Check which days have events (for dots) and map day -> event colors
  const eventDays = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.startDate.split('T')[0]));
    return set;
  }, [events]);

  const eventDayColors = useMemo(() => {
    const map = new Map<string, string[]>();
    events.forEach((e) => {
      const key = e.startDate.split('T')[0];
      if (!map.has(key)) map.set(key, []);
      const existing = map.get(key)!;
      const c = e.color || colors.primary;
      if (!existing.includes(c)) existing.push(c);
    });
    return map;
  }, [events, colors]);

  const handleDeleteEvent = (id: string, title: string) => {
    Alert.alert(
      'Delete Event',
      `"${title}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteEvent(id).catch(() => {}),
        },
      ]
    );
  };

  const handleShareEvent = (event: CalendarEvent) => {
    setShareEvent(event);
  };

  const goToPrevWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const goToToday = () => {
    setSelectedDate(new Date());
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleMonthDayPick = (day: Date) => {
    setSelectedDate(day);
    setWeekStart(startOfWeek(day, { weekStartsOn: 1 }));
    setShowMonthPicker(false);
  };

  // Month picker grid
  const monthStart = startOfMonth(monthPickerDate);
  const monthEnd = endOfMonth(monthPickerDate);
  const monthDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const padded: (Date | null)[] = Array(getDay(monthStart)).fill(null);
    return [...padded, ...days];
  }, [monthPickerDate]);

  return (
    <View style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.screenTitle}>Calendar</Text>
              <Text style={styles.screenSubtitle}>Your schedule at a glance</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.todayBtn} onPress={goToToday} activeOpacity={0.7}>
            <Ionicons name="today-outline" size={16} color={colors.primary} />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Week Strip Date Picker */}
        <View style={styles.weekStripCard}>
          {/* Week nav */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={goToPrevWeek} style={styles.weekNavBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setMonthPickerDate(selectedDate); setShowMonthPicker(!showMonthPicker); }}
              activeOpacity={0.7}
              style={styles.monthToggle}
            >
              <Text style={styles.weekNavTitle}>{format(weekStart, 'MMMM yyyy')}</Text>
              <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day pills */}
          <View style={styles.dayRow}>
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const hasEvent = eventDays.has(format(day, 'yyyy-MM-dd'));
              return (
                <TouchableOpacity
                  key={format(day, 'yyyy-MM-dd')}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillSelected,
                    isToday && !isSelected && styles.dayPillToday,
                  ]}
                  onPress={() => setSelectedDate(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                    {format(day, 'EEE')}
                  </Text>
                  <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected, isToday && !isSelected && styles.dayNumberToday]}>
                    {format(day, 'd')}
                  </Text>
                  {hasEvent && (
                    <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Expandable Month Picker */}
        {showMonthPicker && (
          <View style={styles.monthPickerCard}>
            <View style={styles.monthPickerNav}>
              <TouchableOpacity onPress={() => setMonthPickerDate(subMonths(monthPickerDate, 1))} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowYearPicker(!showYearPicker)} activeOpacity={0.7} style={styles.monthYearToggle}>
                <Text style={styles.monthPickerTitle}>{format(monthPickerDate, 'MMMM yyyy')}</Text>
                <Ionicons name={showYearPicker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMonthPickerDate(addMonths(monthPickerDate, 1))} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Year Picker */}
            {showYearPicker && (
              <View style={styles.yearPickerWrap}>
                <ScrollView keyboardDismissMode="on-drag" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearPickerRow}>
                  {Array.from({ length: 11 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    const isSelected = monthPickerDate.getFullYear() === year;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.yearChip, isSelected && styles.yearChipSelected]}
                        onPress={() => {
                          const updated = new Date(monthPickerDate);
                          updated.setFullYear(year);
                          setMonthPickerDate(updated);
                          setShowYearPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.yearChipText, isSelected && styles.yearChipTextSelected]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <View style={styles.monthWeekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <View key={i} style={styles.monthWeekCell}>
                  <Text style={styles.monthWeekText}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={styles.monthGrid}>
              {monthDays.map((day, idx) => {
                if (!day) return <View key={`e-${idx}`} style={styles.monthDayCell} />;
                const isSel = isSameDay(day, selectedDate);
                const isTdy = isSameDay(day, new Date());
                const hasEvt = eventDays.has(format(day, 'yyyy-MM-dd'));
                return (
                  <TouchableOpacity
                    key={format(day, 'yyyy-MM-dd')}
                    style={styles.monthDayCell}
                    onPress={() => handleMonthDayPick(day)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.monthDayInner,
                      isSel && styles.monthDaySelected,
                      isTdy && !isSel && styles.monthDayToday,
                    ]}>
                      <Text style={[
                        styles.monthDayText,
                        isSel && styles.monthDayTextSelected,
                        isTdy && !isSel && styles.monthDayTextToday,
                      ]}>
                        {format(day, 'd')}
                      </Text>
                    </View>
                    {hasEvt && (
                      <View style={styles.monthDotRow}>
                        {(eventDayColors.get(format(day, 'yyyy-MM-dd')) ?? [colors.primary]).slice(0, 3).map((c, i) => (
                          <View key={i} style={[styles.monthEventDot, { backgroundColor: isSel ? '#FFFFFF' : c }]} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Selected Day Events */}
        <View style={styles.eventsSection}>
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
              <Ionicons name="calendar-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.noEventsText}>No events on this day</Text>
              <Text style={styles.noEventsHint}>Tap + below to add one</Text>
            </View>
          ) : (
            dayEvents.map((event) => {
              const eventColor = event.color || colors.primary;
              return (
                <View key={event.id} style={styles.eventRow}>
                  <TouchableOpacity
                    style={styles.eventRowMain}
                    onPress={() => router.push(`/event/${event.id}`)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.eventAccent, { backgroundColor: eventColor }]} />
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.eventTime}>
                        {event.allDay
                          ? 'All day'
                          : `${safeFormat(event.startDate, 'h:mm a')} \u2014 ${safeFormat(event.endDate, 'h:mm a')}`}
                      </Text>
                      {event.location && (
                        <View style={styles.eventLoc}>
                          <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                          <Text style={styles.eventLocText}>{event.location}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.eventRight}>
                      {event.recurring && (
                        <Ionicons name="repeat-outline" size={13} color={colors.textTertiary} />
                      )}
                      <Avatar
                        name={getUserName(event.createdBy)}
                        size={26}
                        color={getUserColor(event.createdBy)}
                      />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareEvent(event)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eventActionBtn}
                  >
                    <Ionicons name="arrow-redo-outline" size={15} color={colors.textTertiary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteEvent(event.id, event.title)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eventDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.error} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Upcoming Events (next 7 days) */}
        <UpcomingEvents events={events} selectedDate={selectedDate} router={router} onDelete={handleDeleteEvent} onShare={handleShareEvent} />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-event')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <EventModeShareModal event={shareEvent} onClose={() => setShareEvent(null)} />
    </View>
  );
}

function UpcomingEvents({
  events,
  selectedDate,
  router,
  onDelete,
  onShare,
}: {
  events: any[];
  selectedDate: Date;
  router: ReturnType<typeof useRouter>;
  onDelete: (id: string, title: string) => void;
  onShare: (event: CalendarEvent) => void;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const upcoming = useMemo(() => {
    const tomorrow = addD(new Date(), 1);
    const nextWeek = addD(new Date(), 7);
    return events
      .filter((e) => {
        const d = parseISO(e.startDate);
        return isAfter(d, tomorrow) && isBefore(d, nextWeek);
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 5);
  }, [events]);

  if (upcoming.length === 0) return null;

  return (
    <View style={styles.upcomingSection}>
      <Text style={styles.upcomingTitle}>Coming Up</Text>
      {upcoming.map((event) => {
        const eventColor = event.color || colors.primary;
        return (
          <View key={event.id} style={styles.upcomingRow}>
            <TouchableOpacity
              style={styles.upcomingRowMain}
              onPress={() => router.push(`/event/${event.id}`)}
              activeOpacity={0.6}
            >
              <View style={[styles.upcomingDot, { backgroundColor: eventColor }]} />
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingName} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={styles.upcomingDate}>
                  {safeFormat(event.startDate, 'EEE, MMM d')}
                  {event.allDay
                    ? ' · All day'
                    : ` · ${safeFormat(event.startDate, 'h:mm a')}`}
                </Text>
              </View>
              {event.recurring && (
                <Ionicons name="repeat-outline" size={14} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onShare(event)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.upcomingDeleteBtn}
            >
              <Ionicons name="arrow-redo-outline" size={15} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(event.id, event.title)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.upcomingDeleteBtn}
            >
              <Ionicons name="trash-outline" size={15} color={colors.error} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  screenTitle: { ...typography.largeTitle, color: colors.text },
  screenSubtitle: { ...typography.caption1, color: colors.textSecondary, marginTop: 2 },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  todayBtnText: { ...typography.subhead, color: colors.primary, fontWeight: '600' },

  // Week strip
  weekStripCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekNavBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  monthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekNavTitle: { ...typography.headline, color: colors.text },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: 4,
  },
  dayPillSelected: {
    backgroundColor: colors.primary,
  },
  dayPillToday: {
    backgroundColor: colors.primaryLight,
  },
  dayName: { ...typography.caption2, color: colors.textTertiary },
  dayNameSelected: { color: 'rgba(255,255,255,0.7)' },
  dayNumber: { ...typography.headline, color: colors.text, fontSize: 16 },
  dayNumberSelected: { color: '#FFFFFF' },
  dayNumberToday: { color: colors.primary },
  eventDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.primary,
  },
  eventDotSelected: { backgroundColor: 'rgba(255,255,255,0.8)' },

  // Month picker
  monthPickerCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  monthPickerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthPickerTitle: { ...typography.headline, color: colors.text },
  monthYearToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  yearPickerWrap: {
    marginBottom: spacing.md,
  },
  yearPickerRow: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  yearChipSelected: {
    backgroundColor: colors.primary,
  },
  yearChipText: {
    ...typography.subhead,
    color: colors.text,
    fontWeight: '600',
  },
  yearChipTextSelected: {
    color: '#FFFFFF',
  },
  monthWeekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  monthWeekCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  monthWeekText: { ...typography.caption2, color: colors.textTertiary },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthDayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  monthDayInner: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  monthDaySelected: { backgroundColor: colors.primary },
  monthDayToday: { backgroundColor: colors.primaryLight },
  monthDayText: { ...typography.callout, color: colors.text },
  monthDayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  monthDayTextToday: { color: colors.primary, fontWeight: '700' },
  monthDotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  monthEventDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Events section
  eventsSection: {
    paddingHorizontal: spacing.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dayTitle: { ...typography.headline, color: colors.text },
  dayCountBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  dayCount: { ...typography.caption1, color: colors.primary },

  // Empty
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  noEventsText: { ...typography.callout, color: colors.textTertiary },
  noEventsHint: { ...typography.caption1, color: colors.textTertiary },

  // Event cards
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  eventRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingRight: spacing.sm,
  },
  eventActionBtn: {
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDeleteBtn: {
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventAccent: {
    width: 4, height: '80%', borderRadius: 2, marginRight: spacing.md,
  },
  eventContent: { flex: 1 },
  eventTitle: { ...typography.headline, color: colors.text },
  eventTime: { ...typography.caption1, color: colors.textSecondary, marginTop: 3 },
  eventLoc: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  eventLocText: { ...typography.caption2, color: colors.textTertiary },
  eventRight: { alignItems: 'center', gap: 6 },

  // Upcoming
  upcomingSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  upcomingTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.md,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    overflow: 'hidden',
  },
  upcomingRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  upcomingDeleteBtn: {
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.borderLight,
  },
  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  upcomingInfo: { flex: 1 },
  upcomingName: { ...typography.body, color: colors.text, fontWeight: '600' },
  upcomingDate: { ...typography.caption1, color: colors.textSecondary, marginTop: 1 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 174,
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
