import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isAfter } from 'date-fns';
import { useTheme } from '../src/contexts/ThemeContext';
import { spacing, radius } from '../src/constants/theme';
import {
  getCustomerInfo,
  getOfferings,
  restorePurchases,
  isPremiumFromInfo,
} from '../src/services/revenueCat';
import { usePremiumStore } from '../src/stores/premiumStore';
import { haptics } from '../src/hooks/useHaptics';
import { CustomerInfo } from 'react-native-purchases';

interface TransactionItem {
  productId: string;
  purchaseDate: string | null;
  expirationDate: string | null;
  label: string;
  isActive: boolean;
}

function productLabel(id: string): string {
  if (id.includes('family')) return 'Family Plan';
  if (id.includes('yearly') || id.includes('annual')) return 'Pro Yearly';
  if (id.includes('monthly')) return 'Pro Monthly';
  return id;
}

function buildTransactions(info: CustomerInfo): TransactionItem[] {
  const productIds = info.allPurchasedProductIdentifiers ?? [];
  const now = new Date();
  const items: TransactionItem[] = productIds.map((id) => {
    const purchaseDate = info.allPurchaseDates?.[id] ?? null;
    const expirationDate = info.allExpirationDates?.[id] ?? null;
    const isActive = expirationDate ? isAfter(parseISO(expirationDate), now) : false;
    return { productId: id, purchaseDate, expirationDate, label: productLabel(id), isActive };
  });

  // Sort: active first, then most recent purchase
  items.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const aDate = a.purchaseDate ? parseISO(a.purchaseDate).getTime() : 0;
    const bDate = b.purchaseDate ? parseISO(b.purchaseDate).getTime() : 0;
    return bDate - aDate;
  });

  return items;
}

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const plan = usePremiumStore((s) => s.plan);
  const expiresAt = usePremiumStore((s) => s.expiresAt);

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const [info, offerings] = await Promise.all([getCustomerInfo(), getOfferings()]);
      if (info) {
        setTransactions(buildTransactions(info));
        // Check billing issue (payment failed but access still granted in grace period)
        const activeEnt = info.entitlements?.active;
        const billingIssue =
          activeEnt?.pro?.billingIssueDetectedAt ||
          activeEnt?.family?.billingIssueDetectedAt;
        setInGracePeriod(!!billingIssue);
      }
      // Get price for the exact active subscription product
      if (offerings?.current?.availablePackages && info) {
        const activeProductIds: string[] = (info as any).activeSubscriptions ?? [];
        for (const pkg of offerings.current.availablePackages) {
          if (activeProductIds.includes(pkg.product.identifier)) {
            setCurrentPrice(pkg.product.priceString);
            break;
          }
        }
      }
    } catch {
      // silently fail — history is a nice-to-have
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    haptics.light();
    try {
      const info = await restorePurchases();
      if (info && isPremiumFromInfo(info)) {
        haptics.success();
        await usePremiumStore.getState().syncWithRevenueCat();
        setTransactions(buildTransactions(info));
        Alert.alert('Restored!', 'Your subscription has been restored successfully.');
      } else {
        Alert.alert('No Subscription Found', 'We could not find any active subscriptions to restore.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const handleManageExternal = useCallback(() => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url);
  }, []);

  const planLabel = plan === 'family' ? 'Family Plan' : plan === 'pro' ? 'Pro' : 'Free';
  const planColors: [string, string] =
    plan === 'family'
      ? ['#8B5CF6', '#A78BFA']
      : plan === 'pro'
      ? ['#F59E0B', '#FBBF24']
      : ['#6B7280', '#9CA3AF'];

  const expirationFormatted = expiresAt
    ? format(parseISO(expiresAt), 'MMMM d, yyyy')
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)' as any)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Grace Period Warning */}
          {inGracePeriod && (
            <TouchableOpacity
              style={[styles.graceBanner, { backgroundColor: isDark ? '#3B1F1F' : '#FEE2E2' }]}
              onPress={handleManageExternal}
              activeOpacity={0.8}
            >
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.graceTitle}>Payment Issue Detected</Text>
                <Text style={styles.graceBody}>
                  Your last payment failed. Tap to update your billing info before access expires.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}

          {/* Plan Status Card */}
          <LinearGradient
            colors={isDark ? [colors.surface, colors.surface] : planColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.planCard, { opacity: isPremium ? 1 : 0.85 }]}
          >
            <View style={styles.planCardInner}>
              <View style={styles.planIconWrap}>
                <Ionicons
                  name={plan === 'family' ? 'people' : plan === 'pro' ? 'diamond' : 'person'}
                  size={28}
                  color={isDark ? planColors[0] : '#FFFFFF'}
                />
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: isDark ? colors.text : '#FFFFFF' }]}>
                  Sivena {planLabel}
                </Text>
                {isPremium ? (
                  <Text style={[styles.planStatus, { color: isDark ? '#22C55E' : 'rgba(255,255,255,0.9)' }]}>
                    Active{currentPrice ? ` · ${currentPrice}` : ''}
                  </Text>
                ) : (
                  <Text style={[styles.planStatus, { color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.8)' }]}>
                    No active subscription
                  </Text>
                )}
              </View>
            </View>

            {expirationFormatted && (
              <View style={[styles.renewalRow, { borderTopColor: isDark ? colors.borderLight : 'rgba(255,255,255,0.2)' }]}>
                <Ionicons
                  name={inGracePeriod ? 'alert-circle-outline' : 'refresh-outline'}
                  size={14}
                  color={inGracePeriod ? '#EF4444' : isDark ? colors.textSecondary : 'rgba(255,255,255,0.8)'}
                />
                <Text style={[styles.renewalText, {
                  color: inGracePeriod ? '#EF4444' : isDark ? colors.textSecondary : 'rgba(255,255,255,0.9)'
                }]}>
                  {inGracePeriod ? `Access expires ${expirationFormatted}` : `Renews ${expirationFormatted}`}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Actions */}
          <View style={[styles.actionsCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {!isPremium && (
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                onPress={() => router.push('/paywall' as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: isDark ? '#2D1F0E' : '#FEF3C7' }]}>
                  <Ionicons name="diamond" size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>Upgrade to Pro</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
              onPress={handleRestore}
              activeOpacity={0.7}
              disabled={isRestoring}
            >
              <View style={[styles.actionIcon, { backgroundColor: isDark ? '#1A2E1A' : '#DCFCE7' }]}>
                {isRestoring ? (
                  <ActivityIndicator size="small" color="#22C55E" />
                ) : (
                  <Ionicons name="refresh-circle-outline" size={18} color="#22C55E" />
                )}
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Restore purchases</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>

            {isPremium && inGracePeriod && (
              <TouchableOpacity
                style={[styles.actionRow, { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                onPress={handleManageExternal}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: isDark ? '#3B1F1F' : '#FEE2E2' }]}>
                  <Ionicons name="card-outline" size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionLabel, { color: '#EF4444' }]}>Fix Payment</Text>
                  <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
                    Update billing to keep your subscription active
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}

            {isPremium && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleManageExternal}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="settings-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Manage subscription</Text>
                  <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
                    Cancel or change via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Payment History */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PAYMENT HISTORY</Text>

          <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            {isLoadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.historyLoadingText, { color: colors.textSecondary }]}>
                  Loading history...
                </Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="receipt-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>
                  No purchase history found
                </Text>
                <Text style={[styles.emptyHistorySub, { color: colors.textTertiary }]}>
                  Purchases made with this account will appear here
                </Text>
              </View>
            ) : (
              transactions.map((tx, i) => (
                <View
                  key={`${tx.productId}-${i}`}
                  style={[
                    styles.txRow,
                    i < transactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                  ]}
                >
                  <View style={[
                    styles.txIcon,
                    { backgroundColor: tx.isActive ? (isDark ? '#1A2E1A' : '#DCFCE7') : colors.background },
                  ]}>
                    <Ionicons
                      name={tx.label.includes('Family') ? 'people' : 'diamond'}
                      size={16}
                      color={tx.isActive ? '#22C55E' : colors.textTertiary}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <View style={styles.txTitleRow}>
                      <Text style={[styles.txLabel, { color: colors.text }]}>{tx.label}</Text>
                      {tx.isActive && (
                        <View style={[styles.activeBadge, { backgroundColor: isDark ? '#1A2E1A' : '#DCFCE7' }]}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    {tx.purchaseDate && (
                      <Text style={[styles.txDate, { color: colors.textTertiary }]}>
                        Started {format(parseISO(tx.purchaseDate), 'MMM d, yyyy')}
                      </Text>
                    )}
                    {tx.expirationDate && (
                      <Text style={[styles.txDate, { color: colors.textTertiary }]}>
                        {tx.isActive
                          ? `Renews ${format(parseISO(tx.expirationDate), 'MMM d, yyyy')}`
                          : `Expired ${format(parseISO(tx.expirationDate), 'MMM d, yyyy')}`}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Legal */}
          <Text style={[styles.legal, { color: colors.textTertiary }]}>
            Subscriptions automatically renew unless canceled at least 24 hours before the current period ends.
            Manage your subscription via your{' '}
            <Text style={styles.legalLink} onPress={handleManageExternal}>
              {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account
            </Text>
            .{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/terms' as any)}>
              Terms of Use
            </Text>
            {' & '}
            <Text style={styles.legalLink} onPress={() => router.push('/privacy-policy' as any)}>
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
    paddingBottom: 48,
  },

  // Grace period banner
  graceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  graceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 2,
  },
  graceBody: {
    fontSize: 12,
    color: '#EF4444',
    opacity: 0.85,
    lineHeight: 16,
  },

  // Plan Card
  planCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  planIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  planStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  renewalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  renewalText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Actions
  actionsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  actionSub: {
    fontSize: 12,
    marginTop: 1,
  },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },

  // History
  historyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  historyLoadingText: {
    fontSize: 14,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyHistoryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyHistorySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    gap: spacing.md,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  txInfo: {
    flex: 1,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  txLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
  },
  txDate: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Legal
  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
