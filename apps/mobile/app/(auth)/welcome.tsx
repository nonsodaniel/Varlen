import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../../src/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'heart',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
    accentColor: '#EF4444',
    title: 'Life, Together',
    subtitle: 'One place for everything you share — tasks, memories, plans, and more.',
  },
  {
    id: '2',
    icon: 'checkmark-circle',
    iconBg: '#D1FAE5',
    iconColor: '#10B981',
    accentColor: '#10B981',
    title: 'Stay in Sync',
    subtitle: 'Shared task lists, meal plans, and calendars so nothing falls through the cracks.',
  },
  {
    id: '3',
    icon: 'images',
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
    accentColor: '#3B82F6',
    title: 'Capture Memories',
    subtitle: 'Build a timeline of your life together with photos, notes, and milestones.',
  },
  {
    id: '4',
    icon: 'sparkles',
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
    accentColor: '#8B5CF6',
    title: 'AI-Powered Help',
    subtitle: 'Your personal assistant for meal ideas, budgets, date nights, and more.',
  },
];

const AUTO_ADVANCE_MS = 3500;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const dotScales = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1.4 : 1))).current;
  const dotWidths = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 24 : 8))).current;

  const animateDot = useCallback((next: number) => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotWidths[i], {
        toValue: i === next ? 24 : 8,
        useNativeDriver: false,
        speed: 20,
        bounciness: 4,
      }).start();
      Animated.spring(dotScales[i], {
        toValue: i === next ? 1.2 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }).start();
    });
  }, [dotScales, dotWidths]);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentIndex.current + 1) % SLIDES.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      currentIndex.current = next;
      setActiveIndex(next);
      animateDot(next);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [animateDot]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      currentIndex.current = idx;
      setActiveIndex(idx);
      animateDot(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      {/* Decorative circles */}
      <View style={[styles.decorCircleLg, { backgroundColor: item.iconBg, opacity: 0.35 }]} />
      <View style={[styles.decorCircleMd, { backgroundColor: item.iconBg, opacity: 0.25 }]} />

      {/* Icon container */}
      <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
        <View style={[styles.iconInner, { backgroundColor: item.accentColor }]}>
          <Ionicons name={item.icon} size={40} color="#FFFFFF" />
        </View>
      </View>

      {/* Text */}
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />

      {/* Brand mark */}
      <View style={[styles.brand, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.brandDot} />
        <Text style={styles.brandName}>sivena</Text>
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={styles.carousel}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotWidths[i],
                backgroundColor: i === activeIndex ? '#3B82F6' : '#CBD5E1',
              },
            ]}
          />
        ))}
      </View>

      {/* Auth buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSecondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
  },

  // Brand
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  brandName: {
    ...typography.title3,
    color: '#1E293B',
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Carousel
  carousel: {
    flexGrow: 0,
    height: SCREEN_HEIGHT * 0.52,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl * 1.5,
    position: 'relative',
  },

  // Decorative background circles
  decorCircleLg: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -20,
  },
  decorCircleMd: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: 40,
    right: 20,
  },

  // Icon
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  slideTitle: {
    ...typography.largeTitle,
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    ...typography.body,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Footer buttons
  footer: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginTop: 'auto',
  },
  btnPrimary: {
    backgroundColor: '#3B82F6',
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnSecondary: {
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  btnSecondaryText: {
    ...typography.subhead,
    color: '#1E293B',
    fontWeight: '600',
  },
});
