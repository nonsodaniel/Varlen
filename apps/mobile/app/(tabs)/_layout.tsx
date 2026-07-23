import { useEffect, useRef } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet, Dimensions, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useModeStore } from '../../src/stores/modeStore';
import { modeThemes } from '../../src/constants/theme';
import { useTheme } from '../../src/contexts/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_BAR_MARGIN = 12;
const TAB_BAR_PAD = 8;
const TAB_BAR_WIDTH = SCREEN_WIDTH - TAB_BAR_MARGIN * 2;
const TAB_COUNT = 5;
const TAB_ITEM_WIDTH = (TAB_BAR_WIDTH - TAB_BAR_PAD * 2) / TAB_COUNT;
const INDICATOR_WIDTH = 56;

const ROUTE_TO_INDEX: Record<string, number> = {
  index: 0,
  people: 1,
  add: 2,
  lists: 3,
  profile: 4,
};

export default function TabLayout() {
  const { mode } = useModeStore();
  const activeTint = modeThemes[mode].accent;
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const navThrottleRef = useRef(false);
  const { colors, isDark } = useTheme();
  const tabBottom = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8) + 8;

  // Sliding indicator
  const activeIndex = useSharedValue(0);

  // Track route changes → slide indicator
  useEffect(() => {
    const seg = segments[1] ?? 'index';
    const idx = ROUTE_TO_INDEX[seg] ?? 0;
    activeIndex.value = withSpring(idx, { damping: 18, stiffness: 200 });
  }, [segments]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          TAB_BAR_PAD +
          activeIndex.value * TAB_ITEM_WIDTH +
          (TAB_ITEM_WIDTH - INDICATOR_WIDTH) / 2,
      },
    ],
  }));

  // Center button pulse
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <>
      <Tabs
        safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: tabBottom,
            marginHorizontal: TAB_BAR_MARGIN,
            height: 70,
            backgroundColor: colors.surface,
            borderRadius: 32,
            borderTopWidth: 0,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? colors.border : 'transparent',
            paddingHorizontal: TAB_BAR_PAD,
            paddingTop: 0,
            paddingBottom: 0,
            elevation: Platform.OS === 'android' ? 8 : 0,
            ...(Platform.OS === 'ios'
              ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                }
              : {}),
            overflow: 'visible',
          },
          tabBarItemStyle: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            height: 70,
            marginTop: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
          },
          tabBarIconStyle: {
            flex: 1,
            width: '100%',
          },
          tabBarBackground: () => (
            <Animated.View
              style={[
                styles.indicator,
                { backgroundColor: activeTint + '18' },
                indicatorStyle,
              ]}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                icon={focused ? 'today' : 'today-outline'}
                label="Today"
                focused={focused}
                activeTint={activeTint}
                isDark={isDark}
                textSecondary={colors.textSecondary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: 'Together',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                icon={focused ? 'people' : 'people-outline'}
                label="Together"
                focused={focused}
                activeTint={activeTint}
                isDark={isDark}
                textSecondary={colors.textSecondary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              if (navThrottleRef.current) return;
              navThrottleRef.current = true;
              setTimeout(() => { navThrottleRef.current = false; }, 600);
              try { router.push('/quick-add'); } catch {}
            },
          }}
          options={{
            title: 'Add',
            tabBarIcon: () => (
              <View style={styles.addBtnOuter}>
                <Animated.View
                  style={[
                    styles.addBtnGlow,
                    { backgroundColor: activeTint + '18' },
                    pulseStyle,
                  ]}
                />
                <View
                  style={[
                    styles.addBtnCircle,
                    { backgroundColor: activeTint, shadowColor: activeTint },
                  ]}
                >
                  <Ionicons name="add" size={26} color="#FFFFFF" />
                </View>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="lists"
          options={{
            title: 'Life',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                icon={focused ? 'apps' : 'apps-outline'}
                label="Life"
                focused={focused}
                activeTint={activeTint}
                isDark={isDark}
                textSecondary={colors.textSecondary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                icon={focused ? 'person-circle' : 'person-circle-outline'}
                label="Profile"
                focused={focused}
                activeTint={activeTint}
                isDark={isDark}
                textSecondary={colors.textSecondary}
              />
            ),
          }}
        />
        {/* Hide calendar from tab bar -- accessible from home screen links */}
        <Tabs.Screen
          name="calendar"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Floating AI Button – subtle, smaller, translucent */}
      <RNTouchableOpacity
        style={[styles.aiFab, { bottom: tabBottom + 82 }]}
        onPress={() => router.push('/ai-chat' as any)}
        activeOpacity={0.75}
      >
        <View style={[styles.aiFabInner, { backgroundColor: isDark ? 'rgba(139,92,246,0.85)' : 'rgba(139,92,246,0.9)' }]}>
          <Ionicons name="aperture-outline" size={15} color="#FFFFFF" />
        </View>
      </RNTouchableOpacity>

      <View style={styles.bottomGlass} pointerEvents="none">
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={50}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(19,21,26,0.8)' : 'rgba(240,240,245,0.7)' }]} />
        )}
      </View>
    </>
  );
}

function AnimatedTabIcon({
  icon,
  label,
  focused,
  activeTint,
  isDark,
  textSecondary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  activeTint: string;
  isDark: boolean;
  textSecondary: string;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(0.82, { damping: 12, stiffness: 400 }),
        withSpring(1.08, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    }
  }, [focused]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const inactiveColor = textSecondary;

  if (focused) {
    return (
      <Animated.View style={[styles.tabWrap, bounceStyle]}>
        <View style={[styles.activeCircle, { backgroundColor: activeTint }]}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </View>
        <Text style={[styles.tabLabel, { color: activeTint, fontWeight: '600' }]}>
          {label}
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={styles.tabWrap}>
      <Ionicons name={icon} size={22} color={inactiveColor} />
      <Text style={[styles.tabLabel, { color: inactiveColor }]}>{label}</Text>
    </View>
  );
}

const TAB_BOTTOM = Platform.OS === 'ios' ? 28 : 16;

const styles = StyleSheet.create({
  bottomGlass: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BOTTOM,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    bottom: 14,
    width: INDICATOR_WIDTH,
    height: 36,
    borderRadius: 18,
  },
  tabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  addBtnOuter: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: -12,
  },
  addBtnGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  addBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  aiFab: {
    position: 'absolute',
    right: 18,
    zIndex: 999,
  },
  aiFabInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
});
