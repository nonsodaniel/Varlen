import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { colors } from '../../src/constants/theme';
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
        tabBarInactiveTintColor: '#94A3B8',
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 16,
          left: 20,
          right: 20,
          height: 70,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          borderTopWidth: 0,
          paddingHorizontal: 6,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
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
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => (
            <TabIcon
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
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
        <Text style={[styles.tabLabel, { color: activeTint, fontWeight: '700' }]}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabWrap}>
      <Ionicons name={icon} size={22} color="#94A3B8" />
      <Text style={[styles.tabLabel, { color: '#94A3B8' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
