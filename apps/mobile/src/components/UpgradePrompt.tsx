import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { usePremiumGate } from '../hooks/usePremiumGate';
import { PremiumFeature, PREMIUM_FEATURE_INFO } from '../constants/premiumFeatures';

interface Props {
  feature?: PremiumFeature;
  title?: string;
  subtitle?: string;
}

export function UpgradePrompt({ feature, title, subtitle }: Props) {
  const { colors, isDark } = useTheme();
  const { showPaywall } = usePremiumGate();

  const info = feature ? PREMIUM_FEATURE_INFO[feature] : null;
  const displayTitle = title || 'Unlock Sivena Pro';
  const displaySubtitle =
    subtitle || info?.description || 'Get access to all premium features';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => showPaywall(feature)}
    >
      <LinearGradient
        colors={isDark ? ['#2D1F0E', '#33280E'] : ['#FFF7ED', '#FFFBEB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          { borderColor: isDark ? '#5C4A1E' : '#FDE68A' },
        ]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="ribbon-outline" size={20} color="#F59E0B" />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: isDark ? '#FBBF24' : '#B45309' }]}>
            {displayTitle}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#D4A24A' : '#92400E' }]}>
            {displaySubtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={isDark ? '#D4A24A' : '#B45309'} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
});
