import React, { useMemo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  Modal,
  StatusBar,
  Platform,
  InteractionManager,
  FlatList,
  ScrollView,
} from 'react-native';
import ReAnimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  format,
  parseISO,
  isValid,
  subDays,
  differenceInYears,
  differenceInDays,
  differenceInMonths,
} from 'date-fns';
import {
  typography,
  spacing,
  radius,
  heroTypography,
  modeThemes,
} from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Avatar } from '../../src/components/ui/Avatar';
import { getUserName, getUserColor } from '../../src/utils/userHelpers';
import { useAuthStore } from '../../src/stores/authStore';
import { useHouseholdStore } from '../../src/stores/householdStore';
import { useMemoryStore } from '../../src/stores/memoryStore';
import { useTimelineStore } from '../../src/stores/timelineStore';
import { usePollStore } from '../../src/stores/pollStore';
import { useModeStore } from '../../src/stores/modeStore';
import { useModeHouseholdStore } from '../../src/stores/modeHouseholdStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { useExpenseStore } from '../../src/stores/expenseStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useActivityStore } from '../../src/stores/activityStore';
import { adaptTintColor } from '../../src/utils/tintColors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEMORY_CARD_WIDTH = 200;
const DATE_IDEA_CARD_WIDTH = 160;

// Soft tint palette for memory cards -- warm and varied
const memoryTints = [
  '#FDF5F0', // peach cream
  '#F0FAF4', // mint cream
  '#FCF0F5', // rose cream
  '#FFF9EB', // golden cream
  '#F5F0FA', // lavender cream
  '#EFF5FB', // sky cream
  '#FEF5ED', // apricot cream
];

// Memory type labels + accent colors for timeline
const memoryFallbackImage = require('../../assets/images/memory-fallback-mountain.jpg');

const TIMELINE_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#6366F1'];

const memoryTypeAccent: Record<string, { label: string; color: string; bg: string; fallbackImage: any }> = {
  milestone: { label: 'Milestone', color: '#8B5CF6', bg: '#EDE9FE', fallbackImage: memoryFallbackImage },
  note:      { label: 'Memory',    color: '#10B981', bg: '#D1FAE5', fallbackImage: memoryFallbackImage },
  photo:     { label: 'Photo',     color: '#3B82F6', bg: '#DBEAFE', fallbackImage: memoryFallbackImage },
  document:  { label: 'Document',  color: '#F59E0B', bg: '#FEF3C7', fallbackImage: memoryFallbackImage },
};

// Accent strip colors for date idea cards by category
const dateIdeaCategoryAccent: Record<string, string> = {
  romantic: '#EC4899',
  adventure: '#10B981',
  creative: '#F59E0B',
  food: '#F08050',
  foodie: '#F08050',
  chill: '#8B5CF6',
};

// Insight type accent colors
const insightAccentColors: Record<string, string> = {
  achievement: '#10B981',
  tip: '#3B82F6',
  reminder: '#F59E0B',
};

// Insight type icons
const insightIcons: Record<string, string> = {
  trophy: 'trophy-outline',
  gift: 'gift-outline',
  lightbulb: 'bulb-outline',
  'trending-down': 'trending-down-outline',
  heart: 'heart-outline',
};

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = parseISO(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

// Per-image zoomable view for the lightbox carousel
const CarouselImage = React.memo(function CarouselImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 4));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.08) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Exclusive(doubleTap, pinchGesture);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <GestureDetector gesture={composed}>
      <ReAnimated.View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <ReAnimated.Image
          source={{ uri }}
          style={[{ width, height: width * 1.1 }, animStyle]}
          resizeMode="contain"
        />
      </ReAnimated.View>
    </GestureDetector>
  );
});

// Multi-image lightbox with swipe carousel and per-image pinch-to-zoom
const MemoryImageModal = React.memo(function MemoryImageModal({
  images,
  initialIndex = 0,
  visible,
  onClose,
}: {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header row */}
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
          <View style={{ flex: 1 }} />
          {images.length > 1 && (
            <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600', position: 'absolute', left: 0, right: 0, textAlign: 'center' }}>
              {currentIndex + 1} / {images.length}
            </Text>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Image carousel */}
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item: uri }) => (
            <CarouselImage uri={uri} width={screenWidth} height={screenHeight} />
          )}
        />

        {/* Dot indicators */}
        {images.length > 1 && (
          <View style={{ position: 'absolute', bottom: insets.bottom + 24, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {images.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === currentIndex ? '#FFF' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
});

const MemoryEntryRow = React.memo(function MemoryEntryRow({ memory, accent, dotColor, isDark, styles, onShare }: {
  memory: any; accent: any; dotColor: string; isDark: boolean; styles: any; onShare?: () => void;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Prefer the persisted R2 URL; fall back to local file URI while upload is in progress
  const userUri = memory.imageUrl || memory._localImageUri;
  const showUserImage = !!userUri && userUri !== failedUri;
  // Build full image array for carousel
  const allImages: string[] = memory.imageUrls?.length > 0
    ? memory.imageUrls
    : (userUri ? [userUri] : []);

  return (
    <View style={styles.memEntryContent}>
      {/* Instagram-like full-width image */}
      <TouchableOpacity
        activeOpacity={showUserImage ? 0.92 : 1}
        onPress={showUserImage ? () => setLightboxIndex(0) : undefined}
        style={[styles.memEntryPlaceholder, { backgroundColor: accent.bg, borderColor: dotColor + '33', borderWidth: 2 }]}
      >
        {showUserImage ? (
          <Image source={{ uri: userUri }} style={styles.memEntryImage} resizeMode="cover" onError={() => setFailedUri(userUri)} />
        ) : (
          <Image source={accent.fallbackImage} style={styles.memEntryImage} resizeMode="cover" />
        )}
        {/* Multi-image indicator */}
        {allImages.length > 1 && (
          <View style={styles.memImageCountBadge}>
            <Ionicons name="images-outline" size={10} color="#FFF" />
            <Text style={[styles.memImageCountText, { marginLeft: 2 }]}>{allImages.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Text row with title, description, and share button */}
      <View style={styles.memEntryRow}>
        <View style={styles.memEntryText}>
          <Text style={[styles.memEntryTitle, { color: dotColor }]} numberOfLines={2}>{memory.title}</Text>
          {memory.description ? (
            <Text style={styles.memEntryDesc} numberOfLines={2}>{memory.description}</Text>
          ) : null}
        </View>
        {onShare && (
          <TouchableOpacity onPress={onShare} style={styles.memShareBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Lightbox carousel */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <MemoryImageModal
          images={allImages}
          initialIndex={lightboxIndex}
          visible
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </View>
  );
});

// Mode sharing multi-select modal — lets users pick which modes can see this memory
const ALL_MODES: { mode: string; label: string; icon: string }[] = [
  { mode: 'personal', label: 'Personal', icon: 'person-outline' },
  { mode: 'couple', label: 'Couple', icon: 'heart-outline' },
  { mode: 'family', label: 'Family', icon: 'people-outline' },
  { mode: 'parenting', label: 'Parenting', icon: 'happy-outline' },
];

const MemoryModeShareModal = React.memo(function MemoryModeShareModal({
  visible,
  memory,
  currentMode,
  onApply,
  onDelete,
  onClose,
}: {
  visible: boolean;
  memory: any;
  currentMode: string;
  onApply: (visibleModes: string[] | undefined) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  // Init selected modes: combine the home mode with any existing visibleModes
  const initSelected = useMemo(() => {
    const base = new Set<string>([memory?.mode ?? currentMode]);
    (memory?.visibleModes ?? []).forEach((m: string) => base.add(m));
    return base;
  }, [memory, currentMode]);

  const [selected, setSelected] = useState<Set<string>>(initSelected);

  // Reset when modal opens with a new memory
  React.useEffect(() => {
    if (visible) setSelected(initSelected);
  }, [visible, initSelected]);

  const toggle = (m: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size <= 1) return prev; // can't deselect all
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  const handleApply = () => {
    const modes = Array.from(selected);
    // If all 4 modes selected, treat as "visible everywhere" (mode = undefined)
    onApply(modes.length >= ALL_MODES.length ? undefined : modes);
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
        bottom: 0,
        left: 0,
        right: 0,
      }}>
        {/* Handle */}
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700', marginBottom: 4 }}>Share to Modes</Text>
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 20 }}>
          Select which modes can see this memory
        </Text>

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
              <Ionicons
                name={isChecked ? 'checkbox' : 'square-outline'}
                size={24}
                color={isChecked ? '#6C63FF' : 'rgba(255,255,255,0.35)'}
              />
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
      </View>
    </Modal>
  );
});

export default function TogetherScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mode = useModeStore((s) => s.mode);
  const familyModeType = useModeHouseholdStore((s) => s.familyModeType);
  const familyLabel = familyModeType === 'friends' ? 'Friends' : 'Family';
  const tasks = useTaskStore((s) => s.tasks);
  const events = useCalendarStore((s) => s.events);
  const expenses = useExpenseStore((s) => s.expenses);
  const user = useAuthStore((s) => s.user);
  const householdData = useHouseholdStore((s) => s.household);
  const members = useHouseholdStore((s) => s.members);
  const memories = useMemoryStore((s) => s.memories);
  const fetchMemories = useMemoryStore((s) => s.fetchMemories);
  const updateMemory = useMemoryStore((s) => s.updateMemory);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  // Show memories for the current mode, including ones explicitly shared to this mode via visibleModes
  const modeMemories = useMemo(
    () => memories.filter((m) => {
      if (!m.mode && !m.visibleModes?.length) return true; // visible everywhere
      if (m.visibleModes?.includes(mode as any)) return true; // explicitly shared to this mode
      return m.mode === mode; // home mode
    }),
    [memories, mode],
  );
  // True if the user has at least one other household member to share with
  const hasPartners = useMemo(
    () => members.filter((m) => m.id !== user?.id).length > 0,
    [members, user?.id],
  );

  // Gate shared content creation — personal mode is exempt (solo reflections OK)
  const navToAddMemory = useCallback(() => {
    if (mode !== 'personal' && !hasPartners) {
      Alert.alert(
        'No members yet',
        'Invite a partner or family member before creating shared memories.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Invite', onPress: () => router.push('/invite') },
        ],
      );
      return;
    }
    router.push('/add-memory');
  }, [mode, hasPartners, router]);

  // Mode share modal state
  const [shareModalMemory, setShareModalMemory] = useState<any>(null);

  const handleMemoryOptions = useCallback((id: string, memMode?: string) => {
    const memory = memories.find((m) => m.id === id);
    if (memory) setShareModalMemory(memory);
  }, [memories]);

  const handleMemoryShareApply = useCallback((memoryId: string, visibleModes: string[] | undefined) => {
    // visibleModes = undefined means "all modes"; array = specific modes
    updateMemory(memoryId, { visibleModes } as any);
  }, [updateMemory]);

  const timelineEntries = useTimelineStore((s) => s.entries);
  const fetchTimeline = useTimelineStore((s) => s.fetchTimeline);
  const polls = usePollStore((s) => s.polls);
  const fetchPolls = usePollStore((s) => s.fetchPolls);
  const activityItems = useActivityStore((s) => s.items);
  const fetchActivity = useActivityStore((s) => s.fetchActivity);
  const cs = useSettingsStore((s) => s.currencySymbol) || '$';
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 50], outputRange: [0, 1], extrapolate: 'clamp' });
  const compactTitle = ({ personal: 'Just Me', couple: 'Partner', family: 'Family', parenting: 'Kids' } as Record<string, string>)[mode] ?? 'Together';

  useFocusEffect(useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchMemories();
      fetchTimeline();
      fetchPolls();
      fetchActivity();
    });
    return () => task.cancel();
  }, [fetchMemories, fetchTimeline, fetchPolls, fetchActivity]));

  const householdChildren = useMemo(() => householdData?.children ?? [], [householdData]);

  const handleInvite = () => {
    router.push('/invite' as any);
  };

  const currentUser = useMemo(() => ({
    id: user?.id ?? '',
    name: user?.name ?? 'You',
    email: user?.email ?? '',
    color: user ? getUserColor(user.id) : '#3B82F6',
  }), [user?.id, user?.name, user?.email]);

  const partner = useMemo(() => {
    const p = members.find((m) => m.id !== currentUser.id);
    return {
      id: p?.id ?? '',
      name: p?.name ?? 'Partner',
      color: p?.color ?? '#10B981',
    };
  }, [members, currentUser.id]);

  const household = useMemo(() => ({
    name: householdData?.name ?? 'Our Household',
    anniversary: householdData?.anniversary,
    togetherSince: householdData?.togetherSince,
    members,
  }), [householdData?.name, householdData?.anniversary, householdData?.togetherSince, members]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const now = useMemo(() => new Date(), []);
  const daysTogether = useMemo(() => {
    if (!household.togetherSince) return 0;
    return differenceInDays(new Date(), parseISO(household.togetherSince));
  }, [household.togetherSince]);
  const modeTheme = modeThemes[mode];

  // --- This Week Stats ---
  const weekAgo = useMemo(() => format(subDays(now, 7), 'yyyy-MM-dd'), [now]);

  // Circle members (family mode) — excludes partner-role members to avoid couple data bleeding in
  const circleMemberIds = useMemo(
    () => new Set(members.filter((m) => m.role !== 'partner').map((m) => m.id)),
    [members],
  );

  const weeklySharedEvents = useMemo(
    () => events.filter((e) => e.shared).length,
    [events],
  );

  // For family/circle mode: only count tasks assigned to circle members (not couple tasks)
  const weeklyCircleCompletedTasks = useMemo(
    () => tasks.filter((t) => t.completed && t.assignedTo && circleMemberIds.has(t.assignedTo)).length,
    [tasks, circleMemberIds],
  );

  const weeklyCompletedTasks = useMemo(
    () => tasks.filter((t) => t.shared && t.completed).length,
    [tasks],
  );

  const weeklySpending = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= weekAgo)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, weekAgo],
  );

  // --- Single mode stats ---
  const weeklyEventsAttended = useMemo(
    () => events.filter((e) => e.createdBy === currentUser.id || e.shared).length,
    [events, currentUser.id],
  );

  const weeklyTasksCompleted = useMemo(
    () => tasks.filter((t) => t.completed).length,
    [tasks],
  );

  const weeklyMoneySpent = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= weekAgo)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, weekAgo],
  );

  // --- Partner's Day ---
  const partnerTodayEvents = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.startDate.startsWith(todayStr) &&
            (e.createdBy === partner.id || e.shared),
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [events, todayStr, partner.id],
  );

  const partnerPendingTasks = useMemo(
    () => tasks.filter((t) => !t.completed && t.assignedTo === partner.id),
    [tasks],
  );

  // --- Parenting: first child's events and tasks ---
  const olderChild = householdChildren.length > 0 ? householdChildren[0] : undefined;
  // baby = youngest child (second if 2+, else first); fallback so single-child families also see the dashboard
  const baby = householdChildren[1] ?? householdChildren[0] ?? undefined;

  const olderChildTodayEvents = useMemo(
    () =>
      olderChild
        ? events
            .filter(
              (e) =>
                e.startDate.startsWith(todayStr) && e.createdBy === olderChild.id,
            )
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
        : [],
    [events, todayStr, olderChild],
  );

  const olderChildTodayTasks = useMemo(
    () =>
      olderChild
        ? tasks.filter((t) => t.assignedTo === olderChild.id && t.dueDate === todayStr)
        : [],
    [tasks, todayStr, olderChild],
  );

  const childStatsMap = useMemo(() => {
    const map: Record<string, { eventsToday: number; pendingTasks: number }> = {};
    for (const child of householdChildren) {
      map[child.id] = {
        eventsToday: events.filter((e) => e.startDate.startsWith(todayStr) && e.createdBy === child.id).length,
        pendingTasks: tasks.filter((t) => !t.completed && t.assignedTo === child.id).length,
      };
    }
    return map;
  }, [householdChildren, events, tasks, todayStr]);

  // --- Family: active polls (mode-scoped, exact match) ---
  const activePolls = useMemo(
    () => polls.filter((p) => p.status === 'active' && p.mode === mode),
    [polls, mode],
  );

  // --- Family: recent timeline (mode-scoped, exact match) ---
  const recentTimeline = useMemo(
    () =>
      [...timelineEntries]
        .filter((e) => e.mode === mode)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
    [timelineEntries, mode],
  );

  // --- Single mode: connections list ---
  const singleConnections = useMemo(() => {
    const connections: Array<{
      id: string;
      name: string;
      color: string;
      relationship: string;
    }> = [];
    // Add other household members as connections
    members
      .filter((m) => m.id !== currentUser.id)
      .forEach((m) => {
        connections.push({
          id: m.id,
          name: m.name,
          color: m.color || '#10B981',
          relationship: m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : 'Member',
        });
      });
    return connections;
  }, [members, currentUser.id]);

  // --- Kids quick status ---
  const getChildQuickStatus = (childId: string): string => {
    const childEvents = events.filter(
      (e) => e.startDate.startsWith(todayStr) && e.createdBy === childId,
    );
    if (childEvents.length > 0) {
      const nextEvent = childEvents.sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      )[0];
      const time = format(parseISO(nextEvent.startDate), 'h:mm a');
      return `${nextEvent.title} at ${time}`;
    }
    return 'Free today';
  };

  // --- Stable navigation handlers for parenting mode ---
  const navLogFeed = useCallback(() => router.push('/log-baby?type=feed' as any), []);
  const navLogSleep = useCallback(() => router.push('/log-baby?type=sleep' as any), []);
  const navLogDiaper = useCallback(() => router.push('/log-baby?type=diaper' as any), []);
  const navLogMilestone = useCallback(() => router.push('/log-baby?type=milestone' as any), []);

  // ====================================================================
  // SINGLE MODE — "My Circle"
  // ====================================================================
  const renderSingleMode = () => {
    return (
      <>
        {/* Header */}
        <View style={[styles.header, { paddingTop: spacing.md }]}>
          <Text style={styles.headerTitle}>Just Me</Text>
          <Text style={styles.headerSubtitle}>Your personal space</Text>
        </View>

        {/* My Stats This Week */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Week</Text>
        </View>
        <View style={styles.weekStatsFlexRow}>
          {[
            {
              value: weeklyEventsAttended,
              label: 'Events',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyTasksCompleted,
              label: 'Tasks done',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `${cs}${weeklyMoneySpent.toFixed(0)}`,
              label: 'Spent',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCardFlex}>
              <View
                style={[
                  styles.weekStatIconWrap,
                  { backgroundColor: stat.iconColor + '18' },
                ]}
              >
                <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
              </View>
              <Text style={styles.weekStatValue}>{stat.value}</Text>
              <Text style={styles.weekStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Personal Insights */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Insights</Text>
          <TouchableOpacity onPress={() => router.push('/insights')} activeOpacity={0.6}>
            <Text style={styles.seeAllText}>View all</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.whiteCard}
          onPress={() => router.push('/insights')}
          activeOpacity={0.8}
        >
          {[
            {
              icon: 'checkmark-circle-outline' as const,
              label: 'Tasks completed',
              value: String(tasks.filter((t) => t.completed).length),
              color: '#10B981',
            },
            {
              icon: 'calendar-outline' as const,
              label: 'Upcoming events',
              value: String(events.filter((e) => new Date(e.startDate) > new Date()).length),
              color: '#6366F1',
            },
            {
              icon: 'card-outline' as const,
              label: 'Total logged',
              value: `${cs}${expenses.reduce((s, e) => s + e.amount, 0).toFixed(0)}`,
              color: '#F59E0B',
            },
          ].map((stat, idx, arr) => (
            <View
              key={stat.label}
              style={[
                styles.insightStatRow,
                idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
              ]}
            >
              <View style={[styles.insightStatIcon, { backgroundColor: stat.color + '18' }]}>
                <Ionicons name={stat.icon} size={16} color={stat.color} />
              </View>
              <Text style={styles.insightStatLabel}>{stat.label}</Text>
              <Text style={[styles.insightStatValue, { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
          <View style={styles.insightViewMore}>
            <Ionicons name="bulb-outline" size={13} color={colors.primary} />
            <Text style={[styles.insightViewMoreText, { color: colors.primary }]}>View personalized insights</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Memory Lane — Personal */}
        <View style={styles.memLaneHeader}>
          <Text style={styles.sectionTitle}>Memory Lane</Text>
          <TouchableOpacity onPress={() => router.push('/add-memory')} style={styles.memLaneAddBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {modeMemories.length === 0 ? (
          <View style={styles.whiteCard}>
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
                <Ionicons name="star-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.emptyHintTitle}>Your personal memory lane</Text>
              <Text style={styles.emptyHintDesc}>
                Capture moments, milestones, and everyday magic — just for you
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.7}
                onPress={() => router.push('/add-memory')}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add memory</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.memTimelineWrap}>
            {[...modeMemories]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((memory, idx, arr) => {
                const d = new Date(memory.date);
                const day = format(d, 'd');
                const month = format(d, 'MMM').toUpperCase();
                const accent = memoryTypeAccent[memory.type] ?? memoryTypeAccent.note;
                const dotColor = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
                const isLast = idx === arr.length - 1;
                return (
                  <View key={memory.id} style={styles.memTimelineRow}>
                    <View style={styles.memDateCol}>
                      <Text style={[styles.memDayNum, { color: dotColor }]}>{day}</Text>
                      <Text style={styles.memMonthText}>{month}</Text>
                    </View>
                    <View style={styles.memLineCol}>
                      <View style={[styles.memDot, { backgroundColor: dotColor, shadowColor: dotColor, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }]} />
                      {!isLast && <View style={[styles.memConnector, { backgroundColor: dotColor + '40' }]} />}
                    </View>
                    <MemoryEntryRow memory={memory} accent={accent} dotColor={dotColor} isDark={isDark} styles={styles} onShare={() => handleMemoryOptions(memory.id, memory.mode)} />
                  </View>
                );
              })}
            {modeMemories.length > 5 && (
              <TouchableOpacity style={styles.memSeeAllRow} onPress={() => router.push('/timeline')} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { fontWeight: '600' }]}>See all {modeMemories.length} memories</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              label: 'Add memory',
              icon: 'star-outline' as const,
              onPress: () => router.push('/add-memory'),
            },
            {
              label: 'Journal',
              icon: 'book-outline' as const,
              onPress: () => router.push('/journal'),
            },
            {
              label: 'Set goal',
              icon: 'flag-outline' as const,
              onPress: () => router.push('/goals'),
            },
            {
              label: 'Wellness',
              icon: 'heart-circle-outline' as const,
              onPress: () => router.push('/add-wellness' as any),
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionWrap}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.quickActionCircle,
                  { backgroundColor: modeTheme.accent },
                ]}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // COUPLE MODE — "Partner"
  // ====================================================================
  const renderCoupleMode = () => {
    const anniversaryDate = household.anniversary
      ? format(parseISO(household.anniversary), 'MMMM d, yyyy')
      : '';

    return (
      <>
        {/* Header */}
        <View style={[styles.header, { paddingTop: spacing.md }]}>
          <Text style={styles.headerTitle}>Partner</Text>
          <Text style={styles.headerSubtitle}>You & {partner.name}</Text>
        </View>

        {/* Connection Card */}
        <View style={styles.whiteCard}>
          <View style={styles.coupleAvatarRow}>
            <View style={styles.coupleAvatarWrap}>
              <Avatar
                name={currentUser.name}
                size={64}
                color={getUserColor(currentUser.id)}
              />
            </View>
            <View style={styles.coupleHeartBadge}>
              <Ionicons name="heart" size={14} color="#FFFFFF" />
            </View>
            <View
              style={[styles.coupleAvatarWrap, { marginLeft: -spacing.lg }]}
            >
              <Avatar
                name={partner.id ? partner.name : '?'}
                size={64}
                color={partner.id ? getUserColor(partner.id) : colors.textTertiary}
              />
            </View>
          </View>
          <Text style={styles.coupleDaysNumber}>
            {daysTogether.toLocaleString()}
          </Text>
          <Text style={styles.coupleDaysLabel}>days together</Text>
          {anniversaryDate !== '' && (
            <Text style={styles.coupleAnniversary}>
              Together since {anniversaryDate}
            </Text>
          )}
          {partner.id === '' && (
            <TouchableOpacity
              style={styles.inviteRow}
              onPress={handleInvite}
              activeOpacity={0.7}
            >
              <View style={styles.inviteIconCircle}>
                <Ionicons name="heart-half-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.inviteRowText}>Invite your partner</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* This Week Together Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Week Together</Text>
        </View>
        <View style={styles.weekStatsFlexRow}>
          {[
            {
              value: weeklySharedEvents,
              label: 'Events',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyCompletedTasks,
              label: 'Tasks done',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `${cs}${weeklySpending.toFixed(0)}`,
              label: 'Spending',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCardFlex}>
              <View
                style={[
                  styles.weekStatIconWrap,
                  { backgroundColor: stat.iconColor + '18' },
                ]}
              >
                <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
              </View>
              <Text style={styles.weekStatValue}>{stat.value}</Text>
              <Text style={styles.weekStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Partner's Day */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{partner.name}'s Day</Text>
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.partnerCardHeader}>
            <Avatar
              name={partner.id ? partner.name : '?'}
              size={28}
              color={partner.id ? getUserColor(partner.id) : colors.textTertiary}
            />
            <Text style={styles.partnerCardName}>{partner.id ? partner.name : 'Partner'}</Text>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>today</Text>
            </View>
          </View>

          {partnerTodayEvents.length > 0 ? (
            <View style={styles.miniTimeline}>
              {partnerTodayEvents.map((event, idx) => (
                <View key={event.id} style={styles.miniTimelineRow}>
                  <View style={styles.miniTimelineDotCol}>
                    <View
                      style={[
                        styles.miniDot,
                        {
                          backgroundColor:
                            event.color || getUserColor(partner.id),
                        },
                      ]}
                    />
                    {idx < partnerTodayEvents.length - 1 && (
                      <View style={styles.miniLine} />
                    )}
                  </View>
                  <View style={styles.miniTimelineContent}>
                    <Text style={styles.miniEventTitle}>{event.title}</Text>
                    <Text style={styles.miniEventTime}>
                      {event.allDay
                        ? 'All day'
                        : format(parseISO(event.startDate), 'h:mm a')}
                      {event.location ? ` \u00B7 ${event.location}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={styles.partnerEmpty}>No events today</Text>
              <Text style={[styles.partnerEmpty, { fontSize: 12, marginTop: 2 }]}>Add events to see their schedule here</Text>
              <TouchableOpacity onPress={() => router.push('/add-event')} activeOpacity={0.7} style={{ marginTop: spacing.sm }}>
                <Text style={[styles.seeAllText, { fontSize: 13 }]}>+ Add event</Text>
              </TouchableOpacity>
            </View>
          )}

          {partnerPendingTasks.length > 0 && (
            <View style={styles.partnerTasks}>
              <Text style={styles.partnerTasksLabel}>
                {partnerPendingTasks.length} pending task
                {partnerPendingTasks.length !== 1 ? 's' : ''}
              </Text>
              {partnerPendingTasks.slice(0, 3).map((task) => (
                <View key={task.id} style={styles.partnerTaskRow}>
                  <View style={styles.partnerTaskCheck} />
                  <Text style={styles.partnerTaskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Memory Lane */}
        <View style={styles.memLaneHeader}>
          <Text style={styles.sectionTitle}>Memory Lane</Text>
          <TouchableOpacity
            onPress={navToAddMemory}
            style={styles.memLaneAddBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {modeMemories.length === 0 ? (
          <View style={styles.whiteCard}>
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
                <Ionicons name="star-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.emptyHintTitle}>Save your favorite moments</Text>
              <Text style={styles.emptyHintDesc}>
                Add memories of special times you share — dates, milestones, or everyday joy
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.7}
                onPress={navToAddMemory}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add memory</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.memTimelineWrap}>
            {[...modeMemories]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((memory, idx, arr) => {
                const d = new Date(memory.date);
                const day = format(d, 'd');
                const month = format(d, 'MMM').toUpperCase();
                const accent = memoryTypeAccent[memory.type] ?? memoryTypeAccent.note;
                const dotColor = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
                const isLast = idx === arr.length - 1;
                return (
                  <View key={memory.id} style={styles.memTimelineRow}>
                    {/* Date */}
                    <View style={styles.memDateCol}>
                      <Text style={[styles.memDayNum, { color: dotColor }]}>{day}</Text>
                      <Text style={styles.memMonthText}>{month}</Text>
                    </View>
                    {/* Dot + connector line */}
                    <View style={styles.memLineCol}>
                      <View style={[styles.memDot, { backgroundColor: dotColor, shadowColor: dotColor, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }]} />
                      {!isLast && <View style={[styles.memConnector, { backgroundColor: dotColor + '40' }]} />}
                    </View>
                    {/* Image + text */}
                    <MemoryEntryRow memory={memory} accent={accent} dotColor={dotColor} isDark={isDark} styles={styles} onShare={() => handleMemoryOptions(memory.id, memory.mode)} />
                  </View>
                );
              })}
            {modeMemories.length > 5 && (
              <TouchableOpacity
                style={styles.memSeeAllRow}
                onPress={() => router.push('/timeline')}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAllText, { fontWeight: '600' }]}>
                  See all {modeMemories.length} memories
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Date Ideas */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Date Ideas</Text>
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.emptyHintContainer}>
            <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FCE7F3', isDark) }]}>
              <Ionicons name="heart-outline" size={24} color="#EC4899" />
            </View>
            <Text style={styles.emptyHintTitle}>Plan your next date</Text>
            <Text style={styles.emptyHintDesc}>
              Build a collection of fun things to do together — dinners, adventures, or cozy nights in
            </Text>
            <TouchableOpacity
              style={[styles.emptyHintBtn, { backgroundColor: '#EC4899' }]}
              activeOpacity={0.7}
              onPress={() => router.push('/date-ideas')}
            >
              <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              <Text style={styles.emptyHintBtnText}>Browse ideas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              label: 'Plan a date',
              icon: 'heart-outline' as const,
              onPress: () => router.push('/date-ideas'),
            },
            {
              label: 'Settle up',
              icon: 'swap-horizontal-outline' as const,
              onPress: () => router.push('/settle-up'),
            },
            {
              label: 'Add memory',
              icon: 'star-outline' as const,
              onPress: navToAddMemory,
            },
            {
              label: 'Polls',
              icon: 'chatbubbles-outline' as const,
              onPress: () => router.push('/polls'),
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionWrap}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.quickActionCircle,
                  { backgroundColor: modeTheme.accent },
                ]}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // FAMILY MODE — "Family"
  // ====================================================================
  const renderFamilyMode = () => {
    // Exclude partner-role members — they belong in couple mode only
    const circleMembers = members.filter((m) => m.id !== currentUser.id && m.role !== 'partner');
    const allFamilyAvatars = [
      {
        id: currentUser.id,
        name: currentUser.name,
        color: getUserColor(currentUser.id),
      },
      ...circleMembers.map((m) => ({
        id: m.id,
        name: m.name,
        color: getUserColor(m.id),
      })),
      ...householdChildren.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      })),
    ];

    const totalMembers = allFamilyAvatars.length;

    return (
      <>
        {/* Header */}
        <View style={[styles.header, { paddingTop: spacing.md }]}>
          <Text style={styles.headerTitle}>{familyLabel}</Text>
          <Text style={styles.headerSubtitle}>
            Your family, friends &amp; people you care about
          </Text>
        </View>

        {/* Circle Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.cardTitle}>{familyLabel}</Text>
          {allFamilyAvatars.length <= 1 ? (
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.emptyHintTitle}>Build your {familyLabel.toLowerCase()} group</Text>
              <Text style={styles.emptyHintDesc}>
                Add family members, friends, or anyone you want to stay connected with. Share calendars, tasks, and memories together.
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={handleInvite}
              >
                <Ionicons name="person-add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Invite member</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.familyGrid}>
                {allFamilyAvatars.map((member) => (
                  <View key={member.id} style={styles.familyGridItem}>
                    <Avatar name={member.name} size={48} color={member.color} />
                    <Text style={styles.familyGridName} numberOfLines={1}>
                      {member.name}
                    </Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.inviteRow}
                onPress={handleInvite}
                activeOpacity={0.7}
              >
                <View style={styles.inviteIconCircle}>
                  <Ionicons name="person-add" size={16} color={colors.primary} />
                </View>
                <Text style={styles.inviteRowText}>Invite member</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
              <Text style={styles.connectionSubtext}>
                {totalMembers} {totalMembers === 1 ? 'person' : 'people'}
              </Text>
            </>
          )}
        </View>

        {/* Family & Friends This Week */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{familyLabel} This Week</Text>
        </View>
        <View style={styles.weekStatsFlexRow}>
          {[
            {
              value: weeklySharedEvents,
              label: 'Events',
              icon: 'calendar-outline' as const,
              iconColor: colors.primary,
            },
            {
              value: weeklyCircleCompletedTasks,
              label: 'Tasks done',
              icon: 'checkmark-circle-outline' as const,
              iconColor: colors.success,
            },
            {
              value: `${cs}${weeklySpending.toFixed(0)}`,
              label: 'Spending',
              icon: 'wallet-outline' as const,
              iconColor: colors.warning,
            },
          ].map((stat, idx) => (
            <View key={idx} style={styles.weekStatCardFlex}>
              <View
                style={[
                  styles.weekStatIconWrap,
                  { backgroundColor: stat.iconColor + '18' },
                ]}
              >
                <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
              </View>
              <Text style={styles.weekStatValue}>{stat.value}</Text>
              <Text style={styles.weekStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Family Activity Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Feed</Text>
        </View>
        <View style={styles.whiteCard}>
          {activityItems.length === 0 ? (
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="people-outline" size={24} color={colors.success} />
              </View>
              <Text style={styles.emptyHintTitle}>Family activity will appear here</Text>
              <Text style={styles.emptyHintDesc}>
                When family or friends complete tasks, add events, or update lists — it shows up here
              </Text>
            </View>
          ) : (
            activityItems.slice(0, 8).map((item, idx) => (
              <View key={item.id} style={[styles.activityRow, idx > 0 && styles.activityRowBorder]}>
                <View style={[styles.activityIcon, { backgroundColor: (item.color || colors.primary) + '18' }]}>
                  <Ionicons name={(item.icon as any) || 'pulse-outline'} size={16} color={item.color || colors.primary} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityAction} numberOfLines={1}>{item.action}</Text>
                  {!!item.detail && <Text style={styles.activityDetail} numberOfLines={1}>{item.detail}</Text>}
                </View>
                <Text style={styles.activityTime}>
                  {isValid(parseISO(item.timestamp)) ? format(parseISO(item.timestamp), 'MMM d') : ''}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Family Timeline Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {recentTimeline.length > 4 && (
            <TouchableOpacity
              onPress={() => router.push('/timeline')}
              activeOpacity={0.6}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.whiteCard}>
          {recentTimeline.length === 0 ? (
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#EDE9FE', isDark) }]}>
                <Ionicons name="time-outline" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.emptyHintTitle}>Your family timeline</Text>
              <Text style={styles.emptyHintDesc}>
                Record milestones, events, and special moments shared with your family &amp; friends
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#8B5CF6' }]}
                activeOpacity={0.7}
                onPress={() => router.push('/add-timeline-entry')}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentTimeline.map((entry, idx) => (
              <View
                key={entry.id}
                style={[
                  styles.timelineRow,
                  idx < recentTimeline.length - 1 && styles.activityRowBorder,
                ]}
              >
                <Text style={styles.timelineEmoji}>{entry.emoji}</Text>
                <View style={styles.timelineTextWrap}>
                  <Text style={styles.timelineTitle}>{entry.title}</Text>
                  <Text style={styles.timelineDate}>
                    {format(parseISO(entry.date), 'MMM d, yyyy')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Family Polls */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Polls</Text>
        </View>
        {activePolls.length === 0 ? (
          <View style={[styles.whiteCard, { marginHorizontal: spacing.xl }]}>
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.emptyHintTitle}>Vote together on decisions</Text>
              <Text style={styles.emptyHintDesc}>
                Create polls to decide things as a family — dinner, activities, or weekend plans
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                onPress={() => router.push('/create-poll')}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Create poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.pollsContainer}>
            {activePolls.map((poll) => {
              const totalVotes = poll.options.reduce(
                (sum, opt) => sum + opt.votes.length,
                0,
              );
              const userVoted = poll.options.some((opt) =>
                opt.votes.includes(currentUser.id),
              );
              return (
                <TouchableOpacity
                  key={poll.id}
                  style={styles.pollCard}
                  activeOpacity={0.7}
                  onPress={() => router.push('/polls')}
                >
                  <Text style={styles.pollQuestion}>{poll.question}</Text>
                  <View style={styles.pollMeta}>
                    <Text style={styles.pollOptionCount}>
                      {poll.options.length} options
                    </Text>
                    <View
                      style={[
                        styles.pollVoteBadge,
                        {
                          backgroundColor: userVoted
                            ? colors.successLight
                            : colors.warningLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pollVoteBadgeText,
                          {
                            color: userVoted ? colors.success : colors.warning,
                          },
                        ]}
                      >
                        {userVoted ? 'Voted' : 'Vote now'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Memory Lane — Family */}
        <View style={styles.memLaneHeader}>
          <Text style={styles.sectionTitle}>Memory Lane</Text>
          <TouchableOpacity onPress={navToAddMemory} style={styles.memLaneAddBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {modeMemories.length === 0 ? (
          <View style={styles.whiteCard}>
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
                <Ionicons name="star-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.emptyHintTitle}>Capture family moments</Text>
              <Text style={styles.emptyHintDesc}>
                Save photos, milestones, and shared memories with your family
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.7}
                onPress={navToAddMemory}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add memory</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.memTimelineWrap}>
            {[...modeMemories]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((memory, idx, arr) => {
                const d = new Date(memory.date);
                const day = format(d, 'd');
                const month = format(d, 'MMM').toUpperCase();
                const accent = memoryTypeAccent[memory.type] ?? memoryTypeAccent.note;
                const dotColor = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
                const isLast = idx === arr.length - 1;
                return (
                  <View key={memory.id} style={styles.memTimelineRow}>
                    <View style={styles.memDateCol}>
                      <Text style={[styles.memDayNum, { color: dotColor }]}>{day}</Text>
                      <Text style={styles.memMonthText}>{month}</Text>
                    </View>
                    <View style={styles.memLineCol}>
                      <View style={[styles.memDot, { backgroundColor: dotColor, shadowColor: dotColor, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }]} />
                      {!isLast && <View style={[styles.memConnector, { backgroundColor: dotColor + '40' }]} />}
                    </View>
                    <MemoryEntryRow memory={memory} accent={accent} dotColor={dotColor} isDark={isDark} styles={styles} onShare={() => handleMemoryOptions(memory.id, memory.mode)} />
                  </View>
                );
              })}
            {modeMemories.length > 5 && (
              <TouchableOpacity style={styles.memSeeAllRow} onPress={() => router.push('/timeline')} activeOpacity={0.7}>
                <Text style={[styles.seeAllText, { fontWeight: '600' }]}>See all {modeMemories.length} memories</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {[
            {
              label: 'Family plan',
              icon: 'people-outline' as const,
              onPress: () => router.push('/(tabs)/calendar'),
            },
            {
              label: 'Settle up',
              icon: 'swap-horizontal-outline' as const,
              onPress: () => router.push('/settle-up'),
            },
            {
              label: 'Add memory',
              icon: 'star-outline' as const,
              onPress: navToAddMemory,
            },
            {
              label: 'Polls',
              icon: 'chatbubbles-outline' as const,
              onPress: () => router.push('/polls'),
            },
          ].map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickActionWrap}
              activeOpacity={0.7}
              onPress={action.onPress}
            >
              <View
                style={[
                  styles.quickActionCircle,
                  { backgroundColor: modeTheme.accent },
                ]}
              >
                <Ionicons name={action.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // PARENTING MODE — "Kids"
  // ====================================================================
  const renderParentingMode = () => {
    return (
      <>
        {/* Header */}
        <View style={[styles.header, { paddingTop: spacing.md }]}>
          <Text style={styles.headerTitle}>Kids</Text>
          <Text style={styles.headerSubtitle}>
            {householdChildren.map((c) => c.name).join(' & ') || 'Your kids'}
          </Text>
        </View>

        {/* Kids Overview Card */}
        <View style={styles.whiteCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>Kids Overview</Text>
            <TouchableOpacity
              onPress={() => router.push('/add-child' as any)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle-outline" size={22} color={modeTheme.accent} />
            </TouchableOpacity>
          </View>
          {householdChildren.length === 0 ? (
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#ECFDF5', isDark) }]}>
                <Ionicons name="people-outline" size={24} color={modeTheme.accent} />
              </View>
              <Text style={styles.emptyHintTitle}>Add your kids</Text>
              <Text style={styles.emptyHintDesc}>
                Add your children to track activities, milestones, and daily routines
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: modeTheme.accent }]}
                activeOpacity={0.7}
                onPress={() => router.push('/add-child' as any)}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add child</Text>
              </TouchableOpacity>
            </View>
          ) : (
            householdChildren.map((child, idx) => {
              const dob = child.dateOfBirth ? parseISO(child.dateOfBirth) : null;
              const ageMonths = dob && isValid(dob) ? differenceInMonths(new Date(), dob) : null;
              const ageYears = ageMonths !== null ? Math.floor(ageMonths / 12) : null;
              const displayAge = ageMonths !== null
                ? ageMonths < 24 ? `${ageMonths}mo` : `${ageYears}yr`
                : null;
              const stats = childStatsMap[child.id] ?? { eventsToday: 0, pendingTasks: 0 };
              return (
                <React.Fragment key={child.id}>
                  {idx > 0 && <View style={styles.kidOverviewDivider} />}
                  <View style={styles.kidOverviewRow}>
                    <Avatar name={child.name} size={48} color={child.color} />
                    <View style={styles.kidOverviewInfo}>
                      <View style={styles.kidOverviewNameRow}>
                        <Text style={styles.kidOverviewName}>{child.name}</Text>
                        {displayAge && <Text style={styles.kidOverviewAge}>{displayAge}</Text>}
                      </View>
                      {child.schoolName ? (
                        <Text style={styles.kidOverviewSchool} numberOfLines={1}>
                          {child.schoolName}
                        </Text>
                      ) : null}
                      <View style={styles.kidOverviewChips}>
                        {stats.eventsToday > 0 ? (
                          <View style={[styles.kidChip, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="calendar-outline" size={10} color={colors.primary} />
                            <Text style={[styles.kidChipText, { color: colors.primary }]}>
                              {stats.eventsToday} {stats.eventsToday === 1 ? 'event' : 'events'}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.kidChip, { backgroundColor: colors.borderLight }]}>
                            <Text style={[styles.kidChipText, { color: colors.textTertiary }]}>Free today</Text>
                          </View>
                        )}
                        {stats.pendingTasks > 0 && (
                          <View style={[styles.kidChip, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
                            <Ionicons name="checkmark-circle-outline" size={10} color="#F59E0B" />
                            <Text style={[styles.kidChipText, { color: '#F59E0B' }]}>
                              {stats.pendingTasks} {stats.pendingTasks === 1 ? 'task' : 'tasks'}
                            </Text>
                          </View>
                        )}
                        {child.bedtime ? (
                          <View style={[styles.kidChip, { backgroundColor: adaptTintColor('#EDE9FE', isDark) }]}>
                            <Ionicons name="moon-outline" size={10} color="#7C3AED" />
                            <Text style={[styles.kidChipText, { color: '#7C3AED' }]}>{child.bedtime}</Text>
                          </View>
                        ) : null}
                        {child.allergies && child.allergies.length > 0 ? (
                          <View style={[styles.kidChip, { backgroundColor: adaptTintColor('#FEE2E2', isDark) }]}>
                            <Ionicons name="warning-outline" size={10} color="#EF4444" />
                            <Text style={[styles.kidChipText, { color: '#EF4444' }]}>Allergies</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </React.Fragment>
              );
            })
          )}
        </View>

        {/* Baby Dashboard */}
        {baby && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Baby Dashboard — {baby.name}</Text>
            </View>
            <View style={styles.whiteCard}>
              {/* Feed */}
              <View style={styles.babyLogRow}>
                <Text style={styles.babyLogEmoji}>{'\uD83C\uDF7C'}</Text>
                <View style={styles.babyLogInfo}>
                  <Text style={styles.babyLogType}>Last Feed</Text>
                  <Text style={styles.babyLogNote}>Tap Log to record</Text>
                </View>
                <TouchableOpacity
                  onPress={navLogFeed}
                  style={[styles.babyLogBtn, { backgroundColor: modeTheme.accent + '22' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.babyLogBtnText, { color: modeTheme.accent }]}>Log</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.babyLogDivider} />

              {/* Sleep */}
              <View style={styles.babyLogRow}>
                <Text style={styles.babyLogEmoji}>{'\uD83D\uDCA4'}</Text>
                <View style={styles.babyLogInfo}>
                  <Text style={styles.babyLogType}>Last Sleep</Text>
                  <Text style={styles.babyLogNote}>Tap Log to record</Text>
                </View>
                <TouchableOpacity
                  onPress={navLogSleep}
                  style={[styles.babyLogBtn, { backgroundColor: modeTheme.accent + '22' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.babyLogBtnText, { color: modeTheme.accent }]}>Log</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.babyLogDivider} />

              {/* Diaper */}
              <View style={styles.babyLogRow}>
                <Text style={styles.babyLogEmoji}>{'\uD83E\uDDF7'}</Text>
                <View style={styles.babyLogInfo}>
                  <Text style={styles.babyLogType}>Last Diaper</Text>
                  <Text style={styles.babyLogNote}>Tap Log to record</Text>
                </View>
                <TouchableOpacity
                  onPress={navLogDiaper}
                  style={[styles.babyLogBtn, { backgroundColor: modeTheme.accent + '22' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.babyLogBtnText, { color: modeTheme.accent }]}>Log</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Emma's Activities */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{olderChild?.name ?? 'Child'}'s Activities</Text>
        </View>
        <View style={styles.whiteCard}>
          {olderChildTodayEvents.length > 0 || olderChildTodayTasks.length > 0 ? (
            <>
              {olderChildTodayEvents.map((event) => (
                <View key={event.id} style={styles.emmaActivityRow}>
                  <View
                    style={[
                      styles.emmaActivityDot,
                      { backgroundColor: event.color || modeTheme.accent },
                    ]}
                  />
                  <View style={styles.emmaActivityInfo}>
                    <Text style={styles.emmaActivityTitle}>{event.title}</Text>
                    <Text style={styles.emmaActivityTime}>
                      {event.allDay
                        ? 'All day'
                        : format(parseISO(event.startDate), 'h:mm a')}
                      {event.location ? ` \u00B7 ${event.location}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
              {olderChildTodayTasks.map((task) => (
                <View key={task.id} style={styles.emmaActivityRow}>
                  <View
                    style={[
                      styles.emmaTaskCheck,
                      task.completed && {
                        backgroundColor: colors.success,
                        borderColor: colors.success,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.emmaActivityTitle,
                      task.completed && styles.emmaActivityCompleted,
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text style={styles.partnerEmpty}>
                No activities for {olderChild?.name ?? 'child'} today
              </Text>
              <Text style={[styles.partnerEmpty, { fontSize: 12, marginTop: 2 }]}>Add school, sports, or play events</Text>
              <TouchableOpacity onPress={() => router.push('/add-event')} activeOpacity={0.7} style={{ marginTop: spacing.sm }}>
                <Text style={[styles.seeAllText, { fontSize: 13 }]}>+ Add activity</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Growth Milestones */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Growth Milestones</Text>
          <TouchableOpacity onPress={navLogMilestone} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.whiteCard}>
          <View style={styles.emptyHintContainer}>
            <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
              <Ionicons name="star-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.emptyHintTitle}>Track growth milestones</Text>
            <Text style={styles.emptyHintDesc}>
              Record first steps, first words, and other special moments
            </Text>
            <TouchableOpacity
              style={[styles.emptyHintBtn, { backgroundColor: '#F59E0B' }]}
              activeOpacity={0.7}
              onPress={navLogMilestone}
            >
              <Ionicons name="add" size={14} color="#FFFFFF" />
              <Text style={styles.emptyHintBtnText}>Add milestone</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Memory Lane */}
        <View style={styles.memLaneHeader}>
          <Text style={styles.sectionTitle}>Memory Lane</Text>
          <TouchableOpacity
            onPress={navToAddMemory}
            style={styles.memLaneAddBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {modeMemories.length === 0 ? (
          <View style={styles.whiteCard}>
            <View style={styles.emptyHintContainer}>
              <View style={[styles.emptyHintIcon, { backgroundColor: adaptTintColor('#FEF3C7', isDark) }]}>
                <Ionicons name="star-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.emptyHintTitle}>Capture family moments</Text>
              <Text style={styles.emptyHintDesc}>
                Save photos, milestones, and everyday memories with your kids
              </Text>
              <TouchableOpacity
                style={[styles.emptyHintBtn, { backgroundColor: '#F59E0B' }]}
                activeOpacity={0.7}
                onPress={navToAddMemory}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.emptyHintBtnText}>Add memory</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.memTimelineWrap}>
            {[...modeMemories]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((memory, idx, arr) => {
                const d = new Date(memory.date);
                const day = format(d, 'd');
                const month = format(d, 'MMM').toUpperCase();
                const accent = memoryTypeAccent[memory.type] ?? memoryTypeAccent.note;
                const dotColor = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
                const isLast = idx === arr.length - 1;
                return (
                  <View key={memory.id} style={styles.memTimelineRow}>
                    <View style={styles.memDateCol}>
                      <Text style={[styles.memDayNum, { color: dotColor }]}>{day}</Text>
                      <Text style={styles.memMonthText}>{month}</Text>
                    </View>
                    <View style={styles.memLineCol}>
                      <View style={[styles.memDot, { backgroundColor: dotColor, shadowColor: dotColor, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }]} />
                      {!isLast && <View style={[styles.memConnector, { backgroundColor: dotColor + '40' }]} />}
                    </View>
                    <MemoryEntryRow memory={memory} accent={accent} dotColor={dotColor} isDark={isDark} styles={styles} onShare={() => handleMemoryOptions(memory.id, memory.mode)} />
                  </View>
                );
              })}
            {modeMemories.length > 5 && (
              <TouchableOpacity
                style={styles.memSeeAllRow}
                onPress={() => router.push('/timeline')}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAllText, { fontWeight: '600' }]}>
                  See all {modeMemories.length} memories
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionWrap} activeOpacity={0.7} onPress={navLogFeed}>
            <View style={[styles.quickActionCircle, { backgroundColor: modeTheme.accent }]}>
              <Ionicons name="clipboard-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionLabel}>Log baby</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionWrap} activeOpacity={0.7} onPress={navLogMilestone}>
            <View style={[styles.quickActionCircle, { backgroundColor: modeTheme.accent }]}>
              <Ionicons name="star-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionLabel}>Milestone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionWrap} activeOpacity={0.7} onPress={() => router.push('/meal-plan')}>
            <View style={[styles.quickActionCircle, { backgroundColor: modeTheme.accent }]}>
              <Ionicons name="nutrition-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionLabel}>Meal plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionWrap} activeOpacity={0.7} onPress={() => router.push('/add-task')}>
            <View style={[styles.quickActionCircle, { backgroundColor: modeTheme.accent }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionLabel}>Add task</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 160 }} />
      </>
    );
  };

  // ====================================================================
  // RENDER — calls the right mode function
  // ====================================================================
  const renderModeContent = () => {
    switch (mode) {
      case 'personal':
        return renderSingleMode();
      case 'couple':
        return renderCoupleMode();
      case 'family':
        return renderFamilyMode();
      case 'parenting':
        return renderParentingMode();
      default:
        return renderCoupleMode();
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {renderModeContent()}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[styles.compactHeader, { height: insets.top, opacity: headerOpacity }]}
      >
        <Text style={styles.compactHeaderTitle}>{compactTitle}</Text>
        <View style={styles.compactHeaderBorder} />
      </Animated.View>

      {/* Mode sharing modal */}
      {shareModalMemory && (
        <MemoryModeShareModal
          visible={!!shareModalMemory}
          memory={shareModalMemory}
          currentMode={mode}
          onApply={(visibleModes) => handleMemoryShareApply(shareModalMemory.id, visibleModes)}
          onDelete={() => deleteMemory(shareModalMemory.id)}
          onClose={() => setShareModalMemory(null)}
        />
      )}
    </View>
  );
}

// ======================================================================
// STYLES
// ======================================================================
const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing['3xl'],
  },

  // ----------------------------------------------------------------
  // COMPACT SCROLL HEADER
  // ----------------------------------------------------------------
  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  compactHeaderTitle: {
    ...typography.headline,
    color: colors.text,
    fontSize: 15,
  },
  compactHeaderBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  // ----------------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------------
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.largeTitle,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.callout,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ----------------------------------------------------------------
  // GENERIC WHITE CARD
  // ----------------------------------------------------------------
  whiteCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  cardTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.lg,
  },

  // ----------------------------------------------------------------
  // SECTION HEADERS
  // ----------------------------------------------------------------
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '700',
    color: colors.text,
  },
  seeAllText: {
    ...typography.caption1,
    color: colors.primary,
  },

  // ----------------------------------------------------------------
  // SINGLE MODE: Connections
  // ----------------------------------------------------------------
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  connectionName: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  relationshipBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  relationshipBadgeText: {
    ...typography.caption1,
    fontWeight: '600',
  },
  connectionSubtext: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // ----------------------------------------------------------------
  // SINGLE MODE: Insights
  // ----------------------------------------------------------------
  insightsContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  insightAccentBar: {
    width: 4,
  },
  insightContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextWrap: {
    flex: 1,
  },
  insightTitle: {
    ...typography.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  insightDescription: {
    ...typography.caption1,
    color: colors.textSecondary,
  },

  // ----------------------------------------------------------------
  // WEEK STATS
  // ----------------------------------------------------------------
  weekStatsScroll: {
    marginBottom: spacing.xl,
  },
  weekStatsRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  weekStatsFlexRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  weekStatCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  weekStatCardFlex: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  weekStatIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  weekStatValue: {
    ...typography.title3,
    color: colors.text,
    marginBottom: 2,
  },
  weekStatLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ----------------------------------------------------------------
  // COUPLE MODE: Connection Card
  // ----------------------------------------------------------------
  coupleAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  coupleAvatarWrap: {
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: 999,
  },
  coupleHeartBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -spacing.md,
    zIndex: 2,
    ...shadows.sm,
  },
  coupleDaysNumber: {
    ...heroTypography.heroNumber,
    color: colors.text,
    textAlign: 'center',
  },
  coupleDaysLabel: {
    ...heroTypography.heroLabel,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  coupleAnniversary: {
    ...typography.footnote,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // ----------------------------------------------------------------
  // PARTNER'S DAY
  // ----------------------------------------------------------------
  partnerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  partnerCardName: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
  },
  todayBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  todayBadgeText: {
    ...typography.caption2,
    color: colors.primary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  miniTimeline: {
    marginLeft: spacing.xs,
  },
  miniTimelineRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  miniTimelineDotCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 5,
  },
  miniDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  miniLine: {
    width: 1,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginTop: 3,
    marginBottom: 3,
  },
  miniTimelineContent: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingBottom: spacing.sm,
  },
  miniEventTitle: {
    ...typography.subhead,
    color: colors.text,
  },
  miniEventTime: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },
  partnerEmpty: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  partnerTasks: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  partnerTasksLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  partnerTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  partnerTaskCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  partnerTaskTitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    flex: 1,
  },

  // ----------------------------------------------------------------
  // MEMORY LANE — Vertical Timeline
  // ----------------------------------------------------------------
  memLaneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  memLaneAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memTimelineWrap: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  memTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 96,
  },
  memDateCol: {
    width: 44,
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingTop: 4,
  },
  memDayNum: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textSecondary,
    lineHeight: 30,
  },
  memMonthText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  memLineCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 8,
  },
  memDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  memConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  memEntryContent: {
    flex: 1,
    flexDirection: 'column',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
    paddingLeft: spacing.sm,
  },
  memEntryImage: {
    width: '100%',
    height: '100%',
  },
  memEntryPlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  memEntryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  memEntryOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  memEntryEmojiOverlay: {
    fontSize: 24,
    zIndex: 2,
  },
  memEntryEmoji: {
    fontSize: 28,
  },
  memEntryText: {
    flex: 1,
  },
  memEntryType: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  memEntryTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  memEntryDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  memSeeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingLeft: 60 + spacing.sm,
  },

  // ----------------------------------------------------------------
  // DATE IDEAS
  // ----------------------------------------------------------------
  dateIdeasScroll: {
    marginBottom: spacing.xl,
  },
  dateIdeasRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  dateIdeaCard: {
    width: DATE_IDEA_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  dateIdeaAccentStrip: {
    height: 0,
    width: '100%',
  },
  dateIdeaContent: {
    padding: spacing.lg,
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateIdeaTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dateIdeaCostPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  dateIdeaCostText: {
    ...typography.caption2,
    color: colors.primary,
    fontWeight: '600',
  },
  dateIdeaCategory: {
    ...typography.caption1,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },

  // ----------------------------------------------------------------
  // QUICK ACTIONS
  // ----------------------------------------------------------------
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-around',
  },
  quickActionWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  quickActionLabel: {
    ...typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 72,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Grid
  // ----------------------------------------------------------------
  familyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  familyGridItem: {
    alignItems: 'center',
    width: 64,
  },
  familyGridName: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  inviteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteRowText: {
    ...typography.subhead,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Activity Feed
  // ----------------------------------------------------------------
  activityTextWrap: {
    flex: 1,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Timeline
  // ----------------------------------------------------------------
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  timelineEmoji: {
    fontSize: 24,
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineTitle: {
    ...typography.subhead,
    color: colors.text,
  },
  timelineDate: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ----------------------------------------------------------------
  // FAMILY MODE: Polls
  // ----------------------------------------------------------------
  pollsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pollCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  pollQuestion: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pollMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollOptionCount: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  pollVoteBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  pollVoteBadgeText: {
    ...typography.caption1,
    fontWeight: '600',
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Kids Overview
  // ----------------------------------------------------------------
  kidOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  kidOverviewInfo: {
    flex: 1,
  },
  kidOverviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kidOverviewName: {
    ...typography.headline,
    color: colors.text,
  },
  kidOverviewAge: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  kidOverviewDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  kidOverviewSchool: {
    ...typography.caption1,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kidOverviewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  kidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  kidChipText: {
    ...typography.caption2,
    fontWeight: '500' as const,
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Baby Dashboard
  // ----------------------------------------------------------------
  babyLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  babyLogEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  babyLogInfo: {
    flex: 1,
  },
  babyLogType: {
    ...typography.subhead,
    color: colors.text,
    marginBottom: 2,
  },
  babyLogTime: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  babyLogNote: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 2,
  },
  babyLogDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginHorizontal: -spacing.lg,
  },
  babyLogBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'center',
  },
  babyLogBtnText: {
    ...typography.caption1,
    fontWeight: '700',
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Emma's Activities
  // ----------------------------------------------------------------
  emmaActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  emmaActivityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emmaActivityInfo: {
    flex: 1,
  },
  emmaActivityTitle: {
    ...typography.subhead,
    color: colors.text,
  },
  emmaActivityTime: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginTop: 1,
  },
  emmaTaskCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  emmaActivityCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },

  // ----------------------------------------------------------------
  // PARENTING MODE: Milestones
  // ----------------------------------------------------------------
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  milestoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneDate: {
    ...typography.caption1,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  milestoneNote: {
    ...typography.subhead,
    color: colors.text,
  },

  // ----------------------------------------------------------------
  // EMPTY HINT (reusable descriptive empty state)
  // ----------------------------------------------------------------
  emptyHintContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyHintIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyHintTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHintDesc: {
    ...typography.callout,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  emptyHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  emptyHintBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  activityRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: { flex: 1 },
  activityAction: { ...typography.subhead, color: colors.text },
  activityDetail: { ...typography.caption1, color: colors.textSecondary, marginTop: 1 },
  activityTime: { ...typography.caption2, color: colors.textTertiary },

  // ----------------------------------------------------------------
  // INSIGHT STATS (Personal Insights section in single mode)
  // ----------------------------------------------------------------
  insightStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  insightStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightStatLabel: {
    ...typography.subhead,
    color: colors.textSecondary,
    flex: 1,
  },
  insightStatValue: {
    ...typography.headline,
    fontWeight: '700',
  },
  insightViewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  insightViewMoreText: {
    ...typography.caption1,
    fontWeight: '600',
  },

  // ----------------------------------------------------------------
  // MEMORY LANE: multi-image badge + share button
  // ----------------------------------------------------------------
  memImageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memImageCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  memShareBtn: {
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    alignSelf: 'flex-start',
  },
});
