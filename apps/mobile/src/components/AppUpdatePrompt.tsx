import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { typography, spacing, radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useSettingsStore } from '../stores/settingsStore';

const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/sivena/id0000000000',
  android: 'https://play.google.com/store/apps/details?id=com.sivena.app',
}) || '';

export function AppUpdatePrompt() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [visible, setVisible] = useState(false);
  const lastVersion = useSettingsStore((s) => s.lastAppVersion);
  const setLastVersion = useSettingsStore((s) => s.setLastAppVersion);

  useEffect(() => {
    if (lastVersion && lastVersion !== CURRENT_VERSION) {
      // Show "what's new" when app was updated
      setVisible(true);
      setLastVersion(CURRENT_VERSION);
    } else if (!lastVersion) {
      setLastVersion(CURRENT_VERSION);
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>App Updated!</Text>
          <Text style={styles.subtitle}>
            Sivena has been updated to v{CURRENT_VERSION}. Here's what's new:
          </Text>
          <View style={styles.features}>
            <Text style={styles.featureItem}>Improved performance & stability</Text>
            <Text style={styles.featureItem}>Enhanced notification preferences</Text>
            <Text style={styles.featureItem}>New search functionality</Text>
            <Text style={styles.featureItem}>Bug fixes and improvements</Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setVisible(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadows.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  featureItem: {
    ...typography.subhead,
    color: colors.text,
    paddingLeft: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
  },
  buttonText: {
    ...typography.headline,
    color: colors.textInverse,
  },
});
