import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { typography, spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Button } from '../../src/components/ui/Button';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { getUserName } from '../../src/utils/userHelpers';
import { useAlert } from '../../src/components/AlertProvider';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { events, deleteEvent, updateEvent } = useCalendarStore();
  const { showAlert } = useAlert();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.notFound}>Event not found</Text>
          <Button title="Go back" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  const eventColor = event.color || colors.primary;

  const handleDelete = () => {
    showAlert('Delete event', `Remove "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteEvent(event.id); router.back(); } catch { showAlert('Error', 'Could not delete event.'); } }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push({ pathname: '/add-event', params: { eventId: event.id } })} style={styles.editBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color={colors.textInverse} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={styles.heroCard}>
          <View style={[styles.heroAccent, { backgroundColor: eventColor }]} />
          <View style={styles.heroContent}>
            <Text style={styles.title}>{event.title}</Text>
            {event.shared && (
              <View style={styles.sharedPill}>
                <Ionicons name="people" size={12} color={colors.primary} />
                <Text style={styles.sharedPillText}>Shared event</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details card */}
        <View style={styles.detailsCard}>
          <DetailRow
            icon="calendar-outline"
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            label="Date"
            value={format(parseISO(event.startDate), 'EEEE, MMMM d, yyyy')}
          />
          <DetailRow
            icon="time-outline"
            iconColor={colors.warning}
            iconBg={colors.warningLight}
            label="Time"
            value={
              event.allDay
                ? 'All day'
                : `${format(parseISO(event.startDate), 'h:mm a')} — ${format(parseISO(event.endDate), 'h:mm a')}`
            }
          />
          {event.location && (
            <DetailRow
              icon="location-outline"
              iconColor={colors.error}
              iconBg={colors.errorLight}
              label="Location"
              value={event.location}
            />
          )}
          <DetailRow
            icon="person-outline"
            iconColor="#8B5CF6"
            iconBg={colors.purpleLight}
            label="Created by"
            value={getUserName(event.createdBy)}
            last
          />
        </View>

        {/* Notes card */}
        {event.description && (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.desc}>{event.description}</Text>
            </View>
          </>
        )}

        {/* Share button */}
        <TouchableOpacity
          style={styles.shareBtn}
          activeOpacity={0.7}
          onPress={() => {
            updateEvent(event.id, { shared: !event.shared });
            showAlert(
              event.shared ? 'Unshared' : 'Shared',
              event.shared ? 'Event is now private' : 'Event shared with your household!',
            );
          }}
        >
          <Ionicons name="share-outline" size={18} color={colors.primary} />
          <Text style={styles.shareBtnText}>Share with household</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, iconColor, iconBg, label, value, last = false }: {
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string;
  label: string; value: string; last?: boolean;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <View style={[styles.detailRow, !last && styles.detailBorder]}>
      <View style={[styles.detailIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    ...typography.title3,
    color: colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  heroAccent: {
    width: 5,
  },
  heroContent: {
    flex: 1,
    padding: spacing.xl,
  },
  title: {
    ...typography.title1,
    color: colors.text,
  },
  sharedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    marginTop: spacing.sm,
  },
  sharedPillText: {
    ...typography.caption1,
    color: colors.primary,
    fontWeight: '600',
  },

  // Details card
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  detailBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    fontWeight: '400',
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    marginTop: 1,
  },

  // Notes
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  desc: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // Share button
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: spacing.sm,
  },
  shareBtnText: {
    ...typography.headline,
    color: colors.primary,
  },
});
