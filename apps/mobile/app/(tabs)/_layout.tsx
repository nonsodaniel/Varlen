import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
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
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 82,
          paddingTop: 8,
          elevation: 0,
          shadowColor: '#1E3A5F',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarItemStyle: {
          gap: 2,
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
  const color = focused ? activeTint : '#9CA3AF';

  return (
    <View style={styles.tabWrap}>
      {focused && (
        <View style={[styles.activeIndicator, { backgroundColor: activeTint }]} />
      )}
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
