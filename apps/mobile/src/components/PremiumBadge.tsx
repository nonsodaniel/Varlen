import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePremiumStore, PremiumPlan } from '../stores/premiumStore';

interface Props {
  plan?: PremiumPlan;
  size?: 'sm' | 'md';
}

export function PremiumBadge({ plan: planProp, size = 'sm' }: Props) {
  const storePlan = usePremiumStore((s) => s.plan);
  const plan = planProp || storePlan;

  if (plan === 'free') return null;

  const label = plan === 'family' ? 'FAMILY' : 'PRO';
  const gradientColors: [string, string] =
    plan === 'family' ? ['#8B5CF6', '#A78BFA'] : ['#F59E0B', '#FBBF24'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.badge, size === 'md' && styles.badgeMd]}
    >
      <Text style={[styles.label, size === 'md' && styles.labelMd]}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  labelMd: {
    fontSize: 11,
  },
});
