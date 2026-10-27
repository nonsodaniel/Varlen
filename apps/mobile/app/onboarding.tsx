import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  interpolateColor,
  Easing,
  Extrapolation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, Line as SvgLine } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { typography, spacing, radius, modeThemes } from '../src/constants/theme';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useModeStore } from '../src/stores/modeStore';
import type { LifeMode } from '../src/types';

const { width: SW, height: SH } = Dimensions.get('window');
const SLIDE_COUNT = 5;
const IS_SMALL = SH < 700;

const BG_DARK = '#0F1020';
const BG_MID = '#151729';
const BG_LIGHT = '#F7F8FC';

const MODES: { value: LifeMode; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string; accent: string }[] = [
  { value: 'personal', label: 'Just Me', icon: 'person-outline', desc: 'Personal productivity & self-care', accent: modeThemes.personal.accent },
  { value: 'couple', label: 'Partner', icon: 'heart-outline', desc: 'Coordinate life together', accent: modeThemes.couple.accent },
  { value: 'family', label: 'Family', icon: 'people-outline', desc: 'Run your household smoothly', accent: modeThemes.family.accent },
  { value: 'parenting', label: 'Parenting', icon: 'happy-outline', desc: 'Kids, school & activities', accent: modeThemes.parenting.accent },
];

const FEATURES = [
  { icon: 'checkbox-outline' as const, label: 'Tasks', color: '#10B981' },
  { icon: 'calendar-outline' as const, label: 'Calendar', color: '#3B82F6' },
  { icon: 'wallet-outline' as const, label: 'Expenses', color: '#F59E0B' },
];

const EXTRA_FEATURES = [
  { label: 'Meals', icon: 'restaurant-outline' as const },
  { label: 'Wellness', icon: 'fitness-outline' as const },
  { label: 'Goals', icon: 'flag-outline' as const },
  { label: 'Habits', icon: 'repeat-outline' as const },
  { label: 'Journal', icon: 'book-outline' as const },
];

const CTA_LABELS = ['Get Started', 'Continue', 'Continue', 'Continue', 'Enter Sivena'];
const CTA_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'arrow-forward', 'arrow-forward', 'arrow-forward', 'arrow-forward', 'sparkles',
];

const MODE_MESSAGES: Record<LifeMode, string> = {
  personal: 'Your personal command center awaits',
  couple: 'Start coordinating with your partner',
  family: 'Your household hub is ready',
  parenting: 'Family life, beautifully organized',
};

// ─── Floating Gradient Orb ─────────────────────────────────────
function FloatingOrb({
  size, colors, x, y, delay, duration, opacity: baseOpacity,
}: {
  size: number; colors: [string, string]; x: number; y: number;
  delay: number; duration: number; opacity: number;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(14, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-14, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, duration]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          left: SW / 2 - size / 2 + x,
          top: IS_SMALL ? SH * 0.08 + y : SH * 0.12 + y,
          overflow: 'hidden',
          opacity: baseOpacity,
        },
        animStyle,
      ]}
    >
      <LinearGradient
        colors={colors}
        style={{ width: size, height: size }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

// ─── Progress Segment ──────────────────────────────────────────
function ProgressSegment({
  index,
  scrollX,
}: {
  index: number;
  scrollX: SharedValue<number>;
}) {
  const segWidth = (SW - spacing.xl * 2 - (SLIDE_COUNT - 1) * 6) / SLIDE_COUNT;

  const fillStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollX.value,
      [(index - 1) * SW, index * SW],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { flex: progress };
  });

  const bgStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      scrollX.value,
      [0, SW * 1.5, SW * 2],
      ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)', 'rgba(0,0,0,0.06)'],
    );
    return { backgroundColor: bg };
  });

  const fillColorStyle = useAnimatedStyle(() => {
    const fill = interpolateColor(
      scrollX.value,
      [0, SW * 1.5, SW * 2],
      ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.7)', '#3B82F6'],
    );
    return { backgroundColor: fill };
  });

  return (
    <Animated.View
      style={[
        {
          width: segWidth,
          height: 3,
          borderRadius: 2,
          overflow: 'hidden',
          flexDirection: 'row',
        },
        bgStyle,
      ]}
    >
      <Animated.View style={[{ height: 3, borderRadius: 2 }, fillColorStyle, fillStyle]} />
    </Animated.View>
  );
}

// ─── Feature Card (Slide 1) ────────────────────────────────────
function FeatureCard({
  icon,
  label,
  color,
  index: cardIndex,
  scrollX,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const rotations = [-6, 0, 6];
  const offsets = [-8, 0, -8];

  const cardStyle = useAnimatedStyle(() => {
    const slideProgress = interpolate(
      scrollX.value,
      [0, SW, SW * 2],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(slideProgress, [0, 1], [40, 0]);
    const opacity = interpolate(slideProgress, [0, 1], [0, 1]);

    return {
      opacity,
      transform: [
        { translateY: translateY + offsets[cardIndex] },
        { rotate: `${rotations[cardIndex]}deg` },
        { scale: cardIndex === 1 ? 1.05 : 0.95 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.featureCard, cardStyle, { zIndex: cardIndex === 1 ? 2 : 1 }]}>
      <View style={[styles.featureIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Connection Visual (Slide 2) ───────────────────────────────
const NODE_DATA = [
  { cx: 100, cy: 90, r: 22, color: '#3B82F6' },
  { cx: 100, cy: 22, r: 15, color: '#EC4899' },
  { cx: 165, cy: 55, r: 15, color: '#10B981' },
  { cx: 155, cy: 140, r: 15, color: '#F59E0B' },
  { cx: 45, cy: 140, r: 15, color: '#8B5CF6' },
  { cx: 35, cy: 55, r: 15, color: '#6366F1' },
];

const LINE_DATA = NODE_DATA.slice(1).map((n) => ({
  x1: NODE_DATA[0].cx,
  y1: NODE_DATA[0].cy,
  x2: n.cx,
  y2: n.cy,
}));

function ConnectionVisual({ scrollX }: { scrollX: SharedValue<number> }) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const fadeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [SW, SW * 2, SW * 3],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.View style={[styles.connectionWrap, fadeStyle]}>
      <Animated.View style={pulseStyle}>
        <Svg width={200} height={170} viewBox="0 0 200 170">
          {LINE_DATA.map((l, i) => (
            <SvgLine
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="#CBD5E1"
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
          ))}
          {NODE_DATA.map((n, i) => (
            <React.Fragment key={i}>
              {i === 0 && (
                <SvgCircle cx={n.cx} cy={n.cy} r={n.r + 6} fill={`${n.color}15`} />
              )}
              <SvgCircle cx={n.cx} cy={n.cy} r={n.r} fill={n.color} opacity={i === 0 ? 1 : 0.85} />
              <SvgCircle
                cx={n.cx}
                cy={n.cy}
                r={n.r * 0.45}
                fill="white"
                opacity={0.3}
              />
            </React.Fragment>
          ))}
        </Svg>
      </Animated.View>
      <View style={styles.connectionLabels}>
        <Text style={styles.connectionLabel}>Partner</Text>
        <Text style={styles.connectionLabel}>Family</Text>
        <Text style={styles.connectionLabel}>Friends</Text>
      </View>
    </Animated.View>
  );
}

// ─── Mode Option Card ──────────────────────────────────────────
function ModeCard({
  mode,
  isSelected,
  onSelect,
}: {
  mode: typeof MODES[0];
  isSelected: boolean;
  onSelect: (value: LifeMode) => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.03 : 1, {
      damping: 14,
      stiffness: 150,
      mass: 0.8,
    });
  }, [isSelected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onSelect(mode.value);
  }, [mode.value, onSelect]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.modeCard,
          animStyle,
          {
            borderColor: isSelected ? mode.accent : '#E8ECF1',
          },
        ]}
      >
        <View style={[styles.modeIconWrap, { backgroundColor: `${mode.accent}15` }]}>
          <Ionicons
            name={mode.icon}
            size={24}
            color={isSelected ? mode.accent : '#94A3B8'}
          />
        </View>
        <Text style={[styles.modeLabel, isSelected && { color: mode.accent }]}>
          {mode.label}
        </Text>
        <Text style={styles.modeDesc}>{mode.desc}</Text>

        {isSelected && (
          <View style={[styles.modeCheck, { backgroundColor: mode.accent }]}>
            <Ionicons name="checkmark" size={12} color="white" />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Success Ring (Slide 4) ────────────────────────────────────
function SuccessVisual({
  accent,
  scrollX,
}: {
  accent: string;
  scrollX: SharedValue<number>;
}) {
  const ringScale = useSharedValue(0.5);
  const checkScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Reset before replaying
    ringScale.value = 0.5;
    checkScale.value = 0;
    glowOpacity.value = 0;

    ringScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 80 }));
    checkScale.value = withDelay(500, withSpring(1, { damping: 10, stiffness: 100 }));
    glowOpacity.value = withDelay(700, withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    ));
  }, [accent]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 1.3 }],
  }));

  const fadeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [SW * 3, SW * 4],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.View style={[styles.successWrap, fadeStyle]}>
      {/* Glow */}
      <Animated.View
        style={[
          styles.successGlow,
          { backgroundColor: accent },
          glowStyle,
        ]}
      />
      {/* Ring */}
      <Animated.View style={ringStyle}>
        <LinearGradient
          colors={[accent, `${accent}CC`]}
          style={styles.successRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View style={checkStyle}>
            <Ionicons name="checkmark" size={48} color="white" />
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Sparkle dots */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dist = 68;
        const dotSize = 4 + (i % 3);
        return (
          <View
            key={i}
            style={[
              styles.sparkleDot,
              {
                backgroundColor: accent,
                left: 75 + Math.cos(rad) * dist - dotSize / 2,
                top: 75 + Math.sin(rad) * dist - dotSize / 2,
                opacity: 0.3 + (i % 2) * 0.2,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Onboarding Screen
// ═══════════════════════════════════════════════════════════════
export default function OnboardingScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const isPreview = preview === '1';
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const isCompletingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<LifeMode>('personal');
  const scrollX = useSharedValue(0);
  const { setMode } = useModeStore();
  const markOnboarded = useSettingsStore((s) => s.markOnboarded);

  const selectedAccent = modeThemes[selectedMode].accent;

  // Compute available slide height (screen minus safe areas, header, footer)
  const HEADER_H = spacing.sm + spacing.lg + 3 + 20; // paddingTop + paddingBottom + bar + line-height
  const FOOTER_H = (IS_SMALL ? spacing.lg : spacing.xl) + spacing.sm + (IS_SMALL ? 14 : spacing.lg) * 2 + 22; // padding + button
  const slideHeight = SH - insets.top - insets.bottom - HEADER_H - FOOTER_H;

  const updateIndex = useCallback((idx: number) => {
    setCurrentIndex(idx);
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onMomentumEnd: (event) => {
      const idx = Math.round(event.contentOffset.x / SW);
      runOnJS(updateIndex)(idx);
    },
  });

  const completeOnboarding = useCallback(() => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    if (isPreview) {
      router.back();
      isCompletingRef.current = false;
      return;
    }
    setMode(selectedMode);
    markOnboarded();
    router.replace('/(tabs)');
  }, [isPreview, selectedMode, setMode, markOnboarded, router]);

  const handleNext = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (currentIndex < SLIDE_COUNT - 1) {
      const nextIdx = currentIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIdx * SW, animated: true });
      setCurrentIndex(nextIdx);
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  const handlePrev = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      scrollViewRef.current?.scrollTo({ x: prevIdx * SW, animated: true });
      setCurrentIndex(prevIdx);
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // ─── Animated Background ──────────────────────────────────
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      [0, SW * 0.8, SW * 1.8, SW * 2, SW * 4],
      [BG_DARK, BG_DARK, BG_MID, BG_LIGHT, BG_LIGHT],
    ),
  }));

  // ─── Skip button ──────────────────────────────────────────
  const skipOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [SW * 3.5, SW * 4],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const isDarkSlide = currentIndex < 2;
  const statusBarStyle = isDarkSlide ? 'light' : 'dark';
  const ctaLabels = isPreview
    ? ['Next', 'Next', 'Next', 'Next', 'Close']
    : CTA_LABELS;

  return (
    <Animated.View style={[styles.root, bgStyle]}>
      <StatusBar style={statusBarStyle} />
      <SafeAreaView style={styles.safe}>
        {/* ─── Header: Skip + Progress Bar ─── */}
        <View style={styles.header}>
          <Animated.View style={[styles.skipRow, skipOpacity]}>
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.skipText, { color: isDarkSlide ? 'rgba(255,255,255,0.5)' : '#94A3B8' }]}>
                {isPreview ? 'Close' : 'Skip'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          <View style={styles.progressBar}>
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <ProgressSegment key={i} index={i} scrollX={scrollX} />
            ))}
          </View>
        </View>

        {/* ─── Slides ─── */}
        <View style={styles.slidesContainer}>
        <Animated.ScrollView
          ref={scrollViewRef as any}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          style={styles.scrollView}
          contentContainerStyle={{ alignItems: 'stretch' }}
        >
          {/* ═══ Slide 0: Welcome ═══ */}
          <View style={[styles.slide, { height: slideHeight }]}>
            {/* Floating orbs */}
            <FloatingOrb
              size={IS_SMALL ? 160 : 200}
              colors={['#3B82F6', '#6366F1']}
              x={-10}
              y={-30}
              delay={0}
              duration={4200}
              opacity={0.25}
            />
            <FloatingOrb
              size={IS_SMALL ? 120 : 150}
              colors={['#EC4899', '#8B5CF6']}
              x={55}
              y={10}
              delay={600}
              duration={3600}
              opacity={0.2}
            />
            <FloatingOrb
              size={IS_SMALL ? 80 : 100}
              colors={['#10B981', '#3B82F6']}
              x={-60}
              y={50}
              delay={300}
              duration={3900}
              opacity={0.22}
            />

            <View style={styles.slideContent}>
              <View style={styles.welcomeTextWrap}>
                <Text style={styles.brandText}>SIVEN{'\u039B'}</Text>
                <Text style={styles.tagline}>life, together</Text>
              </View>
              <View style={styles.welcomeDescWrap}>
                <Text style={styles.welcomeTitle}>
                  Your life, beautifully{'\n'}coordinated
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  The all-in-one platform for managing life with the people who matter most.
                </Text>
              </View>
            </View>
          </View>

          {/* ═══ Slide 1: Features ═══ */}
          <View style={[styles.slide, { height: slideHeight }]}>
            <View style={styles.slideContent}>
              <View style={styles.featureVisualWrap}>
                <View style={styles.featureCardsRow}>
                  {FEATURES.map((f, i) => (
                    <FeatureCard
                      key={f.label}
                      icon={f.icon}
                      label={f.label}
                      color={f.color}
                      index={i}
                      scrollX={scrollX}
                    />
                  ))}
                </View>

                {/* Extra feature pills */}
                <View style={styles.featurePillsWrap}>
                  {EXTRA_FEATURES.map((ef) => (
                    <View key={ef.label} style={styles.featurePill}>
                      <Ionicons name={ef.icon} size={13} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.featurePillText}>{ef.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.darkTitle}>Everything in{'\n'}one place</Text>
              <Text style={styles.darkSubtitle}>
                Tasks, calendars, expenses, meals, and more — all shared with your people.
              </Text>
            </View>
          </View>

          {/* ═══ Slide 2: Together ═══ */}
          <View style={[styles.slide, { height: slideHeight }]}>
            <View style={styles.slideContent}>
              <ConnectionVisual scrollX={scrollX} />

              <Text style={styles.lightTitle}>Better, together</Text>
              <Text style={styles.lightSubtitle}>
                Create a circle with your partner, family, or roommates. Everyone stays in sync, always.
              </Text>
            </View>
          </View>

          {/* ═══ Slide 3: Mode Picker ═══ */}
          <View style={[styles.slide, { height: slideHeight }]}>
            <View style={styles.slideContent}>
              <Text style={styles.lightTitle}>How do you live?</Text>
              <Text style={[styles.lightSubtitle, { marginBottom: spacing.xl }]}>
                Sivena adapts to fit your lifestyle
              </Text>

              <View style={styles.modeGrid}>
                {MODES.map((m) => (
                  <ModeCard
                    key={m.value}
                    mode={m}
                    isSelected={selectedMode === m.value}
                    onSelect={setSelectedMode}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* ═══ Slide 4: Launch ═══ */}
          <View style={[styles.slide, { height: slideHeight }]}>
            <View style={styles.slideContent}>
              <SuccessVisual accent={selectedAccent} scrollX={scrollX} />

              <Text style={styles.lightTitle}>You're all set</Text>
              <Text style={styles.lightSubtitle}>
                {MODE_MESSAGES[selectedMode]}
              </Text>
            </View>
          </View>
        </Animated.ScrollView>

        {/* ─── Tap Zones for Prev / Next ─── */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.tapZoneLeft}
            onPress={handlePrev}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.tapZoneRight}
            onPress={handleNext}
            activeOpacity={1}
          />
        </View>
        </View>

        {/* ─── Footer: CTA ─── */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient
              colors={
                currentIndex === SLIDE_COUNT - 1
                  ? [selectedAccent, `${selectedAccent}DD`]
                  : ['#3B82F6', '#2563EB']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Text style={styles.ctaText}>{ctaLabels[currentIndex]}</Text>
              <Ionicons name={CTA_ICONS[currentIndex]} size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  slidesContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tapZoneLeft: {
    width: SW * 0.2,
    height: '100%',
  },
  tapZoneRight: {
    width: SW * 0.2,
    height: '100%',
  },

  // ─── Header ───
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  skipRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 6,
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    ...typography.callout,
    fontWeight: '500',
  },

  // ─── Slide Container ───
  slide: {
    width: SW,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },

  // ─── Slide 0: Welcome ───
  welcomeTextWrap: {
    alignItems: 'center',
    marginBottom: IS_SMALL ? spacing['2xl'] : spacing['3xl'],
  },
  brandText: {
    fontSize: 36,
    fontWeight: '200',
    letterSpacing: 14,
    color: 'white',
    opacity: 0.9,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.35)',
    marginTop: spacing.sm,
    textTransform: 'lowercase',
  },
  welcomeDescWrap: {
    alignItems: 'center',
    marginTop: IS_SMALL ? SH * 0.08 : SH * 0.12,
  },
  welcomeTitle: {
    fontSize: IS_SMALL ? 24 : 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: IS_SMALL ? 30 : 36,
    marginBottom: spacing.md,
  },
  welcomeSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  // ─── Slide 1: Features ───
  featureVisualWrap: {
    alignItems: 'center',
    marginBottom: IS_SMALL ? spacing.xl : spacing['3xl'],
  },
  featureCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_SMALL ? spacing.md : spacing.lg,
    marginBottom: spacing.xl,
  },
  featureCard: {
    width: IS_SMALL ? 88 : 100,
    height: IS_SMALL ? 105 : 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    ...typography.subhead,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },
  featurePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  darkTitle: {
    fontSize: IS_SMALL ? 24 : 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: IS_SMALL ? 30 : 36,
    marginBottom: spacing.md,
  },
  darkSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  // ─── Slide 2: Together ───
  connectionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: IS_SMALL ? spacing.xl : spacing['3xl'],
    width: 200,
    height: 200,
  },
  connectionLabels: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  connectionLabel: {
    ...typography.caption1,
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  lightTitle: {
    fontSize: IS_SMALL ? 24 : 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: IS_SMALL ? 30 : 36,
    marginBottom: spacing.md,
  },
  lightSubtitle: {
    ...typography.body,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  // ─── Slide 3: Mode Picker ───
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
    width: '100%',
  },
  modeCard: {
    width: (SW - spacing['2xl'] * 2 - spacing.md) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8ECF1',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  modeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  modeLabel: {
    ...typography.headline,
    color: '#1E293B',
    marginBottom: 2,
  },
  modeDesc: {
    ...typography.caption1,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 15,
  },
  modeCheck: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Slide 4: Launch ───
  successWrap: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: IS_SMALL ? spacing.xl : spacing['3xl'],
  },
  successGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  successRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleDot: {
    position: 'absolute',
  },

  // ─── Footer ───
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: IS_SMALL ? spacing.lg : spacing.xl,
    paddingTop: spacing.sm,
  },
  ctaBtn: {
    borderRadius: radius.full,
    paddingVertical: IS_SMALL ? 14 : spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  ctaText: {
    ...typography.headline,
    color: 'white',
  },
});
