import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { spacing, radius, typography, modeThemes } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useModeStore } from '../src/stores/modeStore';
import { useInviteStore, SearchUser } from '../src/stores/inviteStore';
import { useCircleStore } from '../src/stores/circleStore';
import { useAuthStore } from '../src/stores/authStore';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EASE_OUT = Easing.out(Easing.cubic);
const DURATION = 450;

export default function InviteScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const s = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { mode } = useModeStore();
  const accent = modeThemes[mode].accent;
  const accentLight = modeThemes[mode].accentLight;
  const { searchUsers, sendInvite, generateAndShare } = useInviteStore();
  const { getOwnedCircleId, getEffectiveCircleId, createCircle, fetchCircles } = useCircleStore();
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareBtnScale = useSharedValue(1);

  const shareBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareBtnScale.value }],
  }));

  useEffect(() => {
    fetchCircles();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const isPartnerMode = mode === 'couple';

  const screenTitle = isPartnerMode ? 'Invite Your Partner' : 'Invite Someone';
  const screenSubtitle = isPartnerMode
    ? 'Find your partner so you can plan and stay in sync together'
    : 'Bring the people you care about into your circle';
  const searchPlaceholder = isPartnerMode
    ? 'Find your partner by name or email...'
    : 'Find someone by name or email...';

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const users = await searchUsers(text.trim());
      setResults(users);
      setSearching(false);
    }, 400);
  }, [searchUsers]);

  const ensureCircle = useCallback(async (): Promise<string | null> => {
    await fetchCircles();
    let circleId = getOwnedCircleId();
    if (circleId) return circleId;

    const effectiveId = getEffectiveCircleId();
    if (effectiveId) return effectiveId;

    try {
      const defaultName = isPartnerMode
        ? (user?.name ? `${user.name} & Partner` : 'Us')
        : (user?.name ? `${user.name}'s Circle` : 'My Circle');
      const circle = await createCircle({ name: defaultName });
      return circle?.id ?? null;
    } catch {
      return null;
    }
  }, [getOwnedCircleId, getEffectiveCircleId, createCircle, fetchCircles, user?.name, isPartnerMode]);

  const handleInviteUser = useCallback(async (targetUser: SearchUser) => {
    setSendingId(targetUser.id);
    try {
      const circleId = await ensureCircle();
      if (!circleId) {
        Alert.alert('Something went wrong', "We couldn't get things set up. Please try again.");
        setSendingId(null);
        return;
      }

      const invite = await sendInvite(circleId, { userId: targetUser.id });

      if (invite) {
        setSentIds((prev) => new Set(prev).add(targetUser.id));
      } else {
        Alert.alert('Invite not sent', "We couldn't deliver that invite right now. Please try again.");
      }
    } catch {
      Alert.alert('Oops', 'Something went wrong. Please try again.');
    }
    setSendingId(null);
  }, [ensureCircle, sendInvite]);

  const handleShareInvite = useCallback(async () => {
    Keyboard.dismiss();
    setIsSharing(true);
    shareBtnScale.value = withSequence(
      withTiming(0.97, { duration: 120, easing: EASE_OUT }),
      withTiming(1, { duration: 200, easing: EASE_OUT }),
    );
    try {
      const circleId = await ensureCircle();
      if (!circleId) {
        Alert.alert('Something went wrong', "We couldn't get things set up. Please try again.");
        setIsSharing(false);
        return;
      }

      const shared = await generateAndShare(circleId, mode);
      if (!shared) {
        Alert.alert("Couldn't create invite", 'Please check your connection and try again.');
      }
    } catch {
      Alert.alert('Oops', 'Something went wrong. Please try again.');
    }
    setIsSharing(false);
  }, [ensureCircle, generateAndShare, mode]);

  const renderUser = useCallback(({ item, index }: { item: SearchUser; index: number }) => {
    const isSent = sentIds.has(item.id);
    const isSending = sendingId === item.id;
    const initials = item.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(DURATION).easing(EASE_OUT)}>
        <View style={s.userRow}>
          <View style={[s.avatar, { backgroundColor: item.color || colors.primary }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.userInfo}>
            <Text style={s.userName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
          {isSent ? (
            <Animated.View entering={FadeIn.duration(DURATION).easing(EASE_OUT)} style={[s.sentBadge, { backgroundColor: colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[s.sentText, { color: colors.success }]}>Sent</Text>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={[s.inviteBtn, { backgroundColor: accent }]}
              onPress={() => handleInviteUser(item)}
              disabled={isSending}
              activeOpacity={0.7}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.inviteBtnText}>Invite</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  }, [sentIds, sendingId, accent, handleInviteUser]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(DURATION).easing(EASE_OUT)} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{screenTitle}</Text>
        <View style={{ width: 32 }} />
      </Animated.View>

      {/* Subtitle */}
      <Animated.View entering={FadeInDown.delay(80).duration(DURATION).easing(EASE_OUT)} style={s.subtitleWrap}>
        <Text style={s.subtitle}>{screenSubtitle}</Text>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(140).duration(DURATION).easing(EASE_OUT)} style={s.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textTertiary} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={s.clearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          searching ? (
            <Animated.View entering={FadeIn.duration(DURATION).easing(EASE_OUT)} style={s.statusWrap}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={s.searchingText}>Searching...</Text>
            </Animated.View>
          ) : query.length >= 2 && results.length === 0 ? (
            <Animated.View entering={FadeIn.duration(DURATION).easing(EASE_OUT)} style={s.statusWrap}>
              <Ionicons name="people-outline" size={28} color={colors.textTertiary} />
              <Text style={s.emptyText}>No one found for "{query}"</Text>
              <Text style={s.emptyHint}>Try a different name or share an invite instead</Text>
            </Animated.View>
          ) : null
        }
        ListFooterComponent={
          <View style={s.footerSection}>
            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or share an invite</Text>
              <View style={s.dividerLine} />
            </View>

            {/* One-tap share card */}
            <AnimatedTouchable
              entering={FadeInUp.delay(180).duration(DURATION).easing(EASE_OUT)}
              style={[s.shareCard, shareBtnStyle]}
              onPress={handleShareInvite}
              activeOpacity={0.8}
              disabled={isSharing}
            >
              <View style={[s.shareCardIcon, { backgroundColor: accentLight }]}>
                {isSharing ? (
                  <ActivityIndicator size="small" color={accent} />
                ) : (
                  <Ionicons name="paper-plane-outline" size={22} color={accent} />
                )}
              </View>
              <View style={s.shareCardInfo}>
                <Text style={s.shareCardTitle}>
                  {isSharing ? 'Preparing invite...' : 'Share Invite'}
                </Text>
                <Text style={s.shareCardSub}>
                  {isSharing
                    ? 'Just a moment'
                    : isPartnerMode
                      ? 'Send a link via message or any app'
                      : 'Send a link to anyone you want to invite'}
                </Text>
              </View>
              {!isSharing && (
                <View style={[s.shareCardArrow, { backgroundColor: accentLight }]}>
                  <Ionicons name="arrow-forward" size={16} color={accent} />
                </View>
              )}
            </AnimatedTouchable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backBtn: { padding: 4 },
  title: {
    flex: 1,
    textAlign: 'center',
    ...typography.title2,
    color: colors.text,
  },
  subtitleWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    height: 48,
    ...shadows.sm,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  clearBtn: { padding: 4 },

  // Results list
  listContent: { paddingHorizontal: spacing.lg },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontSize: 14,
  },
  userInfo: { flex: 1, marginLeft: spacing.md },
  userName: { ...typography.headline, color: colors.text, fontSize: 15 },
  userEmail: { ...typography.footnote, color: colors.textSecondary, marginTop: 2 },
  inviteBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
    minWidth: 72,
    alignItems: 'center',
  },
  inviteBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  sentText: { ...typography.subhead },

  // Status
  statusWrap: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.sm },
  searchingText: { ...typography.callout, color: colors.textSecondary },
  emptyText: { ...typography.body, color: colors.textSecondary },
  emptyHint: { ...typography.footnote, color: colors.textTertiary },

  // Footer
  footerSection: { paddingTop: spacing.xl, paddingBottom: spacing['3xl'] },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...typography.footnote,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
    textTransform: 'lowercase',
  },

  // Share card
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  shareCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardInfo: { flex: 1, marginLeft: spacing.md },
  shareCardTitle: { ...typography.headline, color: colors.text, fontSize: 15 },
  shareCardSub: { ...typography.footnote, color: colors.textSecondary, marginTop: 3 },
  shareCardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
