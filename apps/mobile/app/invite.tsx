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
import { colors, spacing, radius, shadows, typography } from '../src/constants/theme';
import { useModeStore } from '../src/stores/modeStore';
import { modeThemes } from '../src/constants/theme';
import { useInviteStore, SearchUser } from '../src/stores/inviteStore';
import { useCircleStore } from '../src/stores/circleStore';
import { useAuthStore } from '../src/stores/authStore';

export default function InviteScreen() {
  const router = useRouter();
  const { mode } = useModeStore();
  const accent = modeThemes[mode].accent;
  const { searchUsers, sendInvite } = useInviteStore();
  const { getOwnedCircleId, createCircle, fetchCircles } = useCircleStore();
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCircles();
  }, []);

  const inviteMessage = (() => {
    switch (mode) {
      case 'couple':
        return 'Join me on Sivena so we can plan, share, and stay in sync together!';
      case 'family':
        return "Join our family circle on Sivena! Let's keep everyone in the loop.";
      case 'parenting':
        return 'Join our family on Sivena to coordinate schedules, tasks, and milestones!';
      default:
        return "Join my circle on Sivena! Let's stay connected.";
    }
  })();

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
    // Refresh circles to get latest roles
    await fetchCircles();
    // Find a circle the user can invite from (OWNER/ADMIN/PARTNER)
    let circleId = getOwnedCircleId();
    if (!circleId) {
      try {
        const circle = await createCircle({
          name: user?.name ? `${user.name}'s Circle` : 'My Circle',
        });
        circleId = circle?.id ?? null;
      } catch {
        return null;
      }
    }
    return circleId;
  }, [getOwnedCircleId, createCircle, fetchCircles, user?.name]);

  const handleInviteUser = useCallback(async (targetUser: SearchUser) => {
    setSendingId(targetUser.id);
    try {
      let circleId = await ensureCircle();
      if (!circleId) {
        Alert.alert('Unable to invite', 'Could not find or create a circle. Please try again.');
        setSendingId(null);
        return;
      }

      let invite = await sendInvite(circleId, { userId: targetUser.id });

      // Retry with a fresh circle if permission failed
      if (!invite) {
        const newCircle = await createCircle({
          name: user?.name ? `${user.name}'s Circle` : 'My Circle',
        });
        if (newCircle?.id) {
          invite = await sendInvite(newCircle.id, { userId: targetUser.id });
        }
      }

      if (invite) {
        setSentIds((prev) => new Set(prev).add(targetUser.id));
      } else {
        Alert.alert('Invite failed', 'Could not send the invite. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
    setSendingId(null);
  }, [ensureCircle, sendInvite, createCircle, user?.name]);

  const handleGenerateLink = useCallback(async () => {
    setGeneratingLink(true);
    try {
      let circleId = await ensureCircle();
      if (!circleId) {
        Alert.alert('Unable to generate link', 'Could not find or create a circle. Please try again.');
        setGeneratingLink(false);
        return;
      }

      // Try generating invite link
      let invite = await sendInvite(circleId, {});

      // If first attempt failed (likely permission issue), create own circle and retry
      if (!invite) {
        const newCircle = await createCircle({
          name: user?.name ? `${user.name}'s Circle` : 'My Circle',
        });
        if (newCircle?.id) {
          invite = await sendInvite(newCircle.id, {});
        }
      }

      if (invite?.inviteLink) {
        setInviteLink(invite.inviteLink);
        setGeneratingLink(false);
        return;
      }
      Alert.alert('Link generation failed', 'Could not generate an invite link. Please try again.');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
    setGeneratingLink(false);
  }, [ensureCircle, sendInvite, createCircle, user?.name]);

  const handleShareLink = useCallback(async () => {
    if (inviteLink) {
      await Share.share({ message: `${inviteMessage} ${inviteLink}` });
    }
  }, [inviteLink, inviteMessage]);

  const renderUser = useCallback(({ item }: { item: SearchUser }) => {
    const isSent = sentIds.has(item.id);
    const isSending = sendingId === item.id;
    const initials = item.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <View style={s.userRow}>
        <View style={[s.avatar, { backgroundColor: item.color || colors.primary }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={s.userInfo}>
          <Text style={s.userName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.userEmail} numberOfLines={1}>{item.email}</Text>
        </View>
        {isSent ? (
          <View style={[s.sentBadge, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark" size={16} color={colors.success} />
            <Text style={[s.sentText, { color: colors.success }]}>Sent</Text>
          </View>
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
    );
  }, [sentIds, sendingId, accent, handleInviteUser]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Invite</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textTertiary} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or email..."
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
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={s.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          searching ? (
            <View style={s.statusWrap}>
              <ActivityIndicator size="small" color={accent} />
            </View>
          ) : query.length >= 2 && results.length === 0 ? (
            <View style={s.statusWrap}>
              <Ionicons name="search-outline" size={24} color={colors.textTertiary} />
              <Text style={s.emptyText}>No users found for "{query}"</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={s.footerSection}>
            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>OR</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Invite Link Section */}
            {!inviteLink ? (
              <TouchableOpacity
                style={s.shareLinkCard}
                onPress={handleGenerateLink}
                activeOpacity={0.7}
                disabled={generatingLink}
              >
                <View style={[s.shareLinkIcon, { backgroundColor: accent + '15' }]}>
                  <Ionicons name="link-outline" size={22} color={accent} />
                </View>
                <View style={s.shareLinkInfo}>
                  <Text style={s.shareLinkTitle}>Generate invite link</Text>
                  <Text style={s.shareLinkSub}>Create a link anyone can use to join</Text>
                </View>
                {generatingLink ? (
                  <ActivityIndicator size="small" color={accent} />
                ) : (
                  <Ionicons name="add-circle-outline" size={22} color={accent} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={s.linkResultCard}>
                <View style={s.linkHeader}>
                  <View style={[s.shareLinkIcon, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                  <Text style={s.linkReadyText}>Invite link ready</Text>
                </View>

                {/* Link display */}
                <View style={s.linkBox}>
                  <Text style={s.linkText} numberOfLines={1}>{inviteLink}</Text>
                </View>

                {/* Action buttons */}
                <View style={s.linkActions}>
                  <TouchableOpacity
                    style={[s.linkActionBtn, { backgroundColor: accent }]}
                    onPress={handleShareLink}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={16} color="#FFFFFF" />
                    <Text style={s.linkActionText}>Share link</Text>
                  </TouchableOpacity>
                </View>

                {/* Generate new link */}
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
                      <Text style={[s.newLinkText, { color: accent }]}>Generate new link</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
    paddingVertical: spacing.sm,
  },
  backBtn: { padding: 4 },
  title: {
    flex: 1,
    textAlign: 'center',
    ...typography.title2,
    color: colors.text,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.subhead,
    color: '#FFFFFF',
  },
  userInfo: { flex: 1, marginLeft: spacing.md },
  userName: { ...typography.headline, color: colors.text },
  userEmail: { ...typography.footnote, color: colors.textSecondary, marginTop: 1 },
  inviteBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  statusWrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },

  // Footer
  footerSection: { paddingTop: spacing.lg, paddingBottom: spacing['3xl'] },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...typography.subhead,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },

  // Generate link card (before link is generated)
  shareLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  shareLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkInfo: { flex: 1, marginLeft: spacing.md },
  shareLinkTitle: { ...typography.headline, color: colors.text },
  shareLinkSub: { ...typography.footnote, color: colors.textSecondary, marginTop: 2 },

  // Link result card (after link is generated)
  linkResultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  linkReadyText: {
    ...typography.headline,
    color: colors.text,
    marginLeft: spacing.md,
  },
  linkBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  linkText: {
    ...typography.callout,
    color: colors.textSecondary,
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
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  linkActionText: {
    ...typography.subhead,
    color: '#FFFFFF',
  },
  newLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  newLinkText: {
    ...typography.footnote,
    fontWeight: '600',
  },
});
