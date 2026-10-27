import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useMemoryStore } from '../src/stores/memoryStore';
import { useModeStore } from '../src/stores/modeStore';
import { useHouseholdStore } from '../src/stores/householdStore';
import { useAuthStore } from '../src/stores/authStore';
import type { LifeMode } from '../src/types';

const TIMELINE_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#6366F1'];

const memoryFallbackImage = require('../assets/images/memory-fallback-mountain.jpg');

const memoryTypeAccent: Record<string, { label: string; color: string; bg: string }> = {
  milestone: { label: 'Milestone', color: '#8B5CF6', bg: '#EDE9FE' },
  note:      { label: 'Memory',    color: '#10B981', bg: '#D1FAE5' },
  photo:     { label: 'Photo',     color: '#3B82F6', bg: '#DBEAFE' },
  document:  { label: 'Document',  color: '#F59E0B', bg: '#FEF3C7' },
};

const ALL_MODES = [
  { mode: 'personal', label: 'Personal', icon: 'person-outline' },
  { mode: 'couple', label: 'Couple', icon: 'heart-outline' },
  { mode: 'family', label: 'Family', icon: 'people-outline' },
  { mode: 'parenting', label: 'Parenting', icon: 'happy-outline' },
];

function MemoryCard({ memory, dotColor, isLast, onShare, readOnly }: {
  memory: any;
  dotColor: string;
  isLast: boolean;
  onShare: () => void;
  readOnly?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const accent = memoryTypeAccent[memory.type] ?? memoryTypeAccent.note;
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const userUri = memory.imageUrl || memory._localImageUri;
  const showUserImage = !!userUri && userUri !== failedUri;
  const allImages: string[] = memory.imageUrls?.length > 0 ? memory.imageUrls : (userUri ? [userUri] : []);
  const d = new Date(memory.date);
  const day = format(d, 'd');
  const month = format(d, 'MMM').toUpperCase();

  return (
    <View style={styles.row}>
      {/* Date column */}
      <View style={styles.dateCol}>
        <Text style={[styles.dayNum, { color: dotColor }]}>{day}</Text>
        <Text style={styles.monthText}>{month}</Text>
      </View>

      {/* Timeline line + dot */}
      <View style={styles.lineCol}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={[styles.connector, { backgroundColor: dotColor + '40' }]} />}
      </View>

      {/* Card */}
      <View style={[styles.card, { borderColor: dotColor + '33', borderWidth: 2, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        {/* Image */}
        <View style={[styles.imageWrap, { backgroundColor: accent.bg }]}>
          {showUserImage ? (
            <Image source={{ uri: userUri }} style={styles.image} resizeMode="cover" onError={() => setFailedUri(userUri)} />
          ) : (
            <Image source={memoryFallbackImage} style={styles.image} resizeMode="cover" />
          )}
          {allImages.length > 1 && (
            <View style={styles.imageBadge}>
              <Ionicons name="images-outline" size={10} color="#FFF" />
              <Text style={styles.imageBadgeText}>{allImages.length}</Text>
            </View>
          )}
        </View>

        {/* Text + share button */}
        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: dotColor }]} numberOfLines={2}>{memory.title}</Text>
            {memory.description ? (
              <Text style={[styles.cardDesc, { color: isDark ? 'rgba(255,255,255,0.6)' : '#6B7280' }]} numberOfLines={3}>{memory.description}</Text>
            ) : null}
            <Text style={[styles.cardType, { color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }]}>{accent.label}</Text>
          </View>
          {!readOnly && (
            <TouchableOpacity onPress={onShare} style={styles.shareBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function MemoryShareModal({ visible, memory, currentMode, onApply, onDelete, onClose }: {
  visible: boolean; memory: any; currentMode: string;
  onApply: (visibleModes: LifeMode[] | undefined) => void;
  onDelete: () => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const initSelected = useMemo(() => {
    const base = new Set<string>([memory?.mode ?? currentMode]);
    (memory?.visibleModes ?? []).forEach((m: string) => base.add(m));
    return base;
  }, [memory, currentMode]);
  const [selected, setSelected] = useState<Set<string>>(initSelected);

  React.useEffect(() => {
    if (visible) setSelected(initSelected);
  }, [visible, initSelected]);

  const toggle = (m: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size <= 1) return prev;
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  const handleApply = () => {
    const modes = Array.from(selected);
    onApply(modes.length >= ALL_MODES.length ? undefined : modes as LifeMode[]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
      <View style={{
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 20,
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
      }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700', marginBottom: 4 }}>Share to Modes</Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 20 }}>Select which modes can see this memory</Text>
        {ALL_MODES.map(({ mode: m, label, icon }) => {
          const isChecked = selected.has(m);
          return (
            <TouchableOpacity
              key={m}
              onPress={() => toggle(m)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}
              activeOpacity={0.7}
            >
              <Ionicons name={icon as any} size={22} color={isChecked ? '#6C63FF' : 'rgba(255,255,255,0.5)'} style={{ width: 32 }} />
              <Text style={{ flex: 1, color: '#FFF', fontSize: 16 }}>{label}</Text>
              <Ionicons name={isChecked ? 'checkbox' : 'square-outline'} size={24} color={isChecked ? '#6C63FF' : 'rgba(255,255,255,0.35)'} />
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={handleApply}
          style={{ backgroundColor: '#6C63FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { onClose(); onDelete(); }}
          style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FF453A', fontSize: 15, fontWeight: '600' }}>Delete Memory</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={{ paddingVertical: 12, alignItems: 'center' }}
          activeOpacity={0.8}
        >
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function MemoryLaneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const memories = useMemoryStore((s) => s.memories);
  const fetchMemories = useMemoryStore((s) => s.fetchMemories);
  const updateMemory = useMemoryStore((s) => s.updateMemory);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const isLoading = useMemoryStore((s) => s.isLoading);
  const mode = useModeStore((s) => s.mode);
  const members = useHouseholdStore((s) => s.members);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [shareModalMemory, setShareModalMemory] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // In couple mode, the user needs at least one other member to interact with partner features
  const hasPartner = useMemo(
    () => members.filter((m) => m.id !== currentUserId).length > 0,
    [members, currentUserId],
  );
  // Couple mode without a partner = preview only
  const isCoupleModeNoPartner = mode === 'couple' && !hasPartner;

  // When partner is removed, refetch so the store reflects the updated household.
  // Track previous hasPartner to detect the transition from having → not having a partner.
  const prevHasPartnerRef = useRef(hasPartner);
  useEffect(() => {
    if (prevHasPartnerRef.current && !hasPartner && mode === 'couple') {
      fetchMemories();
    }
    prevHasPartnerRef.current = hasPartner;
  }, [hasPartner, mode, fetchMemories]);

  // Strict mode isolation: only show memories owned by this mode or explicitly shared to it.
  // Memories are tagged with their owning mode during fetchMemories (including partner's memories).
  // When in couple mode with no partner, further restrict to memories created by the current
  // user — so an ex-partner's memories don't linger after they leave.
  const modeMemories = useMemo(
    () => [...memories]
      .filter((m) => {
        if (m.visibleModes?.includes(mode)) return true;
        if (m.mode !== mode) return false;
        if (isCoupleModeNoPartner && m.createdBy !== currentUserId) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
    [memories, mode, isCoupleModeNoPartner, currentUserId],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMemories();
    setRefreshing(false);
  }, [fetchMemories]);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/people')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Memory Lane</Text>
          {modeMemories.length > 0 && (
            <Text style={[styles.headerCount, { color: colors.textSecondary }]}>{modeMemories.length} memories</Text>
          )}
        </View>
        {isCoupleModeNoPartner ? (
          <TouchableOpacity
            onPress={() => router.push('/invite' as any)}
            style={[styles.addBtn, styles.invitePillBtn]}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={14} color={colors.primary} />
            <Text style={[styles.invitePillText, { color: colors.primary }]}>Invite</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/add-memory')}
            style={styles.addBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView keyboardDismissMode="on-drag"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* No-partner banner in couple mode */}
        {isCoupleModeNoPartner && (
          <View style={[styles.noPartnerBanner, { backgroundColor: colors.primaryLight, borderColor: colors.borderLight }]}>
            <Ionicons name="heart-outline" size={16} color={colors.primary} />
            <Text style={[styles.noPartnerBannerText, { color: colors.primary }]}>
              Invite your partner to add and share memories together
            </Text>
            <TouchableOpacity onPress={() => router.push('/invite' as any)} activeOpacity={0.7}>
              <Text style={[styles.noPartnerBannerLink, { color: colors.primary }]}>Invite →</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && modeMemories.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : modeMemories.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="star-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No memories yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {isCoupleModeNoPartner
                ? 'Invite your partner to start building your shared memory lane'
                : 'Capture moments, milestones, and everyday magic'}
            </Text>
            {!isCoupleModeNoPartner && (
              <TouchableOpacity
                style={[styles.addMemoryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={() => router.push('/add-memory')}
              >
                <Ionicons name="add" size={16} color="#FFF" />
                <Text style={styles.addMemoryBtnText}>Add memory</Text>
              </TouchableOpacity>
            )}
            {isCoupleModeNoPartner && (
              <TouchableOpacity
                style={[styles.addMemoryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={() => router.push('/invite' as any)}
              >
                <Ionicons name="person-add-outline" size={16} color="#FFF" />
                <Text style={styles.addMemoryBtnText}>Invite partner</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.timeline}>
            {modeMemories.map((memory, idx) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                dotColor={TIMELINE_COLORS[idx % TIMELINE_COLORS.length]}
                isLast={idx === modeMemories.length - 1}
                onShare={() => setShareModalMemory(memory)}
                readOnly={isCoupleModeNoPartner}
              />
            ))}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {!isCoupleModeNoPartner && (
        <MemoryShareModal
          visible={!!shareModalMemory}
          memory={shareModalMemory}
          currentMode={mode}
          onApply={async (visibleModes) => {
            if (!shareModalMemory) return;
            try {
              await updateMemory(shareModalMemory.id, { visibleModes });
            } catch {
              Alert.alert('Error', 'Failed to update sharing settings. Please try again.');
            }
          }}
          onDelete={async () => {
            if (!shareModalMemory) return;
            try {
              await deleteMemory(shareModalMemory.id);
              setShareModalMemory(null);
            } catch {
              Alert.alert('Error', 'Failed to delete memory. Please try again.');
            }
          }}
          onClose={() => setShareModalMemory(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headline,
  },
  headerCount: {
    ...typography.caption2,
    marginTop: 1,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  timeline: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateCol: {
    width: 36,
    alignItems: 'center',
    paddingTop: 6,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  monthText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  lineCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 4,
    borderRadius: 1,
    minHeight: 20,
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  imageWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  imageBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 18,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  cardType: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  shareBtn: {
    padding: 4,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.title3,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  addMemoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  addMemoryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Invite pill button in header (couple mode no partner)
  invitePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    width: 'auto' as any,
  },
  invitePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // No-partner banner
  noPartnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  noPartnerBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  noPartnerBannerLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});
