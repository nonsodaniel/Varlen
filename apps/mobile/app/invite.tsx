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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useHouseholdStore } from '../src/stores/householdStore';
import { apiPatch } from '../src/services/api';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EASE_OUT = Easing.out(Easing.cubic);
const DURATION = 450;

type FlowStep = 'name' | 'invite';

function isDefaultHouseholdName(name: string): boolean {
  if (!name || name === 'My Circle' || name === 'Us') return true;
  if (name.endsWith("'s Circle") || name.endsWith("& Partner") || name.endsWith("'s Family")) return true;
  return false;
}

export default function InviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const s = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { mode } = useModeStore();
  const accent = modeThemes[mode].accent;
  const accentLight = modeThemes[mode].accentLight;
  const { searchUsers, sendInvite, generateAndShare } = useInviteStore();
  const { getOwnedCircleId, getEffectiveCircleId, createCircle, fetchCircles } = useCircleStore();
  const user = useAuthStore((st) => st.user);
  const members = useHouseholdStore((st) => st.members);
  const household = useHouseholdStore((st) => st.household);
  const householdId = useHouseholdStore((st) => st.householdId);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [step, setStep] = useState<FlowStep>('name');
  const [familyName, setFamilyName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareBtnScale = useSharedValue(1);
  const shareBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareBtnScale.value }],
  }));

  // Determine if partner is already connected (for couple mode gating)
  const hasPartner = useMemo(
    () => members.some((m) => m.id !== (user?.id ?? '')),
    [members, user?.id],
  );

  // For family/parenting: auto-skip naming step if household already has a custom name
  useEffect(() => {
    if (mode === 'family' || mode === 'parenting') {
      if (household?.name) {
        setFamilyName(household.name);
        if (!isDefaultHouseholdName(household.name)) {
          setStep('invite');
        }
      }
    }
  }, [mode, household?.name]);

  useEffect(() => {
    fetchCircles();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Mode-specific UI copy
  const modeConfig = useMemo(() => {
    switch (mode) {
      case 'couple':
        return {
          title: 'Invite Your Partner',
          subtitle: 'Connect with your partner to share plans, track milestones, and stay in sync every day.',
          searchPlaceholder: 'Search for your partner by name or email...',
          shareCardTitle: 'Send a partner invite',
          shareCardSub: 'Share a private link via iMessage, WhatsApp, or any app',
        };
      case 'family':
        return {
          title: 'Invite Family',
          subtitle: 'Bring your family together to share calendars, split tasks, and keep everyone on the same page.',
          searchPlaceholder: 'Find a family member by name or email...',
          shareCardTitle: 'Share a family invite',
          shareCardSub: 'Anyone with this link can join your family space on Sivena',
        };
      case 'parenting':
        return {
          title: 'Invite Co-Parent',
          subtitle: 'Add your co-parent to track feeds, sleep, school activities, and milestones together.',
          searchPlaceholder: 'Find your co-parent by name or email...',
          shareCardTitle: 'Share an invite link',
          shareCardSub: 'Anyone with this link can join your parenting space on Sivena',
        };
      default:
        return {
          title: 'Invite Someone',
          subtitle: 'Bring the people you care about into your space.',
          searchPlaceholder: 'Find someone by name or email...',
          shareCardTitle: 'Share Invite',
          shareCardSub: 'Send a link to anyone you want to invite',
        };
    }
  }, [mode]);

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
    if (householdId) return householdId;
    await fetchCircles();
    let circleId = getOwnedCircleId();
    if (circleId) return circleId;
    const effectiveId = getEffectiveCircleId();
    if (effectiveId) return effectiveId;
    try {
      const defaultName = mode === 'couple'
        ? (user?.name ? `${user.name} & Partner` : 'Us')
        : (familyName.trim() || (user?.name ? `${user.name}'s Family` : 'Our Family'));
      const circle = await createCircle({ name: defaultName });
      return circle?.id ?? null;
    } catch {
      return null;
    }
  }, [householdId, getOwnedCircleId, getEffectiveCircleId, createCircle, fetchCircles, user?.name, mode, familyName]);

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

  const handleSaveFamilyName = useCallback(async () => {
    const trimmed = familyName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Name required', 'Please enter a name for your family space (at least 2 characters).');
      return;
    }
    setIsSavingName(true);
    try {
      const hid = householdId || (await ensureCircle());
      if (hid) {
        await apiPatch(`/households/${hid}`, { name: trimmed });
        useHouseholdStore.setState((st: any) => ({
          household: st.household ? { ...st.household, name: trimmed } : null,
        }));
      }
      setStep('invite');
    } catch {
      Alert.alert('Something went wrong', 'Could not save the name. Please try again.');
    }
    setIsSavingName(false);
  }, [familyName, householdId, ensureCircle]);

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
  }, [sentIds, sendingId, accent, handleInviteUser, colors]);

  // ── SINGLE MODE: No invites ──────────────────────────────────────────
  if (mode === 'personal') {
    return (
      <View style={s.safe}>
        <Animated.View entering={FadeInDown.duration(DURATION).easing(EASE_OUT)} style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Invites</Text>
          <View style={{ width: 32 }} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(100).duration(DURATION).easing(EASE_OUT)} style={s.gatedWrap}>
          <View style={[s.gatedIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="person-outline" size={40} color={colors.textTertiary} />
          </View>
          <Text style={s.gatedTitle}>Single mode is a solo space</Text>
          <Text style={s.gatedDesc}>
            Sivena in single mode is your personal planner — just for you. To invite people and share your life, switch to Partner, Family, or Parenting mode in your profile settings.
          </Text>
          <TouchableOpacity
            style={[s.gatedBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[s.gatedBtnText, { color: colors.textSecondary }]}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── COUPLE MODE: Partner already connected ───────────────────────────
  if (mode === 'couple' && hasPartner) {
    const partnerName = members.find((m) => m.id !== (user?.id ?? ''))?.name ?? 'your partner';
    return (
      <View style={s.safe}>
        <Animated.View entering={FadeInDown.duration(DURATION).easing(EASE_OUT)} style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Partner</Text>
          <View style={{ width: 32 }} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(100).duration(DURATION).easing(EASE_OUT)} style={s.gatedWrap}>
          <View style={[s.gatedIcon, { backgroundColor: accentLight }]}>
            <Ionicons name="heart" size={40} color={accent} />
          </View>
          <Text style={s.gatedTitle}>You're connected with {partnerName}</Text>
          <Text style={s.gatedDesc}>
            Partner mode connects two people. You and {partnerName} are already linked on Sivena.{'\n\n'}To add more people, switch to Family mode in your profile settings.
          </Text>
          <TouchableOpacity
            style={[s.gatedBtn, { backgroundColor: accentLight }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[s.gatedBtnText, { color: accent }]}>Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── FAMILY / PARENTING: Step 1 — Name your space ────────────────────
  if ((mode === 'family' || mode === 'parenting') && step === 'name') {
    const spaceLabel = mode === 'parenting' ? 'parenting space' : 'family';
    const namePlaceholder = mode === 'parenting'
      ? 'e.g. The Johnsons, Our Family...'
      : 'e.g. The Smiths, Johnson Family...';
    const stepTitle = mode === 'parenting' ? 'Name Your Space' : 'Name Your Family';

    return (
      <View style={s.safe}>
        <Animated.View entering={FadeInDown.duration(DURATION).easing(EASE_OUT)} style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>{stepTitle}</Text>
          <View style={{ width: 32 }} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(DURATION).easing(EASE_OUT)} style={s.subtitleWrap}>
          <Text style={s.subtitle}>
            Give your {spaceLabel} a name before inviting anyone. This is how it will appear to everyone you invite.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(DURATION).easing(EASE_OUT)} style={s.searchWrap}>
          <Ionicons name="people-outline" size={18} color={colors.textTertiary} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder={namePlaceholder}
            placeholderTextColor={colors.textTertiary}
            value={familyName}
            onChangeText={setFamilyName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSaveFamilyName}
            autoFocus
          />
          {familyName.length > 0 && (
            <TouchableOpacity onPress={() => setFamilyName('')} style={s.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(200).duration(DURATION).easing(EASE_OUT)}
          style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}
        >
          <TouchableOpacity
            style={[
              s.continueBtn,
              { backgroundColor: familyName.trim().length >= 2 ? accent : colors.border },
            ]}
            onPress={handleSaveFamilyName}
            disabled={isSavingName || familyName.trim().length < 2}
            activeOpacity={0.8}
          >
            {isSavingName ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={s.continueBtnText}>Continue to Invite</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── INVITE SCREEN (couple with no partner / family+parenting after naming) ──
  return (
    <View style={s.safe}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(DURATION).easing(EASE_OUT)} style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => {
            if ((mode === 'family' || mode === 'parenting') && step === 'invite') {
              setStep('name');
            } else {
              router.back();
            }
          }}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{modeConfig.title}</Text>
        <View style={{ width: 32 }} />
      </Animated.View>

      {/* Subtitle */}
      <Animated.View entering={FadeInDown.delay(80).duration(DURATION).easing(EASE_OUT)} style={s.subtitleWrap}>
        <Text style={s.subtitle}>{modeConfig.subtitle}</Text>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(140).duration(DURATION).easing(EASE_OUT)} style={s.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textTertiary} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder={modeConfig.searchPlaceholder}
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
              <Text style={s.emptyHint}>Try a different name or share an invite link instead</Text>
            </Animated.View>
          ) : null
        }
        ListFooterComponent={
          <View style={s.footerSection}>
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or share an invite link</Text>
              <View style={s.dividerLine} />
            </View>

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
                  {isSharing ? 'Preparing invite...' : modeConfig.shareCardTitle}
                </Text>
                <Text style={s.shareCardSub}>
                  {isSharing ? 'Just a moment' : modeConfig.shareCardSub}
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
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
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

  // Gated screens (single / couple-connected)
  gatedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  gatedIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  gatedTitle: {
    ...typography.title2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  gatedDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  gatedBtn: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  gatedBtnText: {
    ...typography.headline,
    fontWeight: '600',
  },

  // Continue button (family name step)
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
  },
  continueBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '600',
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
