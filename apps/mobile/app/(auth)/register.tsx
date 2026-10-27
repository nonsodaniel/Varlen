import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SivenaLogo from '../../src/components/ui/SivenaLogo';
import { typography, spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Input } from '../../src/components/ui/Input';
import { GoogleSignInButton } from '../../src/components/ui/GoogleSignInButton';
import { useAuthStore } from '../../src/stores/authStore';
import { registerWithEmail, loginWithGoogle } from '../../src/services/authService';
import { signInWithGoogle, isUserCancelledError, isGoogleSignInAvailable } from '../../src/services/googleAuth';
import { useAlert } from '../../src/components/AlertProvider';

function getDeviceCountry(): string | undefined {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const parts = locale.split(/[-_]/);
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : undefined;
  } catch {
    return undefined;
  }
}

export default function RegisterScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { showAlert } = useAlert();
  const { login } = useAuthStore();
  const [isLoading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const result = await loginWithGoogle(idToken);
      login(
        {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          householdId: result.user.householdId,
          emailVerified: result.user.emailVerified,
        },
        result.accessToken,
        result.refreshToken,
      );
      router.replace((returnTo as any) || '/(tabs)');
    } catch (error: any) {
      if (!isUserCancelledError(error)) {
        showAlert('Google Sign-Up Failed', error.message || 'Something went wrong.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateNameMsg = (v: string) => (!v.trim() ? 'Name is required' : undefined);

  const validateEmailMsg = (v: string) => {
    if (!v.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(v)) return 'Enter a valid email';
    return undefined;
  };

  const validatePasswordMsg = (v: string) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])/.test(v)) return 'Must include a lowercase letter';
    if (!/(?=.*[A-Z])/.test(v)) return 'Must include an uppercase letter';
    if (!/(?=.*\d)/.test(v)) return 'Must include a number';
    if (!/(?=.*[@$!%*?&#^()_\-+=])/.test(v)) return 'Must include a special character';
    return undefined;
  };

  const validateConfirmMsg = (pw: string, confirm: string) =>
    pw !== confirm ? 'Passwords do not match' : undefined;

  const patchError = (key: string, msg: string | undefined) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[key] = msg; else delete next[key];
      return next;
    });

  const onChangeName = (v: string) => {
    setName(v);
    if (errors.name) patchError('name', validateNameMsg(v));
  };

  const onChangeEmail = (v: string) => {
    setEmail(v);
    if (errors.email) patchError('email', validateEmailMsg(v));
  };

  const onChangePassword = (v: string) => {
    setPassword(v);
    if (errors.password) patchError('password', validatePasswordMsg(v));
    if (errors.confirmPassword) patchError('confirmPassword', validateConfirmMsg(v, confirmPassword));
  };

  const onChangeConfirmPassword = (v: string) => {
    setConfirmPassword(v);
    if (errors.confirmPassword) patchError('confirmPassword', validateConfirmMsg(password, v));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const nameMsg = validateNameMsg(name);
    if (nameMsg) newErrors.name = nameMsg;
    const emailMsg = validateEmailMsg(email);
    if (emailMsg) newErrors.email = emailMsg;
    const passwordMsg = validatePasswordMsg(password);
    if (passwordMsg) newErrors.password = passwordMsg;
    const confirmMsg = validateConfirmMsg(password, confirmPassword);
    if (confirmMsg) newErrors.confirmPassword = confirmMsg;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await registerWithEmail(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        getDeviceCountry(),
      );
      // If the server already verified the email (common when verification is
      // disabled server-side), log in immediately. Otherwise route to verify-email.
      if (result.user.emailVerified && result.accessToken) {
        login(
          {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            householdId: result.user.householdId,
            emailVerified: true,
          },
          result.accessToken,
          result.refreshToken ?? null,
        );
        router.replace((returnTo as any) || '/(tabs)');
      } else {
        // Email not yet verified — route to verify-email screen
        router.replace({
          pathname: '/(auth)/verify-email',
          params: { email: result.user.email, ...(returnTo ? { returnTo } : {}) },
        });
      }
    } catch (error: any) {
      showAlert('Registration failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <TouchableOpacity
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
        style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <SivenaLogo size={60} />
            </View>
            <Text style={styles.appName}>Sivena</Text>
            <Text style={styles.tagline}>Create your account</Text>
          </View>

          {/* Google Sign-Up */}
          {isGoogleSignInAvailable() && (
            <>
              <GoogleSignInButton
                onPress={handleGoogleSignUp}
                loading={googleLoading}
              />
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Get started</Text>

            <Input
              label="Full name"
              placeholder="Your name"
              value={name}
              onChangeText={onChangeName}
              autoCapitalize="words"
              error={errors.name}
            />

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={onChangeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <View>
              <Input
                label="Password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={onChangePassword}
                secureTextEntry={!showPassword}
                error={errors.password}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <Input
              label="Confirm password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChangeText={onChangeConfirmPassword}
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />

            <TouchableOpacity
              style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Legal notice */}
          <Text style={styles.legalText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/terms')}>Terms</Text>
            {' '}and{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    paddingBottom: spacing['3xl'],
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 17,
    backgroundColor: '#04060F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  appName: {
    ...typography.largeTitle,
    color: colors.text,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.sm,
  },
  formTitle: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  eyeBtn: {
    position: 'absolute',
    right: spacing.lg,
    top: 38,
    padding: spacing.sm,
  },
  registerBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    ...typography.headline,
    color: colors.textInverse,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.callout,
    color: colors.textTertiary,
    marginHorizontal: spacing.lg,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  legalText: {
    ...typography.caption1,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: '500',
  },
});
