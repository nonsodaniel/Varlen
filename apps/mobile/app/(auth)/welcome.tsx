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
const SLIDE_HEIGHT = H * 0.65;
const AUTO_MS = 3800;

interface Slide {
  id: string;
  gradient: string[];
  accentLight: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    gradient: ['#FF6B9D', '#FF9A67'],
    accentLight: '#FFE4EC',
    title: 'Life, Together',
    subtitle: 'One home for everything you share — tasks, memories, plans, and more.',
  },
  {
    id: '2',
    gradient: ['#10B981', '#06B6D4'],
    accentLight: '#D1FAE5',
    title: 'Stay in Sync',
    subtitle: 'Shared lists, meal plans, and calendars so nothing falls through the cracks.',
  },
  {
    id: '3',
    gradient: ['#6366F1', '#8B5CF6'],
    accentLight: '#EDE9FE',
    title: 'Capture Memories',
    subtitle: 'Build a timeline of your life together — photos, notes, and milestones.',
  },
  {
    id: '4',
    gradient: ['#F59E0B', '#EF4444'],
    accentLight: '#FEF3C7',
    title: 'AI at Your Side',
    subtitle: 'Your personal assistant for meal ideas, budgets, date nights, and more.',
  },
];

// ── Shared card primitives ──────────────────────────────────────────
const card = (extra?: object) =>
  ({
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 7,
    padding: 14,
    ...extra,
  } as const);

const badge = (bg: string, extra?: object) =>
  ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: bg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    ...extra,
  } as const);

const badgeText = { fontSize: 11, fontWeight: '600' as const, color: '#1E293B' };
const cardTitle = { fontSize: 11, fontWeight: '700' as const, color: '#1E293B', letterSpacing: 0.3 };

// ── Scene 1: Shared tasks card ──────────────────────────────────────
function SceneLife() {
  const tasks = [
    { label: 'Morning walk', done: true },
    { label: 'Grocery run', done: true },
    { label: 'Cook dinner', done: false },
  ];
  return (
    <View style={{ width: W - 72, alignItems: 'center' }}>
      <View style={card({ width: '100%' })}>
        {/* Card header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF6B9D', marginRight: 6 }} />
          <Text style={cardTitle}>Today Together</Text>
          <View style={{ marginLeft: 'auto', backgroundColor: '#FFF0F5', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, color: '#FF6B9D', fontWeight: '600' }}>2 / 3 done</Text>
          </View>
        </View>
        {tasks.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
            <View style={{
              width: 18, height: 18, borderRadius: 9,
              backgroundColor: t.done ? '#10B981' : 'transparent',
              borderWidth: t.done ? 0 : 1.5, borderColor: '#CBD5E1',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {t.done && <Ionicons name="checkmark" size={10} color="#fff" />}
            </View>
            <Text style={{ fontSize: 13, color: t.done ? '#94A3B8' : '#334155', textDecorationLine: t.done ? 'line-through' : 'none' }}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Floating row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
        {/* Avatar pair */}
        <View style={{ flexDirection: 'row' }}>
          {['#FFE0EC', '#FFD0E3'].map((bg, i) => (
            <View key={i} style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
              marginLeft: i > 0 ? -10 : 0, zIndex: 2 - i,
            }}>
              <Ionicons name="person" size={16} color="#FF6B9D" />
            </View>
          ))}
        </View>
        {/* Streak badge */}
        <View style={badge('rgba(255,255,255,0.95)')}>
          <Ionicons name="flame" size={12} color="#F97316" />
          <Text style={badgeText}>5-day streak</Text>
        </View>
      </View>
    </View>
  );
}

// ── Scene 2: Meal plan + sync ───────────────────────────────────────
function SceneSync() {
  const items = [
    { icon: 'restaurant-outline' as const, color: '#F59E0B', label: 'Pasta night' },
    { icon: 'fish-outline' as const, color: '#06B6D4', label: 'Salmon & rice' },
    { icon: 'pizza-outline' as const, color: '#EF4444', label: 'Pizza Friday' },
  ];
  return (
    <View style={{ width: W - 72, gap: 10 }}>
      {/* Main card */}
      <View style={card({})}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="calendar" size={13} color="#10B981" style={{ marginRight: 6 }} />
          <Text style={cardTitle}>This Week's Meals</Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: `${item.color}20`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.icon} size={14} color={item.color} />
            </View>
            <Text style={{ fontSize: 13, color: '#334155', flex: 1 }}>{item.label}</Text>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          </View>
        ))}
      </View>

      {/* Stat badges row */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ ...badge('rgba(255,255,255,0.95)'), flex: 1, justifyContent: 'center' }}>
          <Ionicons name="list-circle" size={13} color="#10B981" />
          <Text style={badgeText}>12 tasks done</Text>
        </View>
        <View style={{ ...badge('rgba(255,255,255,0.95)'), flex: 1, justifyContent: 'center' }}>
          <Ionicons name="people" size={13} color="#06B6D4" />
          <Text style={badgeText}>In sync</Text>
        </View>
      </View>
    </View>
  );
}

// ── Scene 3: Stacked photo cards ────────────────────────────────────
function SceneMemories() {
  const photos = [
    { color: '#C7D2FE', icon: 'sunny-outline' as const, label: 'Beach Day', date: 'Jul 14' },
    { color: '#DDD6FE', icon: 'restaurant-outline' as const, label: 'Anniversary', date: 'Dec 21' },
    { color: '#E0E7FF', icon: 'camera-outline' as const, label: 'Weekend Trip', date: 'Aug 3' },
  ];
  return (
    <View style={{ width: W - 72, height: 200, justifyContent: 'center', alignItems: 'center' }}>
      {/* Stacked rotated cards */}
      {photos.map((p, i) => {
        const rotations = ['-7deg', '4deg', '0deg'];
        const tops = [10, 0, -8];
        const lefts = [-20, 22, 0];
        const zIndexes = [1, 2, 3];
        return (
          <View
            key={i}
            style={[
              card({ padding: 10, width: 140, position: 'absolute' }),
              { transform: [{ rotate: rotations[i] }], top: tops[i], left: lefts[i], zIndex: zIndexes[i] },
            ]}
          >
            <View style={{ width: '100%', height: 70, borderRadius: 10, backgroundColor: p.color, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name={p.icon} size={28} color="#6366F1" />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{p.label}</Text>
            <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{p.date}</Text>
          </View>
        );
      })}

      {/* Heart badge floating */}
      <View style={[badge('rgba(255,255,255,0.97)'), { position: 'absolute', bottom: 0, right: 0, zIndex: 10 }]}>
        <Ionicons name="heart" size={12} color="#EF4444" />
        <Text style={badgeText}>24 memories</Text>
      </View>
    </View>
  );
}

// ── Scene 4: AI chat mockup ─────────────────────────────────────────
function SceneAI() {
  return (
    <View style={{ width: W - 72, gap: 8 }}>
      {/* Bot bubble */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="sparkles" size={13} color="#fff" />
        </View>
        <View style={card({ borderBottomLeftRadius: 4, padding: 10, maxWidth: '75%' })}>
          <Text style={{ fontSize: 12, color: '#334155' }}>Hi! What can I help{'\n'}you plan today? ✨</Text>
        </View>
      </View>

      {/* User bubble */}
      <View style={{ alignSelf: 'flex-end', alignItems: 'flex-end' }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 14, borderBottomRightRadius: 4, padding: 10, maxWidth: '75%' }}>
          <Text style={{ fontSize: 12, color: '#fff' }}>Plan a date night 🌙</Text>
        </View>
      </View>

      {/* Bot response */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="sparkles" size={13} color="#fff" />
        </View>
        <View style={card({ borderBottomLeftRadius: 4, padding: 10, maxWidth: '78%' })}>
          <Text style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>Great idea! Here are 3 ideas:</Text>
          {['🍷 Rooftop wine & dinner', '🎭 Show + late-night walk', '🍳 Cook together at home'].map((idea, i) => (
            <Text key={i} style={{ fontSize: 11, color: '#64748B', marginBottom: i < 2 ? 3 : 0 }}>{idea}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const SCENES = [SceneLife, SceneSync, SceneMemories, SceneAI];

// ── Main screen ──────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const curIdx = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const dotWidths = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 28 : 8))).current;
  const sceneScales = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.88))).current;
  const sceneFades = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.55))).current;
  const textFades = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.55))).current;

  const goToRef = useRef((_: number) => {});
  goToRef.current = (next: number) => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotWidths[i], { toValue: i === next ? 28 : 8, useNativeDriver: false, speed: 18, bounciness: 3 }).start();
      Animated.spring(sceneScales[i], { toValue: i === next ? 1 : 0.88, useNativeDriver: true, speed: 12, bounciness: 5 }).start();
      Animated.timing(sceneFades[i], { toValue: i === next ? 1 : 0.55, duration: 260, useNativeDriver: true }).start();
      Animated.timing(textFades[i], { toValue: i === next ? 1 : 0.55, duration: 260, useNativeDriver: true }).start();
    });
    curIdx.current = next;
    setActiveIndex(next);
  };

  useEffect(() => {
    const t = setInterval(() => {
      const next = (curIdx.current + 1) % SLIDES.length;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      goToRef.current(next);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      if (idx !== curIdx.current) goToRef.current(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    const Scene = SCENES[index];
    return (
      <LinearGradient
        colors={item.gradient as [string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={ss.slide}
      >
        {/* Decorative blobs */}
        <View style={ss.blobTR} />
        <View style={ss.blobBL} />

        {/* Brand */}
        <View style={[ss.brand, { paddingTop: insets.top + spacing.sm }]}>
          <View style={ss.brandDot} />
          <Text style={ss.brandName}>sivena</Text>
        </View>

        {/* Scene illustration (animated) */}
        <Animated.View style={[ss.sceneWrap, { transform: [{ scale: sceneScales[index] }], opacity: sceneFades[index] }]}>
          <Scene />
        </Animated.View>

        {/* Text */}
        <Animated.View style={[ss.textBlock, { opacity: textFades[index] }]}>
          <Text style={ss.title}>{item.title}</Text>
          <Text style={ss.subtitle}>{item.subtitle}</Text>
        </Animated.View>
      </LinearGradient>
    );
  };

  const activeGradient = SLIDES[activeIndex].gradient as [string, string];

  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
        style={{ flexGrow: 0, height: SLIDE_HEIGHT }}
        scrollEventThrottle={16}
      />

      {/* Bottom sheet */}
      <View style={[ss.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={ss.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[ss.dot, { width: dotWidths[i], backgroundColor: i === activeIndex ? activeGradient[0] : '#CBD5E1' }]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.88} style={ss.btnPrimaryWrap}>
          <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ss.btnPrimary}>
            <Text style={ss.btnPrimaryText}>Get Started</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7} style={ss.btnSecondary}>
          <Text style={ss.btnSecondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  slide: {
    width: W, height: SLIDE_HEIGHT,
    alignItems: 'center', overflow: 'hidden',
    borderBottomLeftRadius: 44, borderBottomRightRadius: 44,
  },

  blobTR: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -80, backgroundColor: 'rgba(255,255,255,0.1)' },
  blobBL: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 0, left: -60, backgroundColor: 'rgba(255,255,255,0.07)' },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  brandDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.9)' },
  brandName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },

  sceneWrap: { marginBottom: 22, alignItems: 'center' },

  textBlock: { alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.6, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 23, maxWidth: 300 },

  sheet: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: spacing.xs },
  dot: { height: 8, borderRadius: 4 },

  btnPrimaryWrap: { borderRadius: radius.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 18, elevation: 8 },
  btnPrimary: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  btnSecondary: { height: 48, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
});
