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
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: 80,
          paddingTop: 6,
          elevation: 0,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
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
  const color = focused ? activeTint : '#94A3B8';

  return (
    <View style={styles.tabWrap}>
      <Ionicons name={icon} size={21} color={color} />
      <Text
        style={[
          styles.tabLabel,
          { color, fontWeight: focused ? '700' : '500' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
