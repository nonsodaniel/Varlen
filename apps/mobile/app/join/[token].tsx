import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius, shadows } from '../../src/constants/theme';
import { useInviteStore } from '../../src/stores/inviteStore';
import { useCircleStore } from '../../src/stores/circleStore';
import { useAuthStore } from '../../src/stores/authStore';

export default function JoinCircleScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { isAuthenticated } = useAuthStore();
  const { getInviteByToken, acceptInvite } = useInviteStore();
  const { fetchCircles } = useCircleStore();

  const [invite, setInvite] = useState<{
    circle: { id: string; name: string; emoji?: string; color?: string };
    role: string;
    expired: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      getInviteByToken(token).then((data) => {
        setInvite(data);
        setIsLoading(false);
      });
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    const result = await acceptInvite(token);
    setIsAccepting(false);

    if (result) {
      setAccepted(true);
      await fetchCircles();
    }
  };

  const handleDecline = () => {
    router.back();
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="log-in-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.messageTitle}>Sign in Required</Text>
          <Text style={styles.messageSubtext}>
            Please sign in or create an account to join this circle.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!invite) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="close-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.messageTitle}>Invite Not Found</Text>
          <Text style={styles.messageSubtext}>This invite link may be invalid or expired.</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.secondaryBtnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (invite.expired) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="time-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.messageTitle}>Invite Expired</Text>
          <Text style={styles.messageSubtext}>
            This invite has expired. Ask the circle admin to send a new one.
          </Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.secondaryBtnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (accepted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <View style={[styles.bigCircle, { backgroundColor: invite.circle.color || colors.primary }]}>
            <Text style={styles.bigEmoji}>{invite.circle.emoji || '\u2705'}</Text>
          </View>
          <Text style={styles.messageTitle}>You're In!</Text>
          <Text style={styles.messageSubtext}>
            You've joined "{invite.circle.name}" successfully.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <View style={[styles.bigCircle, { backgroundColor: invite.circle.color || colors.primary }]}>
          <Text style={styles.bigEmoji}>{invite.circle.emoji || invite.circle.name.charAt(0)}</Text>
        </View>
        <Text style={styles.messageTitle}>Join Circle</Text>
        <Text style={styles.circleName}>{invite.circle.name}</Text>
        <Text style={styles.messageSubtext}>
          You've been invited to join as {invite.role.toLowerCase()}.
        </Text>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleDecline}>
            <Text style={styles.secondaryBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, isAccepting && { opacity: 0.6 }]}
            onPress={handleAccept}
            disabled={isAccepting}
          >
            <Text style={styles.primaryBtnText}>
              {isAccepting ? 'Joining...' : 'Accept & Join'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  bigCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bigEmoji: { fontSize: 36, color: '#FFFFFF' },
  messageTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  circleName: { fontSize: 18, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  messageSubtext: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  btnRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  secondaryBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: colors.text },
});
