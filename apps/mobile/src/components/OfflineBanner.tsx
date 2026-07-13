import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineStore } from '../services/offlineQueue';
import { typography, spacing } from '../constants/theme';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingCount = useOfflineStore((s) => s.pendingCount);
  const isSyncing = useOfflineStore((s) => s.isSyncing);

  const slideAnim = useRef(new Animated.Value(-60)).current;
  const visible = !isOnline || isSyncing;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible, slideAnim]);

  if (isOnline && !isSyncing && pendingCount === 0) return null;

  const bgColor = !isOnline ? '#EF4444' : '#F59E0B';
  const icon: keyof typeof Ionicons.glyphMap = !isOnline
    ? 'cloud-offline-outline'
    : 'sync-outline';
  const message = !isOnline
    ? `You're offline${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`
    : `Syncing ${pendingCount} change${pendingCount !== 1 ? 's' : ''}...`;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top, backgroundColor: bgColor, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="none"
    >
      <Ionicons name={icon} size={16} color="#FFF" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  text: {
    ...typography.callout,
    color: '#FFF',
    fontWeight: '600',
  },
});
