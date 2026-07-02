import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors, shadows, radius, spacing } from '../../src/constants/theme';
import { useModeStore } from '../../src/stores/modeStore';
import { modeThemes } from '../../src/constants/theme';

export default function TabLayout() {
  const { mode } = useModeStore();
  const activeTint = modeThemes[mode].accent;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          height: 64,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          borderTopWidth: 0,
          paddingHorizontal: 8,
          ...shadows.lg,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabItem
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
            <TabItem
              icon={focused ? 'people' : 'people-outline'}
              label="Together"
              focused={focused}
              activeTint={activeTint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon={focused ? 'calendar' : 'calendar-outline'}
              label="Calendar"
              focused={focused}
              activeTint={activeTint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Life',
          tabBarIcon: ({ focused }) => (
            <TabItem
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
            <TabItem
              icon={focused ? 'person-circle' : 'person-circle-outline'}
              label="Profile"
              focused={focused}
              activeTint={activeTint}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabItem({
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
      <View style={[styles.activePill, { backgroundColor: activeTint + '14' }]}>
        <View style={[styles.activeIconDot, { backgroundColor: activeTint }]}>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </View>
        <Text style={[styles.activeLabel, { color: activeTint }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.inactiveWrap}>
      <Ionicons name={icon} size={22} color="#9CA3AF" />
    </View>
  );
}

const styles = StyleSheet.create({
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.full,
    gap: 6,
  },
  activeIconDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  inactiveWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
});
