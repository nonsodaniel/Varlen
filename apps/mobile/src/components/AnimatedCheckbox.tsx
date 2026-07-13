import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../hooks/useHaptics';
import { useTheme } from '../contexts/ThemeContext';

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  size?: number;
}

export function AnimatedCheckbox({
  checked,
  onToggle,
  color,
  size = 24,
}: AnimatedCheckboxProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.success;

  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 250 });
  }, [checked]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', resolvedColor],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, resolvedColor],
    ),
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  const handleToggle = () => {
    scale.value = withSpring(0.8, { damping: 15, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    haptics.medium();
    onToggle();
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
      style={styles.wrapper}
    >
      <Animated.View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2 },
          circleStyle,
        ]}
      >
        <Animated.View style={iconStyle}>
          <Ionicons name="checkmark" size={size * 0.5} color={colors.surface} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 8,
  },
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
