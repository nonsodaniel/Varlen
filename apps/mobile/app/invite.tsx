import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Share,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
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
import { colors, spacing, radius, shadows, typography } from '../src/constants/theme';
import { useModeStore } from '../src/stores/modeStore';

const EASE_OUT = Easing.out(Easing.cubic);
const DURATION = 450;
import { modeThemes } from '../src/constants/theme';
import { useInviteStore, SearchUser } from '../src/stores/inviteStore';
import { useCircleStore } from '../src/stores/circleStore';
import { useAuthStore } from '../src/stores/authStore';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function InviteScreen() {
  const router = useRouter();
  const { mode } = useModeStore();
  const accent = modeThemes[mode].accent;
  const accentLight = modeThemes[mode].accentLight;
  const { searchUsers, sendInvite } = useInviteStore();
  const { getOwnedCircleId, getEffectiveCircleId, createCircle, fetchCircles } = useCircleStore();
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated values
  const linkPulse = useSharedValue(1);
  const generateBtnScale = useSharedValue(1);

  useEffect(() => {
    fetchCircles();
  }, []);

  // Gentle pulse on the link card when it appears
  useEffect(() => {
    if (inviteLink) {
      linkPulse.value = withSequence(
        withTiming(1.01, { duration: 200, easing: EASE_OUT }),
        withTiming(1, { duration: 300, easing: EASE_OUT }),
      );
    }
  }, [inviteLink]);

  const linkCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: linkPulse.value }],
  }));

  const generateBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: generateBtnScale.value }],
  }));

  const isPartnerMode = mode === 'couple';

  const inviteMessage = (() => {
    switch (mode) {
      case 'couple':
        return "I'd love for you to join me on Sivena! Let's plan and stay in sync together.";
      case 'family':
        return "Come join our family circle on Sivena! It'll help us all stay connected.";
      case 'parenting':
        return "Join our family on Sivena! We can coordinate schedules, tasks and milestones together.";
      default:
        return "I'd love for you to join my circle on Sivena! Let's stay connected.";
    }
  })();

  const screenTitle = isPartnerMode ? 'Invite Your Partner' : 'Invite Someone';
  const screenSubtitle = isPartnerMode
    ? 'Find your partner so you can plan and stay in sync together'
    : 'Bring the people you care about into your circle';
  const searchPlaceholder = isPartnerMode
    ? 'Find your partner by name or email...'
    : 'Find someone by name or email...';
  const linkSubtext = isPartnerMode
    ? 'Share this link with your partner to connect'
    : 'Anyone with this link can join your circle';
  const emptyHintText = isPartnerMode
    ? 'Try a different name or share a link instead'
    : 'Try a different name or share a link instead';

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
    // First try circles where user can invite (OWNER/ADMIN/PARTNER)
    let circleId = getOwnedCircleId();
    if (circleId) return circleId;

    // Fall back to the user's primary/any circle
    const effectiveId = getEffectiveCircleId();
    if (effectiveId) return effectiveId;

    // No circles at all — auto-create one behind the scenes
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

  const handleGenerateLink = useCallback(async () => {
    setGeneratingLink(true);
    generateBtnScale.value = withSequence(
      withTiming(0.97, { duration: 120, easing: EASE_OUT }),
      withTiming(1, { duration: 200, easing: EASE_OUT }),
    );
    try {
      const circleId = await ensureCircle();
      if (!circleId) {
        Alert.alert('Something went wrong', "We couldn't get things set up. Please try again.");
        setGeneratingLink(false);
        return;
      }

      const invite = await sendInvite(circleId, {});

      if (invite?.inviteLink) {
        setInviteLink(invite.inviteLink);
        setGeneratingLink(false);
        return;
      }
      Alert.alert("Couldn't create link", 'Please check your connection and try again.');
    } catch {
      Alert.alert('Oops', 'Something went wrong. Please try again.');
    }
    setGeneratingLink(false);
  }, [ensureCircle, sendInvite]);

  const handleShareLink = useCallback(async () => {
    if (inviteLink) {
      await Share.share({ message: `${inviteMessage}\n\n${inviteLink}` });
    }
  }, [inviteLink, inviteMessage]);

  const handleCopyLink = useCallback(async () => {
    if (inviteLink) {
      await Clipboard.setStringAsync(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [inviteLink]);

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

      {/* Friendly subtitle */}
      <Animated.View entering={FadeInDown.delay(80).duration(DURATION).easing(EASE_OUT)} style={s.subtitleWrap}>
        <Text style={s.subtitle}>
          {screenSubtitle}
        </Text>
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
              <Text style={s.emptyHint}>{emptyHintText}</Text>
            </Animated.View>
          ) : null
        }
        ListFooterComponent={
          <View style={s.footerSection}>
            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or share a link</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Invite Link Section */}
            {!inviteLink ? (
              <AnimatedTouchable
                entering={FadeInUp.delay(180).duration(DURATION).easing(EASE_OUT)}
                style={[s.shareLinkCard, generateBtnStyle]}
                onPress={handleGenerateLink}
                activeOpacity={0.8}
                disabled={generatingLink}
              >
                <View style={[s.shareLinkIcon, { backgroundColor: accentLight }]}>
                  {generatingLink ? (
                    <ActivityIndicator size="small" color={accent} />
                  ) : (
                    <Ionicons name="link-outline" size={22} color={accent} />
                  )}
                </View>
                <View style={s.shareLinkInfo}>
                  <Text style={s.shareLinkTitle}>
                    {generatingLink ? 'Creating your link...' : 'Create invite link'}
                  </Text>
                  <Text style={s.shareLinkSub}>
                    {generatingLink ? 'Just a moment' : linkSubtext}
                  </Text>
                </View>
                {!generatingLink && (
                  <View style={[s.generateArrow, { backgroundColor: accentLight }]}>
                    <Ionicons name="arrow-forward" size={16} color={accent} />
                  </View>
                )}
              </AnimatedTouchable>
            ) : (
              <Animated.View
                entering={FadeInUp.duration(DURATION).easing(EASE_OUT)}
                style={[s.linkResultCard, linkCardStyle]}
              >
                {/* Success header */}
                <View style={s.linkHeader}>
                  <View style={[s.successIcon]}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  </View>
                  <View>
                    <Text style={s.linkReadyText}>Link ready to share!</Text>
                    <Text style={s.linkReadySub}>Expires in 7 days</Text>
                  </View>
                </View>

                {/* Link display */}
                <View style={s.linkBox}>
                  <Ionicons name="link" size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
                  <Text style={s.linkText} numberOfLines={1} ellipsizeMode="middle">
                    {inviteLink}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={s.linkActions}>
                  <TouchableOpacity
                    style={[
                      s.linkActionBtn,
                      {
                        backgroundColor: copied ? colors.success : colors.background,
                        borderWidth: copied ? 0 : 1,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleCopyLink}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={copied ? '#FFFFFF' : colors.text}
                    />
                    <Text style={[s.linkActionText, { color: copied ? '#FFFFFF' : colors.text }]}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.linkActionBtn, { backgroundColor: accent }]}
                    onPress={handleShareLink}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                    <Text style={[s.linkActionText, { color: '#FFFFFF' }]}>Share</Text>
                  </TouchableOpacity>
                </View>

                {/* Regenerate */}
                <TouchableOpacity
                  style={s.newLinkBtn}
                  onPress={handleGenerateLink}
                  disabled={generatingLink}
                  activeOpacity={0.7}
                >
                  {generatingLink ? (
                    <ActivityIndicator size="small" color={accent} />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={14} color={accent} />
                      <Text style={[s.newLinkText, { color: accent }]}>Generate a new link</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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

  // Generate link card
  shareLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  shareLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkInfo: { flex: 1, marginLeft: spacing.md },
  shareLinkTitle: { ...typography.headline, color: colors.text, fontSize: 15 },
  shareLinkSub: { ...typography.footnote, color: colors.textSecondary, marginTop: 3 },
  generateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Link result card
  linkResultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIcon: {
    marginRight: spacing.md,
  },
  linkReadyText: {
    ...typography.headline,
    color: colors.text,
    fontSize: 16,
  },
  linkReadySub: {
    ...typography.footnote,
    color: colors.textTertiary,
    marginTop: 1,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  linkText: {
    flex: 1,
    ...typography.callout,
    color: colors.textSecondary,
    fontFamily: undefined,
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linkActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  linkActionText: {
    ...typography.subhead,
    fontSize: 14,
  },
  newLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  newLinkText: {
    ...typography.footnote,
    fontWeight: '600',
  },
});
