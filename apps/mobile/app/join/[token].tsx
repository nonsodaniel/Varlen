import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, radius, shadows, typography } from '../../src/constants/theme';
import { useInviteStore } from '../../src/stores/inviteStore';
import { useCircleStore } from '../../src/stores/circleStore';
import { useAuthStore } from '../../src/stores/authStore';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EASE_OUT = Easing.out(Easing.cubic);
const DURATION = 500;

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

  const acceptBtnScale = useSharedValue(1);

  const acceptBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: acceptBtnScale.value }],
  }));

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
    acceptBtnScale.value = withSequence(
      withTiming(0.97, { duration: 120, easing: EASE_OUT }),
      withTiming(1, { duration: 200, easing: EASE_OUT }),
    );
    setIsAccepting(true);
    try {
      const result = await acceptInvite(token);
      if (result) {
        setAccepted(true);
        await fetchCircles();
      } else {
        Alert.alert('Unable to join', 'Could not accept the invite. Please try again.');
      }
    } catch {
      Alert.alert('Oops', 'Something went wrong. Please check your connection and try again.');
    }
    setIsAccepting(false);
  };

  const handleDecline = () => {
    router.back();
  };

  // --- Not authenticated ---
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Animated.View entering={FadeIn.duration(DURATION).easing(EASE_OUT)} style={s.iconCircle}>
            <Ionicons name="log-in-outline" size={32} color={colors.primary} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(100).duration(DURATION).easing(EASE_OUT)} style={s.stateTitle}>
            Sign in to continue
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(180).duration(DURATION).easing(EASE_OUT)} style={s.stateSubtext}>
            You'll need an account to join. It only takes a moment.
          </Animated.Text>
          <AnimatedTouchable
            entering={FadeInUp.delay(260).duration(DURATION).easing(EASE_OUT)}
            style={s.primaryBtn}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={s.primaryBtnText}>Sign In</Text>
          </AnimatedTouchable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Animated.View entering={FadeIn.duration(400).easing(EASE_OUT)}>
            <ActivityIndicator size="large" color={colors.primary} />
          </Animated.View>
          <Animated.Text entering={FadeIn.delay(200).duration(DURATION).easing(EASE_OUT)} style={[s.stateSubtext, { marginTop: 16 }]}>
            Looking up your invite...
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Invite not found ---
  if (!invite) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Animated.View entering={FadeIn.duration(DURATION).easing(EASE_OUT)} style={[s.iconCircle, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="search-outline" size={32} color={colors.error} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(100).duration(DURATION).easing(EASE_OUT)} style={s.stateTitle}>
            Invite not found
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(180).duration(DURATION).easing(EASE_OUT)} style={s.stateSubtext}>
            This link may be invalid or no longer active. Ask the person who shared it to send a new one.
          </Animated.Text>
          <AnimatedTouchable
            entering={FadeInUp.delay(260).duration(DURATION).easing(EASE_OUT)}
            style={s.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={s.secondaryBtnText}>Go Home</Text>
          </AnimatedTouchable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Invite expired ---
  if (invite.expired) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Animated.View entering={FadeIn.duration(DURATION).easing(EASE_OUT)} style={[s.iconCircle, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="time-outline" size={32} color={colors.warning} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(100).duration(DURATION).easing(EASE_OUT)} style={s.stateTitle}>
            This invite has expired
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(180).duration(DURATION).easing(EASE_OUT)} style={s.stateSubtext}>
            No worries — just ask them to send you a fresh link.
          </Animated.Text>
          <AnimatedTouchable
            entering={FadeInUp.delay(260).duration(DURATION).easing(EASE_OUT)}
            style={s.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={s.secondaryBtnText}>Go Home</Text>
          </AnimatedTouchable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Accepted! ---
  if (accepted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Animated.View
            entering={FadeIn.delay(80).duration(DURATION).easing(EASE_OUT)}
            style={[s.bigCircle, { backgroundColor: invite.circle.color || colors.primary }]}
          >
            <Text style={s.bigEmoji}>{invite.circle.emoji || '\u2705'}</Text>
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200).duration(DURATION).easing(EASE_OUT)} style={s.stateTitle}>
            You're in!
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300).duration(DURATION).easing(EASE_OUT)} style={s.stateSubtext}>
            Welcome to "{invite.circle.name}". You're all set to get started.
          </Animated.Text>
          <AnimatedTouchable
            entering={FadeInUp.delay(400).duration(DURATION).easing(EASE_OUT)}
            style={s.primaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={s.primaryBtnText}>Let's Go</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </AnimatedTouchable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main: invite preview + accept/decline ---
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.center}>
        <Animated.View
          entering={FadeIn.duration(DURATION).easing(EASE_OUT)}
          style={[s.bigCircle, { backgroundColor: invite.circle.color || colors.primary }]}
        >
          <Text style={s.bigEmoji}>{invite.circle.emoji || invite.circle.name.charAt(0)}</Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(120).duration(DURATION).easing(EASE_OUT)} style={s.stateTitle}>
          You're invited!
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(200).duration(DURATION).easing(EASE_OUT)} style={s.inviteCard}>
          <Text style={s.circleName}>{invite.circle.name}</Text>
          <View style={s.roleRow}>
            <View style={s.roleBadge}>
              <Ionicons name="person-outline" size={12} color={colors.primary} />
              <Text style={s.roleText}>{invite.role.toLowerCase()}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(300).duration(DURATION).easing(EASE_OUT)} style={s.stateSubtext}>
          Accept the invite and start collaborating together.
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(380).duration(DURATION).easing(EASE_OUT)} style={s.btnRow}>
          <TouchableOpacity style={s.declineBtn} onPress={handleDecline} activeOpacity={0.7}>
            <Text style={s.declineBtnText}>Not now</Text>
          </TouchableOpacity>
          <AnimatedTouchable
            style={[s.acceptBtn, isAccepting && { opacity: 0.7 }, acceptBtnStyle]}
            onPress={handleAccept}
            disabled={isAccepting}
            activeOpacity={0.8}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={s.acceptBtnText}>Accept & Join</Text>
              </>
            )}
          </AnimatedTouchable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  // Icon circle for state screens
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  // Big circle for invite/accepted
  bigCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...shadows.md,
  },
  bigEmoji: { fontSize: 40, color: '#FFFFFF' },

  // Text
  stateTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  stateSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  // Invite card
  inviteCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.sm,
  },
  circleName: {
    ...typography.title3,
    color: colors.text,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  roleText: {
    ...typography.footnote,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  declineBtnText: {
    ...typography.subhead,
    color: colors.textSecondary,
    fontSize: 15,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  acceptBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontSize: 16,
  },

  // Generic buttons for state screens
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  primaryBtnText: {
    ...typography.subhead,
    color: '#FFFFFF',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  secondaryBtnText: {
    ...typography.subhead,
    color: colors.text,
    fontSize: 16,
  },
});
