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
import { PurchasesPackage } from 'react-native-purchases';
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

type PlanType = 'monthly' | 'yearly';

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
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const purchasingRef = useRef(false);

  const featureInfo = params.feature
    ? PREMIUM_FEATURE_INFO[params.feature as PremiumFeature]
    : null;

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await getOfferings();
      if (offerings?.current?.availablePackages) {
        const pkgs: Record<string, PurchasesPackage> = {};
        for (const pkg of offerings.current.availablePackages) {
          const id = pkg.product.identifier;
          if (id.includes('monthly') && !id.includes('family')) {
            pkgs.monthly = pkg;
          } else if (id.includes('yearly')) {
            pkgs.yearly = pkg;
          } else if (id.includes('family')) {
            pkgs.family = pkg;
          }
        }
        setPackages(pkgs);
      }
    } catch {
      // Offerings may fail in dev/simulator — continue with fallback UI
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = useCallback(async () => {
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setIsPurchasing(true);

    try {
      const pkg = packages[selectedPlan];
      if (!pkg) {
        Alert.alert('Not Available', 'This plan is not available yet. Please try again later.');
        return;
      }

      haptics.medium();
      const info = await purchasePackage(pkg);
      if (info && isPremiumFromInfo(info)) {
        haptics.success();
        await usePremiumStore.getState().syncWithRevenueCat();
        router.back();
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } finally {
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
        router.back();
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
        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </TouchableOpacity>

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
            <View style={[styles.familyCard, { backgroundColor: colors.surface, borderColor: isDark ? '#3B2D7C' : '#DDD6FE' }]}>
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
                <Text style={[styles.familyPrice, { color: colors.text }]}>
                  {familyPrice}
                  <Text style={styles.planPeriod}>/mo</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePurchase}
            disabled={isPurchasing || isLoading}
          >
            <LinearGradient
              colors={['#F59E0B', '#FBBF24']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.ctaText}>
                  Continue with {selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

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
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl + 16,
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
});
