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
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Path, Ellipse } from 'react-native-svg';
import { spacing, radius } from '../../src/constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const SLIDE_HEIGHT = H * 0.65;
const AUTO_MS = 4000;

// ── Slides metadata ───────────────────────────────────────────────────
interface Slide {
  id: string;
  gradient: string[];
  title: string;
  subtitle: string;
}
const SLIDES: Slide[] = [
  { id: '1', gradient: ['#FF6B9D', '#FF9A67'], title: 'Life, Together', subtitle: 'One home for everything you share — tasks, memories, plans, and more.' },
  { id: '2', gradient: ['#10B981', '#06B6D4'], title: 'Stay in Sync', subtitle: 'Shared lists, meal plans, and calendars so nothing falls through the cracks.' },
  { id: '3', gradient: ['#6366F1', '#8B5CF6'], title: 'Capture Memories', subtitle: 'Build a timeline of your life together — photos, notes, and milestones.' },
  { id: '4', gradient: ['#F59E0B', '#EF4444'], title: 'Smart Assistant', subtitle: 'Your personal assistant for meal ideas, budgets, date nights, and more.' },
  { id: '5', gradient: ['#059669', '#0EA5E9'], title: 'Budget Together', subtitle: 'Track spending, set limits, and reach your financial goals as a team.' },
];

// ── Reusable float hook ───────────────────────────────────────────────
function useLoop(from: number, to: number, ms: number, delay = 0) {
  const v = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: to, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: from, duration: ms, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return v;
}

// ── Flat character SVG ────────────────────────────────────────────────
type HairStyle = 'short' | 'long' | 'bun';
type ArmPose = 'down' | 'up' | 'wave' | 'holdPhone';

interface CharProps {
  skin?: string; hair?: string; shirt?: string; pants?: string;
  hairStyle?: HairStyle; arms?: ArmPose; w?: number; h?: number;
}
function Char({ skin = '#FDBCB4', hair = '#3D2010', shirt = '#FFFFFF', pants = '#334155', hairStyle = 'short', arms = 'down', w = 64, h = 130 }: CharProps) {
  return (
    <Svg width={w} height={h} viewBox="-32 -108 64 138">
      {/* Hair */}
      {hairStyle === 'long' ? (
        <>
          <Ellipse cx={0} cy={-87} rx={22} ry={13} fill={hair} />
          <Rect x={-22} y={-88} width={9} height={36} rx={4} fill={hair} />
          <Rect x={13} y={-88} width={9} height={36} rx={4} fill={hair} />
        </>
      ) : hairStyle === 'bun' ? (
        <>
          <Ellipse cx={0} cy={-88} rx={22} ry={9} fill={hair} />
          <Circle cx={0} cy={-94} r={9} fill={hair} />
        </>
      ) : (
        <Ellipse cx={0} cy={-88} rx={22} ry={10} fill={hair} />
      )}
      {/* Head */}
      <Circle cx={0} cy={-72} r={22} fill={skin} />
      {/* Eyes */}
      <Circle cx={-7} cy={-75} r={3} fill="#1A1A2E" /><Circle cx={7} cy={-75} r={3} fill="#1A1A2E" />
      <Circle cx={-5.5} cy={-77} r={1.2} fill="#fff" /><Circle cx={8.5} cy={-77} r={1.2} fill="#fff" />
      {/* Smile */}
      <Path d="M-7,-65 Q0,-59 7,-65" stroke="#1A1A2E" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      {/* Body */}
      <Rect x={-15} y={-50} width={30} height={50} rx={10} fill={shirt} />
      {/* Arms */}
      {arms === 'down' && (<>
        <Path d="M-15,-37 Q-30,-24 -28,-6" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Path d="M15,-37 Q30,-24 28,-6" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
      </>)}
      {arms === 'up' && (<>
        <Path d="M-15,-37 Q-34,-54 -29,-72" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Path d="M15,-37 Q34,-54 29,-72" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
      </>)}
      {arms === 'wave' && (<>
        <Path d="M-15,-37 Q-30,-24 -28,-6" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Path d="M15,-37 Q36,-52 32,-70" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
      </>)}
      {arms === 'holdPhone' && (<>
        <Path d="M-15,-37 Q-30,-24 -28,-6" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Path d="M15,-37 Q30,-20 27,-4" stroke={skin} strokeWidth={11} strokeLinecap="round" fill="none" />
      </>)}
      {/* Legs */}
      <Rect x={-13} y={0} width={11} height={30} rx={5} fill={pants} />
      <Rect x={2} y={0} width={11} height={30} rx={5} fill={pants} />
    </Svg>
  );
}

// ── Scene 1: Couple bobbing, floating heart ───────────────────────────
function SceneCouple() {
  const p1y = useLoop(0, -9, 2000);
  const p2y = useLoop(0, -9, 2000, 600);
  const heartY = useLoop(0, -14, 1600, 200);
  const heartO = useLoop(0.7, 1, 1600, 200);
  return (
    <View style={sc.root}>
      {/* Person 1 - feminine */}
      <Animated.View style={[sc.charLeft, { transform: [{ translateY: p1y }] }]}>
        <Char skin="#FDBCB4" hair="#4A2C0A" shirt="rgba(255,255,255,0.95)" pants="#F9A8D4" hairStyle="long" arms="wave" />
      </Animated.View>
      {/* Person 2 - masculine */}
      <Animated.View style={[sc.charRight, { transform: [{ translateY: p2y }] }]}>
        <Char skin="#F0A070" hair="#1C1C1C" shirt="rgba(255,255,255,0.95)" pants="#FBCFE8" hairStyle="short" arms="down" />
      </Animated.View>
      {/* Floating heart */}
      <Animated.View style={[sc.heartCenter, { transform: [{ translateY: heartY }], opacity: heartO }]}>
        <Ionicons name="heart" size={36} color="rgba(255,255,255,0.95)" />
      </Animated.View>
      {/* Small sparkles */}
      <Animated.View style={[sc.sparkTL, { transform: [{ translateY: useLoop(0, -6, 1800, 400) }] }]}>
        <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.7)" />
      </Animated.View>
      <Animated.View style={[sc.sparkTR, { transform: [{ translateY: useLoop(0, -8, 2200) }] }]}>
        <Ionicons name="star" size={12} color="rgba(255,255,255,0.6)" />
      </Animated.View>
      {/* Ground shadow */}
      <View style={sc.shadow} />
    </View>
  );
}

// ── Scene 2: Person celebrating, checkmarks fly in ────────────────────
function SceneSync() {
  const charY = useLoop(0, -10, 1800);
  const check1y = useLoop(0, -16, 1400, 0);
  const check2y = useLoop(0, -14, 1600, 300);
  const check3y = useLoop(0, -12, 1900, 600);
  const check1o = useLoop(0.5, 1, 1400, 0);
  const check2o = useLoop(0.5, 1, 1600, 300);
  const check3o = useLoop(0.5, 1, 1900, 600);
  return (
    <View style={sc.root}>
      {/* Celebratory person */}
      <Animated.View style={[sc.charCenter, { transform: [{ translateY: charY }] }]}>
        <Char skin="#FDBCB4" hair="#2D2D2D" shirt="rgba(255,255,255,0.95)" pants="#A7F3D0" hairStyle="bun" arms="up" w={70} h={140} />
      </Animated.View>
      {/* Flying checkmarks */}
      <Animated.View style={[sc.check1, { transform: [{ translateY: check1y }], opacity: check1o }]}>
        <View style={sc.checkBadge}><Ionicons name="checkmark-circle" size={26} color="rgba(255,255,255,0.95)" /></View>
      </Animated.View>
      <Animated.View style={[sc.check2, { transform: [{ translateY: check2y }], opacity: check2o }]}>
        <View style={sc.checkBadge}><Ionicons name="checkmark-circle" size={22} color="rgba(255,255,255,0.8)" /></View>
      </Animated.View>
      <Animated.View style={[sc.check3, { transform: [{ translateY: check3y }], opacity: check3o }]}>
        <View style={sc.checkBadge}><Ionicons name="checkmark-circle" size={18} color="rgba(255,255,255,0.7)" /></View>
      </Animated.View>
      {/* Mini card */}
      <View style={sc.miniCard}>
        <Text style={sc.miniCardTitle}>✓ 12 tasks done</Text>
      </View>
      <View style={sc.shadow} />
    </View>
  );
}

// ── Scene 3: Couple selfie, polaroid floats up ────────────────────────
function SceneMemories() {
  const p1y = useLoop(0, -8, 2100);
  const p2y = useLoop(0, -8, 2100, 500);
  const photoY = useLoop(0, -12, 2400, 200);
  const photoR = useLoop(-3, 3, 3000);
  return (
    <View style={sc.root}>
      {/* Person 1 holding phone up */}
      <Animated.View style={[sc.charLeft, { transform: [{ translateY: p1y }] }]}>
        <Char skin="#FDBCB4" hair="#4A2C0A" shirt="rgba(255,255,255,0.95)" pants="#C4B5FD" hairStyle="long" arms="holdPhone" />
      </Animated.View>
      {/* Person 2 */}
      <Animated.View style={[sc.charRight, { transform: [{ translateY: p2y }] }]}>
        <Char skin="#C68642" hair="#1C1C1C" shirt="rgba(255,255,255,0.95)" pants="#DDD6FE" hairStyle="short" arms="wave" />
      </Animated.View>
      {/* Floating polaroid photo */}
      <Animated.View style={[sc.polaroid, { transform: [{ translateY: photoY }, { rotate: photoR.interpolate({ inputRange: [-3, 3], outputRange: ['-3deg', '3deg'] }) }] }]}>
        <View style={sc.polaroidInner}>
          <View style={sc.photoArea}>
            <Ionicons name="camera" size={22} color="#6366F1" />
          </View>
          <Text style={sc.polaroidLabel}>Us 📸</Text>
        </View>
      </Animated.View>
      {/* Star sparkle */}
      <Animated.View style={[sc.sparkTL, { transform: [{ translateY: useLoop(0, -10, 2000) }] }]}>
        <Ionicons name="star" size={16} color="rgba(255,255,255,0.8)" />
      </Animated.View>
      <View style={sc.shadow} />
    </View>
  );
}

// ── Scene 4: AI chat — person + floating bubbles ───────────────────────
function SceneAI() {
  const charY = useLoop(0, -8, 2000);
  const bubble1Y = useLoop(0, -8, 1800, 0);
  const bubble2Y = useLoop(0, -10, 2200, 400);
  const sparkleO = useLoop(0.5, 1, 1200);
  return (
    <View style={sc.root}>
      {/* Person with phone */}
      <Animated.View style={[sc.charCenterLeft, { transform: [{ translateY: charY }] }]}>
        <Char skin="#F0C8A0" hair="#2D2D2D" shirt="rgba(255,255,255,0.95)" pants="#FDE68A" hairStyle="short" arms="holdPhone" w={64} h={130} />
      </Animated.View>
      {/* AI bot avatar */}
      <View style={sc.botAvatar}>
        <Animated.View style={{ opacity: sparkleO }}>
          <Ionicons name="sparkles" size={20} color="#F59E0B" />
        </Animated.View>
      </View>
      {/* Chat bubbles */}
      <Animated.View style={[sc.chatBubble1, { transform: [{ translateY: bubble1Y }] }]}>
        <View style={sc.bubble}>
          <Text style={sc.bubbleText}>Plan date night 🌙</Text>
        </View>
      </Animated.View>
      <Animated.View style={[sc.chatBubble2, { transform: [{ translateY: bubble2Y }] }]}>
        <View style={[sc.bubble, sc.bubbleBot]}>
          <Text style={sc.bubbleBotText}>3 ideas ready ✨</Text>
        </View>
      </Animated.View>
      <View style={sc.shadow} />
    </View>
  );
}

// ── Scene 5: Finance — two people, floating coins, budget card ────────
function SceneFinance() {
  const p1y = useLoop(0, -9, 2100);
  const p2y = useLoop(0, -9, 2100, 700);
  const coin1y = useLoop(0, -14, 1600, 0);
  const coin2y = useLoop(0, -12, 1900, 400);
  const coin3y = useLoop(0, -10, 2200, 800);
  return (
    <View style={sc.root}>
      {/* Person 1 */}
      <Animated.View style={[sc.charLeft, { transform: [{ translateY: p1y }] }]}>
        <Char skin="#FDBCB4" hair="#4A2C0A" shirt="rgba(255,255,255,0.95)" pants="#A7F3D0" hairStyle="bun" arms="wave" />
      </Animated.View>
      {/* Person 2 */}
      <Animated.View style={[sc.charRight, { transform: [{ translateY: p2y }] }]}>
        <Char skin="#C68642" hair="#1C1C1C" shirt="rgba(255,255,255,0.95)" pants="#BAE6FD" hairStyle="short" arms="holdPhone" />
      </Animated.View>
      {/* Floating coins */}
      <Animated.View style={[sc.sparkTL, { left: 28, top: 20, transform: [{ translateY: coin1y }] }]}>
        <Ionicons name="cash-outline" size={26} color="rgba(255,255,255,0.92)" />
      </Animated.View>
      <Animated.View style={[sc.sparkTR, { right: 28, top: 14, transform: [{ translateY: coin2y }] }]}>
        <Ionicons name="wallet-outline" size={22} color="rgba(255,255,255,0.82)" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 48, left: '45%', transform: [{ translateY: coin3y }] }]}>
        <Ionicons name="trending-up" size={18} color="rgba(255,255,255,0.75)" />
      </Animated.View>
      {/* Mini budget card */}
      <View style={[sc.miniCard, { bottom: 14, paddingHorizontal: 14, paddingVertical: 8 }]}>
        <Text style={[sc.miniCardTitle, { color: '#059669' }]}>💰 Saved $420 this month</Text>
      </View>
      <View style={sc.shadow} />
    </View>
  );
}

const SCENES = [SceneCouple, SceneSync, SceneMemories, SceneAI, SceneFinance];

// ── Shared scene styles ───────────────────────────────────────────────
const sc = StyleSheet.create({
  root: { width: W - 60, height: 210, position: 'relative', alignItems: 'center' },
  charLeft: { position: 'absolute', bottom: 12, left: 20 },
  charRight: { position: 'absolute', bottom: 12, right: 20 },
  charCenter: { position: 'absolute', bottom: 12 },
  charCenterLeft: { position: 'absolute', bottom: 12, left: 30 },
  heartCenter: { position: 'absolute', top: 24, alignSelf: 'center' },
  sparkTL: { position: 'absolute', top: 10, left: 20 },
  sparkTR: { position: 'absolute', top: 20, right: 18 },
  shadow: { position: 'absolute', bottom: 2, left: 40, right: 40, height: 10, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.08)' },
  check1: { position: 'absolute', top: 18, left: 16 },
  check2: { position: 'absolute', top: 28, right: 20 },
  check3: { position: 'absolute', top: 10, right: 60 },
  checkBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 2 },
  miniCard: {
    position: 'absolute', bottom: 16, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  miniCardTitle: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  polaroid: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  polaroidInner: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 6, width: 80 },
  photoArea: { width: '100%', height: 58, backgroundColor: '#EDE9FE', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  polaroidLabel: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center' },
  botAvatar: {
    position: 'absolute', top: 14, right: 24,
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  chatBubble1: { position: 'absolute', top: 16, left: 10 },
  chatBubble2: { position: 'absolute', top: 68, right: 10 },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  bubbleBot: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  bubbleBotText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});

// ── Main screen ───────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const curIdx = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const dotWidths = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 28 : 8))).current;
  const sceneScales = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.9))).current;
  const sceneFades = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.6))).current;
  const textFades = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.6))).current;

  const goToRef = useRef((_: number) => {});
  goToRef.current = (next: number) => {
    SLIDES.forEach((_, i) => {
      Animated.spring(dotWidths[i], { toValue: i === next ? 28 : 8, useNativeDriver: false, speed: 18, bounciness: 3 }).start();
      Animated.spring(sceneScales[i], { toValue: i === next ? 1 : 0.9, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
      Animated.timing(sceneFades[i], { toValue: i === next ? 1 : 0.6, duration: 260, useNativeDriver: true }).start();
      Animated.timing(textFades[i], { toValue: i === next ? 1 : 0.6, duration: 260, useNativeDriver: true }).start();
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
      <LinearGradient colors={item.gradient as [string, string]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={ms.slide}>
        <View style={ms.blobTR} /><View style={ms.blobBL} />
        {/* Brand */}
        <View style={[ms.brand, { paddingTop: insets.top + spacing.sm }]}>
          <View style={ms.brandDot} />
          <Text style={ms.brandName}>sivena</Text>
        </View>
        {/* Scene */}
        <Animated.View style={{ transform: [{ scale: sceneScales[index] }], opacity: sceneFades[index] }}>
          <Scene />
        </Animated.View>
        {/* Text */}
        <Animated.View style={[ms.textBlock, { opacity: textFades[index] }]}>
          <Text style={ms.title}>{item.title}</Text>
          <Text style={ms.subtitle}>{item.subtitle}</Text>
        </Animated.View>
      </LinearGradient>
    );
  };

  const activeGradient = SLIDES[activeIndex].gradient as [string, string];

  return (
    <View style={ms.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <FlatList
        ref={flatListRef} data={SLIDES} renderItem={renderSlide} keyExtractor={(s) => s.id}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false}
        onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        style={{ flexGrow: 0, height: SLIDE_HEIGHT }} scrollEventThrottle={16}
      />
      {/* Bottom sheet */}
      <View style={[ms.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={ms.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View key={i} style={[ms.dot, { width: dotWidths[i], backgroundColor: i === activeIndex ? activeGradient[0] : '#CBD5E1' }]} />
          ))}
        </View>
        <View style={ms.btnGroup}>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.88} style={ms.btnWrap}>
            <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ms.btnPrimary}>
              <Text style={ms.btnPrimaryText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7} style={ms.btnSecondary}>
            <Text style={ms.btnSecondaryText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  slide: { width: W, height: SLIDE_HEIGHT, alignItems: 'center', overflow: 'hidden', borderBottomLeftRadius: 44, borderBottomRightRadius: 44 },
  blobTR: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -80, backgroundColor: 'rgba(255,255,255,0.1)' },
  blobBL: { position: 'absolute', width: 220, height: 220, borderRadius: 110, bottom: 0, left: -60, backgroundColor: 'rgba(255,255,255,0.07)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  brandDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.9)' },
  brandName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  textBlock: { alignItems: 'center', paddingHorizontal: 32, marginTop: 16 },
  title: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.6, lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 23, maxWidth: 300 },
  sheet: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, justifyContent: 'space-between' },
  btnGroup: { gap: spacing.md },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: spacing.xs },
  dot: { height: 8, borderRadius: 4 },
  btnWrap: { borderRadius: radius.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 18, elevation: 8 },
  btnPrimary: { height: 58, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  btnSecondary: { height: 48, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
});
