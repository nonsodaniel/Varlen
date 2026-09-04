import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage, PURCHASES_ERROR_CODE, PACKAGE_TYPE } from 'react-native-purchases';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius } from '../src/constants/theme';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPremiumFromInfo,
} from '../src/services/revenueCat';
import { usePremiumStore } from '../src/stores/premiumStore';
import { PREMIUM_FEATURE_INFO, PremiumFeature } from '../src/constants/premiumFeatures';
import { haptics } from '../src/hooks/useHaptics';
import { apiPost } from '../src/services/api';

type PlanType = 'monthly' | 'yearly' | 'family';

const FEATURES = [
  { icon: 'restaurant-outline', label: 'Meal planning & recipes' },
  { icon: 'wallet-outline', label: 'Savings goals & budgets' },
  { icon: 'heart-outline', label: 'Wellness trends & insights' },
  { icon: 'newspaper-outline', label: 'Weekly household recaps' },
  { icon: 'timer-outline', label: 'Countdowns & milestones' },
  { icon: 'trending-up-outline', label: 'Expense analytics' },
  { icon: 'people-outline', label: 'Multiple circles' },
  { icon: 'list-outline', label: 'Unlimited lists & ideas' },
] as const;

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ feature?: string }>();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [offeringsFailed, setOfferingsFailed] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const purchasingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const purchaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const featureInfo = params.feature
    ? PREMIUM_FEATURE_INFO[params.feature as PremiumFeature]
    : null;

  const safeBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  }, [router]);

  useEffect(() => {
    retryCountRef.current = 0;
    loadOfferings();
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (purchaseTimeoutRef.current) clearTimeout(purchaseTimeoutRef.current);
    };
  }, []);

  const cancelPurchase = useCallback(() => {
    if (purchaseTimeoutRef.current) clearTimeout(purchaseTimeoutRef.current);
    setIsPurchasing(false);
    purchasingRef.current = false;
  }, []);

  // Retry delays: 2s, 5s, 12s — gives StoreKit time to settle on cold start
  const RETRY_DELAYS = [2000, 5000, 12000];

  const parsePackages = (pkgList: PurchasesPackage[]): Record<string, PurchasesPackage> => {
    const pkgs: Record<string, PurchasesPackage> = {};
    for (const pkg of pkgList) {
      const productId = pkg.product.identifier.toLowerCase();
      const pkgId = (pkg.identifier || '').toLowerCase();
      const type = pkg.packageType;
      // Check product ID and RC package identifier; also fall back to packageType
      const isFamily = productId.includes('family') || pkgId.includes('family');
      const isYearly = !isFamily && (productId.includes('yearly') || productId.includes('annual') || pkgId.includes('yearly') || pkgId.includes('annual') || type === PACKAGE_TYPE.ANNUAL);
      const isMonthly = !isFamily && !isYearly && (productId.includes('monthly') || pkgId.includes('monthly') || type === PACKAGE_TYPE.MONTHLY);
      if (isFamily) pkgs.family = pkg;
      else if (isYearly) pkgs.yearly = pkg;
      else if (isMonthly) pkgs.monthly = pkg;
    }
    return pkgs;
  };

  const loadOfferings = async () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setIsLoading(true);
    setOfferingsFailed(false);

    try {
      const offerings = await getOfferings();
      const pkgList = offerings?.current?.availablePackages;
      if (pkgList?.length) {
        setPackages(parsePackages(pkgList));
        setOfferingsFailed(false);
        setIsLoading(false);
        retryCountRef.current = 0;
        return;
      }
      // Empty — schedule retry if attempts remain
      const delay = RETRY_DELAYS[retryCountRef.current];
      if (delay !== undefined) {
        retryCountRef.current += 1;
        // Keep spinner while retrying
        retryTimerRef.current = setTimeout(() => loadOfferings(), delay);
      } else {
        // All retries exhausted
        setOfferingsFailed(true);
        setIsLoading(false);
      }
    } catch {
      const delay = RETRY_DELAYS[retryCountRef.current];
      if (delay !== undefined) {
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(() => loadOfferings(), delay);
      } else {
        setOfferingsFailed(true);
        setIsLoading(false);
      }
    }
  };

  const handlePurchase = useCallback(async () => {
    if (!selectedPlan) return;
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setIsPurchasing(true);

    // Auto-reset if StoreKit hangs (e.g. Apple ID auth failure)
    purchaseTimeoutRef.current = setTimeout(() => {
      if (purchasingRef.current) {
        setIsPurchasing(false);
        purchasingRef.current = false;
        Alert.alert(
          'Taking too long',
          'The payment sheet is not responding. Please try again.',
          [{ text: 'OK' }],
        );
      }
    }, 30000);

    try {
      let pkg = packages[selectedPlan];

      // Packages not yet loaded — try one inline fetch before giving up
      if (!pkg) {
        const fresh = await getOfferings();
        if (fresh?.current?.availablePackages?.length) {
          const freshPkgs = parsePackages(fresh.current.availablePackages);
          setPackages(freshPkgs);
          pkg = freshPkgs[selectedPlan];
        }
      }

      if (!pkg) {
        setIsPurchasing(false);
        purchasingRef.current = false;
        Alert.alert(
          'Store Unavailable',
          'Unable to load this plan from the App Store. Please check your connection and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => loadOfferings() },
          ],
        );
        return;
      }

      haptics.medium();
      const info = await purchasePackage(pkg);
      if (info && isPremiumFromInfo(info)) {
        haptics.success();
        // Notify backend so it can record the subscription
        apiPost('/app-subscriptions/verify', {}).catch(() => {});
        await usePremiumStore.getState().syncWithRevenueCat();
        safeBack();
      } else if (info) {
        // Purchase completed on StoreKit but entitlement not yet active (webhook delay / config issue)
        // Sync in background and inform user
        usePremiumStore.getState().syncWithRevenueCat().catch(() => {});
        Alert.alert(
          'Purchase Received',
          'Your purchase was processed. If your subscription does not activate within a minute, tap "Restore purchases" to sync.',
          [{ text: 'OK', onPress: safeBack }],
        );
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        const code = err?.code;
        if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
          // Android: item already owned in Play Store — restore instead
          Alert.alert(
            'Already Subscribed',
            'You already have this subscription. Restoring your purchase now.',
            [{ text: 'OK', onPress: handleRestore }],
          );
        } else if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
          // Android: pending payment (bank transfer, cash, etc.)
          Alert.alert(
            'Payment Pending',
            'Your payment is being processed. You\'ll get access as soon as it\'s confirmed — no action needed.',
            [{ text: 'OK', onPress: safeBack }],
          );
        } else if (code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
          Alert.alert('No Connection', 'Check your internet connection and try again.');
        } else if (code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
          Alert.alert(
            'Store Unavailable',
            `${Platform.OS === 'ios' ? 'App Store' : 'Google Play'} is temporarily unavailable. Please try again in a moment.`,
          );
        } else {
          Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
        }
      }
    } finally {
      if (purchaseTimeoutRef.current) clearTimeout(purchaseTimeoutRef.current);
      setIsPurchasing(false);
      purchasingRef.current = false;
    }
  }, [packages, selectedPlan, router]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const info = await restorePurchases();
      if (info && isPremiumFromInfo(info)) {
        haptics.success();
        await usePremiumStore.getState().syncWithRevenueCat();
        Alert.alert('Restored!', 'Your subscription has been restored.');
        safeBack();
      } else {
        Alert.alert('No Subscription Found', 'We could not find any active subscriptions to restore.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [router]);

  const monthlyPrice = packages.monthly?.product?.priceString || '$4.99';
  const yearlyPrice = packages.yearly?.product?.priceString || '$39.99';
  const familyPrice = packages.family?.product?.priceString || '$7.99';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        {/* Static Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={safeBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sivena Pro</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero */}
          <LinearGradient
            colors={isDark ? ['#2D1F0E', '#1A1520'] : ['#FFF7ED', '#FEF3C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: isDark ? '#5C4A1E' : '#FDE68A' }]}
          >
            <View style={styles.heroIconWrap}>
              <LinearGradient
                colors={['#F59E0B', '#FBBF24']}
                style={styles.heroIconGradient}
              >
                <Ionicons name="diamond" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.heroTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
              Sivena Pro
            </Text>
            <Text style={[styles.heroSubtitle, { color: isDark ? '#D4A24A' : '#B45309' }]}>
              Unlock the full power of life coordination
            </Text>
          </LinearGradient>

          {/* Feature context if navigated from a gated screen */}
          {featureInfo && (
            <View style={[styles.contextCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons name={featureInfo.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.contextText, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>{featureInfo.title}</Text> is a Pro feature
              </Text>
            </View>
          )}

          {/* Features List */}
          <View style={[styles.featuresCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Everything in Pro
            </Text>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.featureCheck, { backgroundColor: isDark ? '#1A2E1A' : '#DCFCE7' }]}>
                  <Ionicons name="checkmark" size={14} color="#22C55E" />
                </View>
                <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Plan Selector */}
          <View style={styles.planSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
              Choose your plan
            </Text>

            {/* Yearly */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setSelectedPlan('yearly'); haptics.light(); }}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedPlan === 'yearly' ? '#F59E0B' : colors.borderLight,
                  borderWidth: selectedPlan === 'yearly' ? 2 : 1,
                },
              ]}
            >
              <View style={styles.planLeft}>
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, { color: colors.text }]}>Yearly</Text>
                  <LinearGradient
                    colors={['#22C55E', '#4ADE80']}
                    style={styles.saveBadge}
                  >
                    <Text style={styles.saveText}>SAVE 33%</Text>
                  </LinearGradient>
                </View>
                <Text style={[styles.planPrice, { color: colors.text }]}>
                  {yearlyPrice}
                  <Text style={styles.planPeriod}>/year</Text>
                </Text>
                <Text style={[styles.planMeta, { color: colors.textTertiary }]}>
                  ~$3.33/month
                </Text>
              </View>
              <View style={[
                styles.planRadio,
                {
                  borderColor: selectedPlan === 'yearly' ? '#F59E0B' : colors.border,
                  backgroundColor: selectedPlan === 'yearly' ? '#F59E0B' : 'transparent',
                },
              ]}>
                {selectedPlan === 'yearly' && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setSelectedPlan('monthly'); haptics.light(); }}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedPlan === 'monthly' ? '#F59E0B' : colors.borderLight,
                  borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                },
              ]}
            >
              <View style={styles.planLeft}>
                <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
                <Text style={[styles.planPrice, { color: colors.text }]}>
                  {monthlyPrice}
                  <Text style={styles.planPeriod}>/month</Text>
                </Text>
              </View>
              <View style={[
                styles.planRadio,
                {
                  borderColor: selectedPlan === 'monthly' ? '#F59E0B' : colors.border,
                  backgroundColor: selectedPlan === 'monthly' ? '#F59E0B' : 'transparent',
                },
              ]}>
                {selectedPlan === 'monthly' && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>

            {/* Family */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setSelectedPlan('family'); haptics.light(); }}
              style={[
                styles.familyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedPlan === 'family' ? '#8B5CF6' : (isDark ? '#3B2D7C' : '#DDD6FE'),
                  borderWidth: selectedPlan === 'family' ? 2 : 1,
                },
              ]}
            >
              <View style={styles.familyHeader}>
                <LinearGradient
                  colors={['#8B5CF6', '#A78BFA']}
                  style={styles.familyIconWrap}
                >
                  <Ionicons name="people" size={16} color="#FFF" />
                </LinearGradient>
                <View style={styles.familyInfo}>
                  <Text style={[styles.planName, { color: colors.text }]}>Family</Text>
                  <Text style={[styles.planMeta, { color: colors.textTertiary }]}>
                    Up to 6 members
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.familyPrice, { color: colors.text }]}>
                    {familyPrice}
                    <Text style={styles.planPeriod}>/mo</Text>
                  </Text>
                </View>
                <View style={[
                  styles.planRadio,
                  {
                    borderColor: selectedPlan === 'family' ? '#8B5CF6' : colors.border,
                    backgroundColor: selectedPlan === 'family' ? '#8B5CF6' : 'transparent',
                    marginLeft: 8,
                  },
                ]}>
                  {selectedPlan === 'family' && (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <TouchableOpacity
            activeOpacity={selectedPlan ? 0.85 : 1}
            onPress={handlePurchase}
            disabled={isPurchasing || !selectedPlan}
            style={{ opacity: selectedPlan ? 1 : 0.45 }}
          >
            <LinearGradient
              colors={selectedPlan === 'family' ? ['#8B5CF6', '#A78BFA'] : ['#F59E0B', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.ctaText}>
                  {selectedPlan
                    ? `Continue with ${selectedPlan === 'yearly' ? 'Yearly' : selectedPlan === 'family' ? 'Family' : 'Monthly'}`
                    : 'Select a plan to continue'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {isPurchasing && (
            <TouchableOpacity style={styles.cancelPurchaseBtn} onPress={cancelPurchase} activeOpacity={0.7}>
              <Text style={[styles.cancelPurchaseText, { color: colors.textTertiary }]}>Cancel</Text>
            </TouchableOpacity>
          )}

          {/* Subtle retry link — only shown if offerings truly failed to load */}
          {offeringsFailed && !isLoading && (
            <TouchableOpacity
              style={styles.retryLink}
              onPress={() => loadOfferings()}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.retryLinkText, { color: colors.textTertiary }]}>
                Having trouble loading prices? Tap to refresh
              </Text>
            </TouchableOpacity>
          )}

          {/* Restore */}
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            ) : (
              <Text style={[styles.restoreText, { color: colors.textTertiary }]}>
                Restore purchases
              </Text>
            )}
          </TouchableOpacity>

          {/* Manage existing subscription — only shown when already subscribed */}
          {isPremium && (
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => router.push('/subscription' as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.manageText, { color: colors.textTertiary }]}>
                Manage or cancel subscription
              </Text>
            </TouchableOpacity>
          )}

          {/* Legal */}
          <Text style={[styles.legal, { color: colors.textTertiary }]}>
            Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
            Subscription automatically renews unless canceled at least 24 hours before the end of the current period.{' '}
            <Text
              style={styles.legalLink}
              onPress={() => router.push('/terms' as any)}
            >
              Terms
            </Text>
            {' & '}
            <Text
              style={styles.legalLink}
              onPress={() => router.push('/privacy-policy' as any)}
            >
              Privacy Policy
            </Text>
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  heroIconWrap: {
    marginBottom: 12,
  },
  heroIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  contextText: {
    fontSize: 13,
    flex: 1,
  },
  featuresCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 14,
  },
  planSection: {
    marginBottom: spacing.xl,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 10,
  },
  planLeft: {
    flex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.6,
  },
  planMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  familyCard: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 4,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  familyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyInfo: {
    flex: 1,
  },
  familyPrice: {
    fontSize: 18,
    fontWeight: '800',
  },
  ctaBtn: {
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  legal: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
  retryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 4,
  },
  retryLinkText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  cancelPurchaseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  cancelPurchaseText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  manageBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  manageText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
