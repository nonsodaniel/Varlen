import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Dimensions, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius, shadows, gradients, modeThemes } from '../../src/constants/theme';
import { GradientCard } from '../../src/components/ui/GradientCard';
import { Avatar } from '../../src/components/ui/Avatar';
import { currentUser, partner, household, getUserColor } from '../../src/data/mock';
import { useModeStore } from '../../src/stores/modeStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { apiGet } from '../../src/services/api';
import type { LifeMode } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODE_GAP = spacing.md;
const MODE_PADDING = spacing.xl;
const MODE_CARD_WIDTH = (SCREEN_WIDTH - MODE_PADDING * 2 - MODE_GAP) / 2;

const modes: {
  value: LifeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'single', label: 'Single', icon: 'person-outline' },
  { value: 'couple', label: 'Couple', icon: 'heart-outline' },
  { value: 'family', label: 'Family', icon: 'people-outline' },
  { value: 'parenting', label: 'Parenting', icon: 'happy-outline' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { mode, setMode } = useModeStore();
  const { tasks } = useTaskStore();
  const { events } = useCalendarStore();
  const settings = useSettingsStore();

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalEvents = events.length;
  const members = household.members;
  const currentModeTheme = modeThemes[mode];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* -- Header Area (on blue background) -- */}
        <View style={styles.headerArea}>
          <View style={styles.avatarRing}>
            <Avatar name={currentUser.name} size={80} color={currentUser.color} />
          </View>
          <Text style={styles.headerName}>{currentUser.name}</Text>
          <Text style={styles.headerEmail}>{currentUser.email}</Text>
          <View style={styles.householdPill}>
            <Ionicons name="home-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.householdPillText}>{household.name}</Text>
          </View>
        </View>

        {/* -- Stats Row (white floating card) -- */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalEvents}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* -- Life Mode Selector -- */}
        <Text style={styles.sectionLabel}>LIFE MODE</Text>
        <View style={styles.modeGrid}>
          <View style={styles.modeRow}>
            {modes.slice(0, 2).map((m) => {
              const mt = modeThemes[m.value];
              const isActive = mode === m.value;
              if (isActive) {
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setMode(m.value)}
                    activeOpacity={0.7}
                    style={{ width: MODE_CARD_WIDTH }}
                  >
                    <GradientCard
                      colors={mt.gradient}
                      style={styles.modeCardGradient}
                      borderRadius={radius.lg}
                    >
                      <View style={styles.modeCardInner}>
                        <View style={styles.modeIconWrapActive}>
                          <Ionicons name={m.icon} size={22} color={colors.textInverse} />
                        </View>
                        <Text style={styles.modeLabelActive}>{m.label}</Text>
                        <Text style={styles.modeDescActive}>{mt.label}</Text>
                        <View style={styles.modeCheckmark}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />
                        </View>
                      </View>
                    </GradientCard>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={m.value}
                  style={styles.modeCard}
                  onPress={() => setMode(m.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modeIconWrapInactive, { backgroundColor: mt.accentLight }]}>
                    <Ionicons name={m.icon} size={22} color={mt.accent} />
                  </View>
                  <Text style={styles.modeLabel}>{m.label}</Text>
                  <Text style={styles.modeDesc}>{mt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.modeRow}>
            {modes.slice(2, 4).map((m) => {
              const mt = modeThemes[m.value];
              const isActive = mode === m.value;
              if (isActive) {
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setMode(m.value)}
                    activeOpacity={0.7}
                    style={{ width: MODE_CARD_WIDTH }}
                  >
                    <GradientCard
                      colors={mt.gradient}
                      style={styles.modeCardGradient}
                      borderRadius={radius.lg}
                    >
                      <View style={styles.modeCardInner}>
                        <View style={styles.modeIconWrapActive}>
                          <Ionicons name={m.icon} size={22} color={colors.textInverse} />
                        </View>
                        <Text style={styles.modeLabelActive}>{m.label}</Text>
                        <Text style={styles.modeDescActive}>{mt.label}</Text>
                        <View style={styles.modeCheckmark}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />
                        </View>
                      </View>
                    </GradientCard>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={m.value}
                  style={styles.modeCard}
                  onPress={() => setMode(m.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modeIconWrapInactive, { backgroundColor: mt.accentLight }]}>
                    <Ionicons name={m.icon} size={22} color={mt.accent} />
                  </View>
                  <Text style={styles.modeLabel}>{m.label}</Text>
                  <Text style={styles.modeDesc}>{mt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* -- Preferences -- */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            trailing={
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={settings.setNotificationsEnabled}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.surface}
              />
            }
          />
          <MenuItem
            icon="moon-outline"
            label="Appearance"
            subtitle={settings.appearance === 'light' ? 'Light' : settings.appearance === 'dark' ? 'Dark' : 'System'}
            onPress={() => Alert.alert('Appearance', 'Choose theme', [
              { text: 'Light', onPress: () => settings.setAppearance('light') },
              { text: 'Dark', onPress: () => settings.setAppearance('dark') },
              { text: 'System', onPress: () => settings.setAppearance('system') },
              { text: 'Cancel', style: 'cancel' },
            ])}
          />
          <MenuItem
            icon="globe-outline"
            label="Currency"
            subtitle={`${settings.currency} (${settings.currencySymbol})`}
            onPress={() => Alert.alert('Currency', 'Select currency', [
              { text: 'USD ($)', onPress: () => settings.setCurrency('USD', '$') },
              { text: 'EUR (\u20AC)', onPress: () => settings.setCurrency('EUR', '\u20AC') },
              { text: 'GBP (\u00A3)', onPress: () => settings.setCurrency('GBP', '\u00A3') },
              { text: 'NGN (\u20A6)', onPress: () => settings.setCurrency('NGN', '\u20A6') },
              { text: 'Cancel', style: 'cancel' },
            ])}
          />
          <MenuItem
            icon="language-outline"
            label="Language"
            subtitle={settings.language}
            last
            onPress={() => Alert.alert('Language', 'Select language', [
              { text: 'English', onPress: () => settings.setLanguage('English') },
              { text: 'Spanish', onPress: () => settings.setLanguage('Spanish') },
              { text: 'French', onPress: () => settings.setLanguage('French') },
              { text: 'Cancel', style: 'cancel' },
            ])}
          />
        </View>

        {/* -- Support -- */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="help-circle-outline"
            label="Help center"
            onPress={() => Alert.alert('Help Center', 'Need help?\n\n\u2022 Email: support@sivena.app\n\u2022 FAQ: sivena.app/faq\n\u2022 Report a bug: sivena.app/bugs')}
          />
          <MenuItem
            icon="chatbubble-outline"
            label="Send feedback"
            onPress={() => Alert.alert('Send Feedback', 'We\'d love to hear from you!\n\nEmail us at feedback@sivena.app')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Privacy policy"
            onPress={() => router.push('/privacy-policy')}
          />
          <MenuItem
            icon="document-text-outline"
            label="Terms & conditions"
            last
            onPress={() => router.push('/terms')}
          />
        </View>

        {/* -- Data & Privacy -- */}
        <Text style={styles.sectionLabel}>DATA & PRIVACY</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="download-outline"
            label="Download my data"
            onPress={async () => {
              try {
                const data = await apiGet<Record<string, any>>('/users/me/export');
                const json = JSON.stringify(data, null, 2);
                await Share.share({ message: json, title: 'My Sivena Data' });
              } catch {
                Alert.alert('Error', 'Could not export your data. Please try again.');
              }
            }}
          />
          <MenuItem
            icon="trash-outline"
            label="Delete account"
            last
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account and all associated data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      Alert.alert(
                        'Are you sure?',
                        'All your data including tasks, events, expenses, and memories will be permanently removed.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete permanently',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await fetch(
                                  `${__DEV__ ? 'http://localhost:3000/api/v1' : 'https://sivena-api-production.up.railway.app/api/v1'}/users/me`,
                                  { method: 'DELETE', headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` } },
                                );
                                useAuthStore.getState().logout();
                                router.replace('/(auth)/login');
                              } catch {
                                Alert.alert('Error', 'Could not delete your account. Please try again.');
                              }
                            },
                          },
                        ],
                      ),
                  },
                ],
              )
            }
          />
        </View>

        {/* -- Sign Out -- */}
        <TouchableOpacity
          style={styles.signOut}
          activeOpacity={0.6}
          onPress={() =>
            Alert.alert('Sign Out', 'Sign out of Sivena?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => { useAuthStore.getState().logout(); router.replace('/(auth)/login'); } },
            ])
          }
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* -- Version -- */}
        <Text style={styles.version}>Sivena v1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- MenuItem ---

function MenuItem({ icon, label, subtitle, trailing, last = false, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !last && styles.menuRowBorder]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {trailing || <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </TouchableOpacity>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
  },

  // -- Header Area (on blue bg, no gradient) --
  headerArea: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    marginBottom: spacing.md,
  },
  headerName: {
    ...typography.title1,
    color: colors.text,
  },
  headerEmail: {
    ...typography.callout,
    color: colors.textSecondary,
    marginTop: 2,
  },
  householdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  householdPillText: {
    ...typography.caption1,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // -- Stats Card (white floating) --
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.title3,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption2,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '70%' as any,
    backgroundColor: '#F0F2F5',
    alignSelf: 'center',
  },

  // -- Life Mode Selector --
  sectionLabel: {
    ...typography.caption1,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  modeGrid: {
    gap: MODE_GAP,
  },
  modeRow: {
    flexDirection: 'row',
    gap: MODE_GAP,
  },
  modeCard: {
    width: MODE_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 130,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.sm,
  },
  modeCardGradient: {
    minHeight: 120,
    ...shadows.md,
  },
  modeCardInner: {
    padding: spacing.lg,
    position: 'relative',
  },
  modeIconWrapActive: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modeIconWrapInactive: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modeLabel: {
    ...typography.headline,
    color: colors.text,
  },
  modeLabelActive: {
    ...typography.headline,
    color: colors.textInverse,
  },
  modeDesc: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 2,
  },
  modeDescActive: {
    ...typography.caption2,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  modeCheckmark: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },

  // -- Menu Cards --
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
  },
  menuSub: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },

  // -- Sign Out --
  signOut: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.full,
    paddingHorizontal: spacing['2xl'],
  },
  signOutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },

  // -- Version --
  version: {
    ...typography.caption1,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
