import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radius, modeThemes } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useModeStore } from '../stores/modeStore';
import { useModeHouseholdStore } from '../stores/modeHouseholdStore';
import type { LifeMode } from '../types';

const MODES: { value: LifeMode; label: string }[] = [
  { value: 'personal',  label: 'Personal'  },
  { value: 'couple',    label: 'Couple'    },
  { value: 'family',    label: 'Family'    },
  { value: 'parenting', label: 'Parenting' },
];

const MODE_SETUP: Record<LifeMode, {
  tagline: string;
  description: string;
  features: string[];
}> = {
  personal: {
    tagline: 'Your personal command center.',
    description: 'Private space for self-growth, habits, and daily life.',
    features: ['Personal tasks & goals', 'Private journal & wellness', 'Your finances & savings'],
  },
  couple: {
    tagline: 'A shared world built for two.',
    description: 'Plan dates, split expenses, and share your life with your partner.',
    features: ['Shared calendar & planning', 'Split expenses & settle up', 'Date ideas & memories'],
  },
  family: {
    tagline: 'Your household, in perfect harmony.',
    description: 'Coordinate routines, budgets, and family moments together.',
    features: ['Household task coordination', 'Family budget & expenses', 'Shared calendar for everyone'],
  },
  parenting: {
    tagline: 'Every milestone, beautifully remembered.',
    description: 'Track your child\'s growth, school schedule, and precious moments.',
    features: ['Baby & child activity tracking', 'Milestone logging & memories', 'School schedules & activities'],
  },
};

export function HomeModeBar() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const mode = useModeStore((s) => s.mode);
  const setMode = useModeStore((s) => s.setMode);
  const activatedModes = useModeHouseholdStore((s) => s.activatedModes);
  const activateMode = useModeHouseholdStore((s) => s.activateMode);
  const [setupMode, setSetupMode] = useState<LifeMode | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const handlePress = useCallback((m: LifeMode) => {
    if (m === mode || isSwitching) return;
    if (!activatedModes.includes(m)) {
      setSetupMode(m);
      return;
    }
    setIsSwitching(true);
    setMode(m);
    setTimeout(() => setIsSwitching(false), 400);
  }, [mode, activatedModes, setMode, isSwitching]);

  const handleSetupConfirm = useCallback(() => {
    if (!setupMode) return;
    activateMode(setupMode);
    setMode(setupMode);
    setSetupMode(null);
    setTimeout(() => router.push('/invite' as any), 150);
  }, [setupMode, activateMode, setMode, router]);

  return (
    <>
      {/* Bar — sticky above ScrollView */}
      <View style={styles.bar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          scrollEventThrottle={16}
        >
          {MODES.map((m) => (
            <ModePill
              key={m.value}
              modeValue={m.value}
              label={m.label}
              isActive={m.value === mode}
              isActivated={activatedModes.includes(m.value)}
              onPress={() => handlePress(m.value)}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      </View>

      {/* Setup bottom sheet */}
      <Modal
        visible={!!setupMode}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSetupMode(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSetupMode(null)}>
          <Pressable
            style={styles.sheet}
            onPress={() => {/* prevent overlay close */}}
          >
            {setupMode && (() => {
              const theme = modeThemes[setupMode];
              const info = MODE_SETUP[setupMode];
              const modeLabel = MODES.find((m) => m.value === setupMode)?.label ?? '';
              return (
                <>
                  <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

                  {/* Mode icon with glow */}
                  <View style={[styles.iconGlow, { backgroundColor: theme.accent + '18' }]}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.accent + '25' }]}>
                      <Ionicons name={theme.icon} size={40} color={theme.accent} />
                    </View>
                  </View>

                  {/* Badge */}
                  <View style={[styles.modeBadge, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '30' }]}>
                    <Text style={[styles.modeBadgeText, { color: theme.accent }]}>{modeLabel} Mode</Text>
                  </View>

                  <Text style={[styles.sheetTitle, { color: colors.text }]}>{info.tagline}</Text>
                  <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>{info.description}</Text>

                  {/* Feature list */}
                  <View style={styles.featureList}>
                    {info.features.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <View style={[styles.featureDot, { backgroundColor: theme.accent }]} />
                        <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    style={styles.setupBtn}
                    onPress={handleSetupConfirm}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={theme.gradient as unknown as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.setupBtnGradient}
                    >
                      <Ionicons name={theme.icon} size={18} color="#FFFFFF" />
                      <Text style={styles.setupBtnText}>Set up {modeLabel} Mode</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.laterBtn} onPress={() => setSetupMode(null)} activeOpacity={0.6}>
                    <Text style={[styles.laterText, { color: colors.textTertiary }]}>Not now</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Individual pill ──────────────────────────────────────────────────────────

function ModePill({
  modeValue,
  label,
  isActive,
  isActivated,
  onPress,
  colors,
  isDark,
}: {
  modeValue: LifeMode;
  label: string;
  isActive: boolean;
  isActivated: boolean;
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  const theme = modeThemes[modeValue];
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, { damping: 10, stiffness: 500 }, () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    });
    onPress();
  };

  if (isActive) {
    return (
      <Animated.View style={animStyle}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={pillStyles.pillWrap}>
          <LinearGradient
            colors={theme.gradient as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={pillStyles.pillActive}
          >
            <Ionicons name={theme.icon} size={14} color="rgba(255,255,255,0.9)" />
            <Text style={pillStyles.pillLabelActive}>{label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (isActivated) {
    return (
      <Animated.View style={animStyle}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          style={[
            pillStyles.pillActivated,
            {
              backgroundColor: isDark ? theme.accent + '15' : theme.accent + '0E',
              borderColor: theme.accent + '45',
            },
          ]}
        >
          <Ionicons name={theme.icon} size={14} color={theme.accent} />
          <Text style={[pillStyles.pillLabelActivated, { color: theme.accent }]}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Locked
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        pillStyles.pillLocked,
        { backgroundColor: isDark ? colors.elevated ?? colors.surface : colors.borderLight ?? '#F3F4F6' },
      ]}
    >
      <Ionicons name={theme.icon} size={14} color={colors.textTertiary} />
      <Text style={[pillStyles.pillLabelLocked, { color: colors.textTertiary }]}>{label}</Text>
      <View style={[pillStyles.addBadge, { backgroundColor: theme.accent }]}>
        <Ionicons name="add" size={9} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Pill stylesheet (static — no theme dependency) ──────────────────────────

const pillStyles = StyleSheet.create({
  pillWrap: { borderRadius: radius.full, overflow: 'hidden' },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  pillActivated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  pillLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    position: 'relative',
  },
  pillLabelActive: {
    ...typography.caption1,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pillLabelActivated: {
    ...typography.caption1,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pillLabelLocked: {
    ...typography.caption1,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  addBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

// ─── Bar + sheet stylesheet ───────────────────────────────────────────────────

const createStyles = (colors: any, shadows: any, isDark: boolean) => StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingTop: 8,
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: 12,
    gap: spacing.sm,
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: 'center',
    ...shadows.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xl,
  },
  iconGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  modeBadgeText: {
    ...typography.caption1,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    ...typography.title3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  sheetDesc: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  featureList: {
    width: '100%',
    backgroundColor: isDark ? colors.elevated ?? colors.card : colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 2,
  },
  featureDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  featureText: {
    ...typography.callout,
  },
  setupBtn: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  setupBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
  },
  setupBtnText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  laterBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  laterText: {
    ...typography.body,
    fontWeight: '500',
  },
});
