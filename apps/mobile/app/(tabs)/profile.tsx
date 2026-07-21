import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Dimensions, Share, Modal, TextInput, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius, gradients, modeThemes } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';
import { GradientCard } from '../../src/components/ui/GradientCard';
import { Avatar } from '../../src/components/ui/Avatar';
import { getUserColor } from '../../src/utils/userHelpers';
import { useHouseholdStore } from '../../src/stores/householdStore';
import { useModeStore } from '../../src/stores/modeStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { useCalendarStore } from '../../src/stores/calendarStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useOfflineStore } from '../../src/services/offlineQueue';
import { useStreakStore } from '../../src/stores/streakStore';
import { getNotificationPrefs, setNotificationPrefs, type NotificationPrefs } from '../../src/services/pushNotifications';
import { apiGet, apiPatch, apiDelete } from '../../src/services/api';
import type { LifeMode } from '../../src/types';
import { useAlert } from '../../src/components/AlertProvider';
import { usePremiumStore } from '../../src/stores/premiumStore';
import { PremiumBadge } from '../../src/components/PremiumBadge';
import { UpgradePrompt } from '../../src/components/UpgradePrompt';
import * as ImagePicker from 'expo-image-picker';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'NGN', symbol: '\u20A6', name: 'Nigerian Naira' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen' },
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH\u20B5', name: 'Ghanaian Cedi' },
];

const LANGUAGES = [
  { code: 'English', label: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: 'Spanish', label: 'Espa\u00F1ol', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'French', label: 'Fran\u00E7ais', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'Portuguese', label: 'Portugu\u00EAs', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  { code: 'German', label: 'Deutsch', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'Italian', label: 'Italiano', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
  { code: 'Chinese', label: '\u4E2D\u6587', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  { code: 'Japanese', label: '\u65E5\u672C\u8A9E', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
  { code: 'Arabic', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
];

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
  { value: 'couple', label: 'Partner', icon: 'heart-outline' },
  { value: 'family', label: 'Family', icon: 'people-outline' },
  { value: 'parenting', label: 'Parenting', icon: 'happy-outline' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { mode, setMode } = useModeStore();
  const { tasks } = useTaskStore();
  const { events } = useCalendarStore();
  const settings = useSettingsStore();
  const user = useAuthStore((s) => s.user);
  const household = useHouseholdStore((s) => s.household);
  const { colors, shadows, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const isPremium = usePremiumStore((s) => s.isPremium);
  const premiumPlan = usePremiumStore((s) => s.plan);
  const pendingSync = useOfflineStore((s) => s.pendingCount);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    getNotificationPrefs().then(setNotifPrefs);
  }, []);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim() || editName.trim() === user?.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingProfile(true);
    try {
      await apiPatch('/users/me', { name: editName.trim() });
      useAuthStore.getState().updateUser({ name: editName.trim() });
      setIsEditingName(false);
    } catch {
      showAlert('Error', 'Could not update your name. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  }, [editName, user?.name]);

  const handlePickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      showAlert('Profile Photo', 'Profile photo selected. Upload will be available soon.');
    }
  }, []);

  const handleModeChange = async (newMode: typeof mode) => {
    setMode(newMode);
    // #27: Sync mode change to backend
    if (household?.id) {
      const modeMap: Record<string, string> = {
        single: 'SINGLE',
        couple: 'COUPLE',
        family: 'FAMILY',
        parenting: 'PARENTING',
      };
      apiPatch(`/households/${household.id}/mode`, { mode: modeMap[newMode] }).catch(() => {});
    }
    router.navigate('/(tabs)');
  };

  const toggleNotifPref = (key: keyof NotificationPrefs) => {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setNotificationPrefs({ [key]: !notifPrefs[key] });
  };

  const currentUser = {
    id: user?.id ?? '',
    name: user?.name ?? 'You',
    email: user?.email ?? '',
    color: user ? getUserColor(user.id) : '#3B82F6',
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalEvents = events.length;
  const streak = useStreakStore((s) => s.currentStreak);
  const currentModeTheme = modeThemes[mode];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* -- Header Area -- */}
        <View style={styles.headerArea} accessibilityRole="header">
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={handlePickAvatar}
            activeOpacity={0.7}
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
          >
            <Avatar name={currentUser.name} size={80} color={currentUser.color} />
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color={colors.textInverse} />
            </View>
          </TouchableOpacity>
          {isEditingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                onSubmitEditing={handleSaveName}
                returnKeyType="done"
                accessibilityLabel="Edit your name"
              />
              {isSavingProfile ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <TouchableOpacity onPress={handleSaveName} accessibilityLabel="Save name">
                  <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => { setEditName(user?.name ?? ''); setIsEditingName(true); }}
              activeOpacity={0.7}
              accessibilityLabel="Tap to edit name"
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.headerName}>{currentUser.name}</Text>
                {isPremium && <PremiumBadge size="md" />}
                <Ionicons name="pencil-outline" size={16} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          )}
          <Text style={styles.headerEmail} accessibilityLabel={`Email: ${currentUser.email}`}>
            {currentUser.email}
          </Text>
          <View style={styles.householdPill} accessibilityLabel={`Household: ${household?.name ?? 'My Household'}`}>
            <Ionicons name="home-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.householdPillText}>{household?.name ?? 'My Household'}</Text>
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
            <Text style={styles.statValue}>{household?.members?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* -- Weekly Recap Link -- */}
        <TouchableOpacity
          style={styles.recapLink}
          onPress={() => router.push('/weekly-recap' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.recapIcon}>
            <Ionicons name="bar-chart-outline" size={18} color="#6366F1" />
          </View>
          <Text style={styles.recapText}>View your weekly recap</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* -- Premium / Upgrade -- */}
        {isPremium ? (
          <TouchableOpacity
            style={[styles.recapLink, { marginBottom: spacing.lg }]}
            onPress={() => {
              const url = Platform.OS === 'ios'
                ? 'https://apps.apple.com/account/subscriptions'
                : 'https://play.google.com/store/account/subscriptions';
              Linking.openURL(url);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.recapIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="diamond" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.recapText}>Manage subscription</Text>
            <PremiumBadge />
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <View style={{ marginBottom: spacing.lg }}>
            <UpgradePrompt />
          </View>
        )}

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
                    onPress={() => handleModeChange(m.value)}
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
                  onPress={() => handleModeChange(m.value)}
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
                    onPress={() => handleModeChange(m.value)}
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
                  onPress={() => handleModeChange(m.value)}
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
          {/* Appearance - inline toggle */}
          <View style={styles.menuRow}>
            <View style={styles.menuIconWrap}>
              <Ionicons name="moon-outline" size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Appearance</Text>
              <View style={styles.inlineOptions}>
                {([['light', 'Light', 'sunny-outline'], ['dark', 'Dark', 'moon-outline'], ['system', 'Auto', 'phone-portrait-outline']] as const).map(([val, label, icon]) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.optionChip, settings.appearance === val && styles.optionChipActive]}
                    onPress={() => settings.setAppearance(val)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={icon as any} size={14} color={settings.appearance === val ? '#FFFFFF' : colors.textSecondary} />
                    <Text style={[styles.optionChipText, settings.appearance === val && styles.optionChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.menuRowBorder} />

          <MenuItem
            icon="globe-outline"
            label="Currency"
            subtitle={`${settings.currency} (${settings.currencySymbol})`}
            onPress={() => setShowCurrencyPicker(true)}
          />
          <MenuItem
            icon="language-outline"
            label="Language"
            subtitle={settings.language}
            last
            onPress={() => setShowLanguagePicker(true)}
          />
        </View>

        {/* -- Notifications -- */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="notifications-outline"
            label="Push Notifications"
            trailing={
              <Switch
                value={notifPrefs?.enabled ?? true}
                onValueChange={() => toggleNotifPref('enabled')}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.surface}
              />
            }
          />
          {notifPrefs?.enabled && (
            <>
              <MenuItem
                icon="cash-outline"
                label="Expenses"
                subtitle="Shared expenses & settlements"
                trailing={
                  <Switch
                    value={notifPrefs?.expenses ?? true}
                    onValueChange={() => toggleNotifPref('expenses')}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.surface}
                  />
                }
              />
              <MenuItem
                icon="calendar-outline"
                label="Events"
                subtitle="Event reminders & updates"
                trailing={
                  <Switch
                    value={notifPrefs?.events ?? true}
                    onValueChange={() => toggleNotifPref('events')}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.surface}
                  />
                }
              />
              <MenuItem
                icon="checkbox-outline"
                label="Tasks & Chores"
                subtitle="Task assignments & completions"
                trailing={
                  <Switch
                    value={notifPrefs?.tasks ?? true}
                    onValueChange={() => toggleNotifPref('tasks')}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.surface}
                  />
                }
              />
              <MenuItem
                icon="alarm-outline"
                label="Reminders"
                subtitle="Budget alerts & bill reminders"
                trailing={
                  <Switch
                    value={notifPrefs?.reminders ?? true}
                    onValueChange={() => toggleNotifPref('reminders')}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.surface}
                  />
                }
              />
              <MenuItem
                icon="people-outline"
                label="Social"
                subtitle="Polls, activity & updates"
                last
                trailing={
                  <Switch
                    value={notifPrefs?.social ?? true}
                    onValueChange={() => toggleNotifPref('social')}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor={colors.surface}
                  />
                }
              />
            </>
          )}
        </View>

        {/* -- Sync -- */}
        {pendingSync > 0 && (
          <>
            <Text style={styles.sectionLabel}>SYNC</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="sync-outline"
                label="Pending changes"
                subtitle={`${pendingSync} change${pendingSync !== 1 ? 's' : ''} waiting to sync`}
                last
              />
            </View>
          </>
        )}

        {/* -- Support -- */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="help-circle-outline"
            label="Help center"
            onPress={() => showAlert('Help Center', 'Need help?\n\n\u2022 Email: support@sivena.app\n\u2022 FAQ: sivena.app/faq\n\u2022 Report a bug: sivena.app/bugs')}
          />
          <MenuItem
            icon="chatbubble-outline"
            label="Send feedback"
            onPress={() => showAlert('Send Feedback', 'We\'d love to hear from you!\n\nEmail us at feedback@sivena.app')}
          />
          <MenuItem
            icon="sparkles-outline"
            label="View onboarding"
            onPress={() => router.push('/onboarding' as any)}
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
                showAlert('Error', 'Could not export your data. Please try again.');
              }
            }}
          />
          <MenuItem
            icon="trash-outline"
            label="Delete account"
            last
            onPress={() =>
              showAlert(
                'Delete Account',
                'This will permanently delete your account and all associated data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () =>
                      showAlert(
                        'Are you sure?',
                        'All your data including tasks, events, expenses, and memories will be permanently removed.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete permanently',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await apiDelete('/users/me');
                                useAuthStore.getState().logout();
                                router.replace('/(auth)/login');
                              } catch {
                                showAlert('Error', 'Could not delete your account. Please try again.');
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
            showAlert('Sign Out', 'Sign out of Sivena?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => { useAuthStore.getState().logout(); router.replace('/(auth)/login'); } },
            ])
          }
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        {/* -- Version -- */}
        <Text style={styles.version}>Sivena v1.0.0</Text>
        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.pickerSafe} edges={['top']}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)} style={styles.pickerCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
            {CURRENCIES.map((c) => {
              const isSelected = settings.currency === c.code;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                  onPress={() => { settings.setCurrency(c.code, c.symbol); setShowCurrencyPicker(false); }}
                  activeOpacity={0.6}
                >
                  <View style={[styles.pickerSymbolWrap, isSelected && styles.pickerSymbolWrapSelected]}>
                    <Text style={[styles.pickerSymbol, isSelected && styles.pickerSymbolSelected]}>{c.symbol}</Text>
                  </View>
                  <View style={styles.pickerInfo}>
                    <Text style={[styles.pickerLabel, isSelected && styles.pickerLabelSelected]}>{c.name}</Text>
                    <Text style={styles.pickerSub}>{c.code}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language Picker Modal */}
      <Modal visible={showLanguagePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.pickerSafe} edges={['top']}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Language</Text>
            <TouchableOpacity onPress={() => setShowLanguagePicker(false)} style={styles.pickerCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.pickerContent} showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((lang) => {
              const isSelected = settings.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                  onPress={() => { settings.setLanguage(lang.code); setShowLanguagePicker(false); }}
                  activeOpacity={0.6}
                >
                  <View style={styles.pickerFlagWrap}>
                    <Text style={styles.pickerFlag}>{lang.flag}</Text>
                  </View>
                  <View style={styles.pickerInfo}>
                    <Text style={[styles.pickerLabel, isSelected && styles.pickerLabelSelected]}>{lang.code}</Text>
                    <Text style={styles.pickerSub}>{lang.label}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <TouchableOpacity
      style={[styles.menuRow, !last && styles.menuRowBorder]}
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}: ${subtitle}` : label}
      accessibilityHint={onPress ? 'Double tap to open' : undefined}
    >
      <View style={styles.menuIconWrap} accessibilityElementsHidden>
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {trailing || <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} accessibilityElementsHidden />}
    </TouchableOpacity>
  );
}

// --- STYLES ---

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
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
    borderColor: colors.surface,
    marginBottom: spacing.md,
    position: 'relative' as const,
  },
  avatarEditBadge: {
    position: 'absolute' as const,
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  editNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  editNameInput: {
    ...typography.title1,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.xs,
    minWidth: 150,
    textAlign: 'center' as const,
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  householdPillText: {
    ...typography.caption1,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // -- Stats Card (white floating) --
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
  },

  // -- Weekly Recap Link --
  recapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  recapIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  recapText: {
    ...typography.subhead,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 130,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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

  // -- Inline Options (Appearance) --
  inlineOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    ...typography.caption1,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },

  // -- Picker Modal --
  pickerSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  pickerTitle: {
    ...typography.title3,
    color: colors.text,
  },
  pickerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  pickerRowSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pickerSymbolWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pickerSymbolWrapSelected: {
    backgroundColor: colors.primary,
  },
  pickerSymbol: {
    ...typography.headline,
    color: colors.text,
  },
  pickerSymbolSelected: {
    color: '#FFFFFF',
  },
  pickerFlagWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pickerFlag: {
    fontSize: 24,
  },
  pickerInfo: {
    flex: 1,
  },
  pickerLabel: {
    ...typography.body,
    color: colors.text,
  },
  pickerLabelSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  pickerSub: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 1,
  },

  // -- Version --
  version: {
    ...typography.caption1,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
