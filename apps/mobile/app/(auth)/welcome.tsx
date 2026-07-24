import React, { useRef, useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius } from '../../src/constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const SLIDE_HEIGHT = H * 0.64;
const AUTO_MS = 3800;

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
  iconColor: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'heart',
    gradient: ['#FF6B9D', '#FF9A67'],
    iconColor: '#FF6B9D',
    title: 'Life, Together',
    subtitle: 'One home for everything you share — tasks, memories, plans, and more.',
  },
  {
    id: '2',
    icon: 'checkmark-done-circle',
    gradient: ['#10B981', '#06B6D4'],
    iconColor: '#10B981',
    title: 'Stay in Sync',
    subtitle: 'Shared lists, meal plans, and calendars so nothing falls through the cracks.',
  },
  {
    id: '3',
    icon: 'images',
    gradient: ['#6366F1', '#8B5CF6'],
    iconColor: '#6366F1',
    title: 'Capture Memories',
    subtitle: 'Build a timeline of your life together with photos, notes, and milestones.',
  },
  {
    id: '4',
    icon: 'sparkles',
    gradient: ['#F59E0B', '#EF4444'],
    iconColor: '#F59E0B',
    title: 'AI at Your Side',
    subtitle: 'Your personal assistant for meal ideas, budgets, date nights, and more.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const curIdx = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Animated values — stable refs across renders
  const dotWidths = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 28 : 8))).current;
  const iconScales = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.8))).current;
  const textFades = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.5))).current;

  // Stable mutable ref so closures always call the latest version
  const goToRef = useRef((next: number) => {});
  goToRef.current = (next: number) => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotWidths[i], {
        toValue: i === next ? 28 : 8,
        useNativeDriver: false,
        speed: 18,
        bounciness: 3,
      }).start();
      Animated.spring(iconScales[i], {
        toValue: i === next ? 1 : 0.8,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }).start();
      Animated.timing(textFades[i], {
        toValue: i === next ? 1 : 0.5,
        duration: 280,
        useNativeDriver: true,
      }).start();
    });
    curIdx.current = next;
    setActiveIndex(next);
  };

  // Auto-advance
  useEffect(() => {
    const t = setInterval(() => {
      const next = (curIdx.current + 1) % SLIDES.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      goToRef.current(next);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const idx = viewableItems[0].index ?? 0;
        if (idx !== curIdx.current) goToRef.current(idx);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <LinearGradient
      colors={item.gradient as [string, string]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.slide}
    >
      {/* Decorative blobs */}
      <View style={styles.blobTR} />
      <View style={styles.blobBL} />
      <View style={styles.blobTL} />

      {/* Brand */}
      <View style={[styles.brand, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.brandDot} />
        <Text style={styles.brandName}>sivena</Text>
      </View>

      {/* Frosted icon stack (animated scale) */}
      <Animated.View style={[styles.iconRing1, { transform: [{ scale: iconScales[index] }] }]}>
        <View style={styles.iconRing2}>
          <View style={styles.iconCore}>
            <Ionicons name={item.icon} size={48} color={item.iconColor} />
          </View>
        </View>
      </Animated.View>

      {/* Text (animated fade) */}
      <Animated.View style={[styles.textBlock, { opacity: textFades[index] }]}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </Animated.View>
    </LinearGradient>
  );

  const activeGradient = SLIDES[activeIndex].gradient as [string, string];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sliding carousel */}
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
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        style={styles.carousel}
        scrollEventThrottle={16}
      />

      {/* Bottom white sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotWidths[i],
                  backgroundColor: i === activeIndex ? activeGradient[0] : '#CBD5E1',
                },
              ]}
            />
          ))}
        </View>

        {/* CTA buttons */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.88}
          style={styles.btnPrimaryWrap}
        >
          <LinearGradient
            colors={activeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
          style={styles.btnSecondary}
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
    backgroundColor: '#FFFFFF',
  },

  // Carousel
  carousel: {
    flexGrow: 0,
    height: SLIDE_HEIGHT,
  },
  slide: {
    width: W,
    height: SLIDE_HEIGHT,
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 44,
    borderBottomRightRadius: 44,
  },

  // Blobs
  blobTR: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -90,
    right: -90,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  blobBL: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: 0,
    left: -70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobTL: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    top: 80,
    left: -40,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  // Brand
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
  },
  brandDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // Frosted icon rings
  iconRing1: {
    width: 172,
    height: 172,
    borderRadius: 58,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconRing2: {
    width: 130,
    height: 130,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCore: {
    width: 94,
    height: 94,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },

  // Text
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 25,
    maxWidth: 300,
  },

  // Bottom sheet
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Buttons
  btnPrimaryWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  btnPrimary: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  btnSecondary: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
});
