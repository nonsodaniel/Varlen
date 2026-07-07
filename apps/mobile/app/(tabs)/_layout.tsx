import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, shadows } from '../../src/constants/theme';
import { useModeStore } from '../../src/stores/modeStore';
import { modeThemes } from '../../src/constants/theme';

export default function TabLayout() {
  const { mode } = useModeStore();
  const activeTint = modeThemes[mode].accent;
  const router = useRouter();

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: '#64748B',
        tabBarShowLabel: false,
        tabBarButton: (props) => (
          <Pressable {...props} android_ripple={null} />
        ),
        ...(Platform.OS === 'ios' ? {
          tabBarBackground: () => (
            <View style={styles.tabBarBgWrap}>
              <View style={styles.pillBg} />
              <View style={styles.bottomGlass}>
                <BlurView intensity={60} tint="default" style={StyleSheet.absoluteFill} />
                <View style={styles.bottomGlassOverlay} />
              </View>
            </View>
          ),
        } : {}),
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 16,
          marginHorizontal: 12,
          height: 70,
          backgroundColor: '#FFFFFF',
          borderRadius: 32,
          borderTopWidth: 0,
          paddingHorizontal: 8,
          paddingTop: 0,
          paddingBottom: 0,
          elevation: Platform.OS === 'android' ? 8 : 0,
          ...(Platform.OS === 'ios' ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            backgroundColor: 'transparent',
          } : {}),
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? 'today' : 'today-outline'}
              label="Today"
              focused={focused}
              activeTint={activeTint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'Together',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? 'people' : 'people-outline'}
              label="Together"
              focused={focused}
              activeTint={activeTint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/quick-add');
          },
        }}
        options={{
          title: 'Add',
          tabBarIcon: () => (
            <View style={styles.addBtnOuter}>
              <View style={[styles.addBtnGlow, { backgroundColor: activeTint + '18' }]} />
              <View style={[styles.addBtnCircle, { backgroundColor: activeTint, shadowColor: activeTint }]}>
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
            <TabIcon
              icon={focused ? 'apps' : 'apps-outline'}
              label="Life"
              focused={focused}
              activeTint={activeTint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? 'person-circle' : 'person-circle-outline'}
              label="Profile"
              focused={focused}
              activeTint={activeTint}
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
  );
}

function TabIcon({
  icon,
  label,
  focused,
  activeTint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  activeTint: string;
}) {
  if (focused) {
    return (
      <View style={styles.tabWrap}>
        <View style={[styles.activeCircle, { backgroundColor: activeTint }]}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </View>
        <Text style={[styles.tabLabel, { color: activeTint, fontWeight: '600' }]}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabWrap}>
      <Ionicons name={icon} size={22} color="#64748B" />
      <Text style={[styles.tabLabel, { color: '#64748B' }]}>{label}</Text>
    </View>
  );
}

const TAB_BOTTOM = Platform.OS === 'ios' ? 28 : 16;

const styles = StyleSheet.create({
  tabBarBgWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  pillBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    ...shadows.lg,
  },
  bottomGlass: {
    position: 'absolute',
    top: 70, // starts right below the pill
    left: -12, // extend full width (counter the margin)
    right: -12,
    height: TAB_BOTTOM,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  bottomGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(230,232,238,0.35)',
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
});
