import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuthStore } from '../../src/stores/authStore';
import { verifyEmail, resendVerification } from '../../src/services/authService';
import { useAlert } from '../../src/components/AlertProvider';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const { showAlert } = useAlert();
  const { login } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const email = params.email ?? '';
  const returnTo = params.returnTo;
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));

  // If no email provided, redirect back to login
  useEffect(() => {
    if (!email) {
      router.replace('/(auth)/login');
    }
  }, [email]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      // Handle paste: if text is multiple digits, fill from current index
      if (text.length > 1) {
        const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
        const newCode = [...code];
        for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
          newCode[index + i] = digits[i];
        }
        setCode(newCode);
        const nextIndex = Math.min(index + digits.length, CODE_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }

      const digit = text.replace(/\D/g, '');
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [code],
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !code[index] && index > 0) {
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  const fullCode = code.join('');

  const handleVerify = async () => {
    if (fullCode.length !== CODE_LENGTH) {
      showAlert('Invalid Code', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmail(email, fullCode);
      login(
        {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          householdId: result.user.householdId,
          emailVerified: true,
        },
        result.accessToken,
        result.refreshToken,
      );
      router.replace((returnTo as any) || '/(tabs)');
    } catch (err: any) {
      showAlert('Verification Failed', err.message || 'Invalid verification code. Please try again.');
      // Clear code on failure so user can re-enter
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    try {
      await resendVerification(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      showAlert(
        'Code Sent',
        `A new verification code has been sent to ${email}. Please check your inbox.`,
      );
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = useMemo(() => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return `${local}@${domain}`;
    return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
  }, [email]);

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to{'\n'}
              <Text style={{ fontWeight: '600', color: colors.text }}>
                {maskedEmail}
              </Text>
            </Text>
          </View>

          {/* Code input */}
          <View style={styles.formCard}>
            <Text style={styles.codeLabel}>Enter verification code</Text>
            <View style={styles.codeRow}>
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { inputRefs.current[i] = ref; }}
                  style={[
                    styles.codeInput,
                    code[i] ? styles.codeInputFilled : null,
                  ]}
                  value={code[i]}
                  onChangeText={(text) => handleCodeChange(text, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, i)
                  }
                  keyboardType="number-pad"
                  maxLength={i === 0 ? CODE_LENGTH : 1}
                  textContentType="oneTimeCode"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.verifyBtn, loading && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={loading || fullCode.length !== CODE_LENGTH}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.verifyBtnText}>Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Resend section */}
          <View style={styles.resendArea}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            {cooldown > 0 ? (
              <Text style={styles.cooldownText}>
                Resend in {cooldown}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendLink}>Resend Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.hintText}>
            Check your spam folder if you don't see the email in your inbox.
            The code expires in 15 minutes.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing['3xl'],
    },
    backBtn: {
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    headerArea: {
      alignItems: 'center',
      marginBottom: spacing['2xl'],
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      ...shadows.md,
    },
    title: {
      ...typography.title1,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      ...shadows.sm,
    },
    codeLabel: {
      ...typography.subhead,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    codeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    codeInput: {
      width: 46,
      height: 56,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    codeInputFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    verifyBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    verifyBtnText: {
      ...typography.headline,
      color: colors.textInverse,
    },
    resendArea: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.xl,
      gap: spacing.sm,
    },
    resendText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    resendLink: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
    cooldownText: {
      ...typography.body,
      color: colors.textTertiary,
      fontWeight: '500',
    },
    hintText: {
      ...typography.footnote,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: spacing.lg,
      lineHeight: 18,
      paddingHorizontal: spacing.md,
    },
  });
