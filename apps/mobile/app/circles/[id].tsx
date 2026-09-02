import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useCircleStore } from '../../src/stores/circleStore';
import { useInviteStore } from '../../src/stores/inviteStore';
import { useModeStore } from '../../src/stores/modeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useAlert } from '../../src/components/AlertProvider';
import { apiGet } from '../../src/services/api';

const MODE_INVITE_LABELS: Record<string, { title: string; placeholder: string; description: string; maxMembers?: number }> = {
  couple: { title: 'Invite Your Partner', placeholder: "Partner's email address", description: 'Share this circle with your partner. Couples are limited to 2 people.', maxMembers: 2 },
  family: { title: 'Invite Family Members', placeholder: "Family member's email", description: 'Invite family members to join this circle.' },
  parenting: { title: 'Invite Co-Parent', placeholder: "Co-parent's email", description: 'Invite your co-parent or partner to join this circle.', maxMembers: 2 },
};

interface CircleMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function CircleDetailScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { circles, removeMember, leaveCircle } = useCircleStore();
  const { sendInvite } = useInviteStore();
  const { mode } = useModeStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const inviteLabels = MODE_INVITE_LABELS[mode];
  const canInvite = mode !== 'personal' && inviteLabels;

  const [members, setMembers] = useState<CircleMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const circle = circles.find((c) => c.id === id);
  const currentUserId = user?.id;
  const isOwner = members.some((m) => m.id === currentUserId && m.role === 'OWNER');

  const fetchMembers = () => {
    if (!id) return;
    apiGet<{ data: any[] }>(`/households/${id}/members`)
      .then((res) => {
        setMembers(
          (res.data ?? []).map((m: any) => ({
            id: m.userId ?? m.id,
            name: m.user?.name ?? m.name ?? '',
            email: m.user?.email ?? m.email ?? '',
            role: m.role ?? 'MEMBER',
          })),
        );
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMembers();
  }, [id]);

  const maxMembers = inviteLabels?.maxMembers;
  const isFull = maxMembers !== undefined && members.length >= maxMembers;

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !id) return;
    if (isFull) {
      showAlert('Circle Full', `This circle is limited to ${maxMembers} members.`);
      return;
    }
    setIsSending(true);
    const result = await sendInvite(id, { email: inviteEmail.trim() });
    setIsSending(false);

    if (result) {
      showAlert('Invite Sent', 'An invite link has been created.', [
        { text: 'Copy Link', onPress: () => shareInviteLink(result.inviteLink) },
        { text: 'OK' },
      ]);
      setInviteEmail('');
    } else {
      showAlert('Error', 'Failed to send invite.');
    }
  };

  const shareInviteLink = async (link: string) => {
    try {
      await Share.share({
        message: `Join my circle "${circle?.name}" on Sivena! ${link}`,
      });
    } catch {}
  };

  const handleShareLink = async () => {
    if (!id) return;
    setIsSending(true);
    const result = await sendInvite(id, {});
    setIsSending(false);
    if (result) {
      shareInviteLink(result.inviteLink);
    }
  };

  const handleRemoveMember = (member: CircleMember) => {
    showAlert(
      'Remove Member',
      `Are you sure you want to remove ${member.name} from this circle?`,
      [
        { text: 'Cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            if (!id) return;
            setIsRemoving(member.id);
            const success = await removeMember(id, member.id);
            setIsRemoving(null);
            if (success) {
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
            } else {
              showAlert('Error', 'Failed to remove member.');
            }
          },
        },
      ],
    );
  };

  const handleLeaveCircle = () => {
    showAlert(
      'Leave Circle',
      `Are you sure you want to leave "${circle?.name}"? You will lose access to shared content in this circle.`,
      [
        { text: 'Cancel' },
        {
          text: 'Leave',
          onPress: async () => {
            if (!id) return;
            setIsRemoving(currentUserId ?? '');
            const success = await leaveCircle(id);
            setIsRemoving(null);
            if (success) {
              router.canGoBack() ? router.back() : router.replace('/(tabs)' as any);
            } else {
              showAlert('Error', 'Failed to leave circle.');
            }
          },
        },
      ],
    );
  };

  if (!circle) {
    return (
      <View style={styles.safe}>
        <Text style={styles.emptyText}>Circle not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{circle.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Circle Info */}
        <View style={styles.infoCard}>
          <View style={[styles.circleAvatar, { backgroundColor: circle.color || colors.primary }]}>
            <Text style={styles.circleEmoji}>{circle.emoji || circle.name.charAt(0)}</Text>
          </View>
          <Text style={styles.circleName}>{circle.name}</Text>
          <Text style={styles.circleType}>
            {circle.type === 'PRIMARY' ? 'Primary Circle' : circle.type.charAt(0) + circle.type.slice(1).toLowerCase() + ' Circle'}
          </Text>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const canRemove = isOwner && !isCurrentUser;

            return (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>{member.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.name}{isCurrentUser ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.memberRole}>{member.role.toLowerCase()}</Text>
                </View>
                {canRemove && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(member)}
                    style={styles.removeBtn}
                    disabled={isRemoving === member.id}
                  >
                    {isRemoving === member.id ? (
                      <ActivityIndicator size="small" color={colors.textTertiary} />
                    ) : (
                      <Ionicons name="close-circle" size={22} color={colors.error} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Invite — hidden for single mode */}
        {canInvite && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{inviteLabels.title}</Text>
            <Text style={styles.inviteDesc}>{inviteLabels.description}</Text>
            {isFull ? (
              <View style={styles.fullNotice}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.fullNoticeText}>
                  {mode === 'couple' ? 'Your partner has been added.' : 'This circle is full.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.inviteRow}>
                  <TextInput
                    style={styles.inviteInput}
                    placeholder={inviteLabels.placeholder}
                    placeholderTextColor={colors.textTertiary}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.inviteBtn, isSending && { opacity: 0.6 }]}
                    onPress={handleInvite}
                    disabled={isSending}
                  >
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.shareLinkBtn} onPress={handleShareLink}>
                  <Ionicons name="link-outline" size={18} color={colors.primary} />
                  <Text style={styles.shareLinkText}>Share invite link</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Leave Circle — only for non-owner members */}
        {!isOwner && members.some((m) => m.id === currentUserId) && (
          <TouchableOpacity
            style={styles.leaveBtn}
            onPress={handleLeaveCircle}
            disabled={isRemoving === currentUserId}
          >
            {isRemoving === currentUserId ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={styles.leaveBtnText}>Leave Circle</Text>
              </>
            )}
          </TouchableOpacity>
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
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: 24, paddingBottom: 40 },
  infoCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  circleAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  circleEmoji: { fontSize: 28, color: '#FFFFFF' },
  circleName: { fontSize: 20, fontWeight: '700', color: colors.text },
  circleType: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: 14, fontWeight: '600', color: colors.primary },
  memberInfo: { marginLeft: spacing.sm, flex: 1 },
  memberName: { fontSize: 15, fontWeight: '500', color: colors.text },
  memberRole: { fontSize: 12, color: colors.textTertiary },
  removeBtn: {
    padding: 4,
  },
  inviteRow: { flexDirection: 'row', gap: 8 },
  inviteInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    ...shadows.sm,
  },
  inviteBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  shareLinkText: { fontSize: 14, fontWeight: '500', color: colors.primary },
  inviteDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  fullNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fullNoticeText: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.errorLight,
    backgroundColor: '#FEF2F2',
  },
  leaveBtnText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
