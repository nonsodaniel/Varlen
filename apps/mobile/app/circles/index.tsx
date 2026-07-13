import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCircleStore, Circle } from '../../src/stores/circleStore';
import { useAlert } from '../../src/components/AlertProvider';

export default function CirclesScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { circles, isLoading, fetchCircles, deleteCircle } = useCircleStore();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  useEffect(() => {
    fetchCircles();
  }, []);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
                <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
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
    </SafeAreaView>
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
});
