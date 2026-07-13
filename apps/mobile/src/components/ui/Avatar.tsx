import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  color?: string;
  accessible?: boolean;
}

export function Avatar({
  name,
  imageUrl,
  size = 40,
  color,
  accessible = true,
}: AvatarProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary;
  const [imageError, setImageError] = useState(false);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const renderFallback = () => (
    <View
      accessible={accessible}
      accessibilityLabel={`${name} avatar`}
      accessibilityRole="image"
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: resolvedColor + '15',
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36, color: resolvedColor }]}>
        {initials}
      </Text>
    </View>
  );

  if (imageUrl && !imageError) {
    return (
      <Image
        accessible={accessible}
        accessibilityLabel={`${name} avatar`}
        accessibilityRole="image"
        source={{ uri: imageUrl, cache: 'force-cache' }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: resolvedColor + '15' }}
        onError={() => setImageError(true)}
      />
    );
  }

  return renderFallback();
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
