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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Input } from '../../src/components/ui/Input';
import { GoogleSignInButton } from '../../src/components/ui/GoogleSignInButton';
import { useAuthStore } from '../../src/stores/authStore';
import { loginWithEmail, loginWithGoogle } from '../../src/services/authService';
import { signInWithGoogle, isUserCancelledError, isGoogleSignInAvailable } from '../../src/services/googleAuth';
import { useAlert } from '../../src/components/AlertProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { login, setLoading, isLoading } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleGoogleLogin = async () => {
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
      router.replace('/(tabs)');
    } catch (error: any) {
      if (!isUserCancelledError(error)) {
        showAlert('Google Sign-In Failed', error.message || 'Something went wrong.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await loginWithEmail(email.trim().toLowerCase(), password);
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
      router.replace('/(tabs)');
    } catch (error: any) {
      // Check if the error is an unverified email (403 with EMAIL_NOT_VERIFIED)
      const isUnverified =
        error?.statusCode === 403 ||
        error?.response?.error === 'EMAIL_NOT_VERIFIED' ||
        error?.error === 'EMAIL_NOT_VERIFIED';
      if (isUnverified) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email: email.trim().toLowerCase() },
        });
      } else {
        showAlert('Login failed', error.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="heart" size={40} color={colors.primary} />
            </View>
            <Text style={styles.appName}>Sivena</Text>
            <Text style={styles.tagline}>Your life, together</Text>
          </View>

          {/* Google Sign-In */}
          {isGoogleSignInAvailable() && (
            <>
              <GoogleSignInButton
                onPress={handleGoogleLogin}
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
            <Text style={styles.formTitle}>Welcome back</Text>

            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <View>
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
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

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Legal links */}
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>{'\u2022'}</Text>
            <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
              <Text style={styles.legalLink}>Privacy</Text>
            </TouchableOpacity>
          </View>
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
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotText: {
    ...typography.subhead,
    color: colors.primary,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
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
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  registerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  registerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  legalLink: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  legalDot: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
});
