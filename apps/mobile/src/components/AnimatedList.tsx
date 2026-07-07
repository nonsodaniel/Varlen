import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface AnimatedItemProps {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedItem({ children, index = 0, style }: AnimatedItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const delay = Math.min(index * 50, 300);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style as any, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style as any, { opacity }]}>
      {children}
    </Animated.View>
  );
}
