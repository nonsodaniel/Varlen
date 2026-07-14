import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useSettingsStore } from '../src/stores/settingsStore';
import type { LifeMode } from '../src/types';
import { useModeStore } from '../src/stores/modeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'heart' as const,
    title: 'Welcome to Sivena',
    subtitle: 'Your life, together. Coordinate tasks, expenses, events, and more with the people who matter most.',
    color: '#6C63FF',
  },
  {
    icon: 'people' as const,
    title: 'Create Your Circle',
    subtitle: 'Invite your partner, family, or roommates. Everyone stays in sync with shared lists, calendars, and budgets.',
    color: '#EC4899',
  },
  {
    icon: 'checkbox' as const,
    title: 'Stay Organized',
    subtitle: 'Assign tasks, track chores, split expenses fairly, and plan meals together. No more confusion.',
    color: '#10B981',
  },
  {
    icon: 'sparkles' as const,
    title: 'Your Life Mode',
    subtitle: 'Choose how you live. Sivena adapts to show features that matter most to you.',
    color: '#F59E0B',
    isModePicker: true,
  },
];

const MODES: { value: LifeMode; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { value: 'single', label: 'Single', icon: 'person-outline', desc: 'Personal productivity' },
  { value: 'couple', label: 'Partner', icon: 'heart-outline', desc: 'Life with your partner' },
  { value: 'family', label: 'Family', icon: 'people-outline', desc: 'Manage your household' },
  { value: 'parenting', label: 'Parenting', icon: 'happy-outline', desc: 'Raise kids together' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new RNAnimated.Value(0)).current;
  const { setMode } = useModeStore();
  const markOnboarded = useSettingsStore((s) => s.markOnboarded);
  const [selectedMode, setSelectedMode] = useState<LifeMode>('couple');

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setMode(selectedMode);
    markOnboarded();
    router.replace('/(tabs)');
  };

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon as any} size={56} color={item.color} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

      {item.isModePicker && (
        <View style={styles.modeGrid}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.modeCard,
                selectedMode === m.value && { borderColor: item.color, borderWidth: 2, backgroundColor: `${item.color}10` },
              ]}
              onPress={() => setSelectedMode(m.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={m.icon}
                size={24}
                color={selectedMode === m.value ? item.color : colors.textSecondary}
              />
              <Text style={[styles.modeLabel, selectedMode === m.value && { color: item.color }]}>
                {m.label}
              </Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <RNAnimated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
              />
            );
          })}
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(idx);
        }}
        keyExtractor={(_, i) => String(i)}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.7}>
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentIndex === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color={colors.textInverse}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  skipBtn: { padding: spacing.sm },
  skipText: { ...typography.body, color: colors.textSecondary },
  dots: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  slideTitle: {
    ...typography.largeTitle,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slideSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.lg,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing['2xl'],
    justifyContent: 'center',
  },
  modeCard: {
    width: (SCREEN_WIDTH - spacing['2xl'] * 2 - spacing.md * 3) / 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  modeLabel: {
    ...typography.headline,
    color: colors.text,
    marginTop: spacing.sm,
  },
  modeDesc: {
    ...typography.caption2,
    color: colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  nextBtnText: {
    ...typography.headline,
    color: colors.textInverse,
  },
});
