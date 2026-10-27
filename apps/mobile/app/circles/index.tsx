import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCircleStore, Circle } from '../../src/stores/circleStore';
import { useInviteStore } from '../../src/stores/inviteStore';
import { useAlert } from '../../src/components/AlertProvider';

export default function CirclesScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { circles, isLoading, fetchCircles, deleteCircle } = useCircleStore();
  const { incoming, fetchIncoming } = useInviteStore();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  useFocusEffect(useCallback(() => {
    fetchCircles();
    fetchIncoming();
  }, [fetchCircles, fetchIncoming]));

  const handleDelete = (circle: Circle) => {
    if (circle.type === 'PRIMARY') {
      showAlert('Cannot Delete', 'Your primary circle cannot be deleted.');
      return;
    }
    showAlert(
      'Delete Circle',
      `Are you sure you want to delete "${circle.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCircle(circle.id) },
      ],
    );
  };

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Circles</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/circles/create' as any)}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView keyboardDismissMode="on-drag" style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Pending invites */}
        {incoming.length > 0 && (
          <View style={styles.inviteSection}>
            <Text style={styles.inviteSectionTitle}>Pending Invites</Text>
            {incoming.map((inv) => {
              const token = inv.token || inv.inviteLink?.split('/').pop();
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={styles.inviteCard}
                  onPress={() => token && router.push(`/join/${token}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.inviteCircleIcon, { backgroundColor: inv.circle?.color || colors.primary }]}>
                    <Text style={styles.circleEmoji}>{inv.circle?.emoji || inv.circle?.name?.charAt(0) || '?'}</Text>
                  </View>
                  <View style={styles.inviteCardContent}>
                    <Text style={styles.inviteCardName}>{inv.circle?.name || 'Unknown circle'}</Text>
                    <Text style={styles.inviteCardRole}>Invited as {inv.role?.toLowerCase()}</Text>
                  </View>
                  <View style={styles.inviteBadge}>
                    <Ionicons name="mail-outline" size={14} color={colors.primary} />
                    <Text style={styles.inviteBadgeText}>Pending</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Explanation */}
        <Text style={styles.subtitle}>
          Circles are groups of people you share with — like family, close friends, or housemates.
        </Text>

        {circles.map((circle) => (
          <TouchableOpacity
            key={circle.id}
            style={styles.card}
            onPress={() => router.push(`/circles/${circle.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.circleIcon, { backgroundColor: circle.color || colors.primary }]}>
              <Text style={styles.circleEmoji}>
                {circle.emoji || circle.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.circleName}>{circle.name}</Text>
              <Text style={styles.circleType}>
                {circle.type === 'PRIMARY' ? 'Primary' : circle.type.charAt(0) + circle.type.slice(1).toLowerCase()}
                {circle.memberCount ? ` \u00B7 ${circle.memberCount} members` : ''}
              </Text>
            </View>
            {circle.type !== 'PRIMARY' && (
              <TouchableOpacity
                onPress={() => handleDelete(circle)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {circles.length === 0 && !isLoading && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyText}>No circles yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first circle to start sharing tasks, events, and lists with the people that matter most.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/circles/create' as any)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Create circle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, marginLeft: spacing.sm },
  addBtn: { padding: 4 },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  circleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmoji: { fontSize: 20, color: '#FFFFFF' },
  cardContent: { flex: 1, marginLeft: spacing.md },
  circleName: { fontSize: 16, fontWeight: '600', color: colors.text },
  circleType: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  empty: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  inviteSection: { gap: 8, marginBottom: spacing.sm },
  inviteSectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: spacing.xs },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  inviteCircleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCardContent: { flex: 1, marginLeft: spacing.md },
  inviteCardName: { fontSize: 15, fontWeight: '600', color: colors.text },
  inviteCardRole: { fontSize: 13, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  inviteBadgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
});
