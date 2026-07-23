import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: July 4, 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect information you provide directly, including your name, email address, and household data you create within the app (tasks, events, expenses, memories, etc.).
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.body}>
          Your data is used exclusively to provide and improve the Sivena service. We use it to:{'\n'}
          {'\u2022'} Sync your household data across devices{'\n'}
          {'\u2022'} Send you relevant notifications{'\n'}
          {'\u2022'} Maintain your account security{'\n'}
          {'\u2022'} Improve app performance and features
        </Text>

        <Text style={styles.sectionTitle}>3. Data Sharing</Text>
        <Text style={styles.body}>
          We do not sell, trade, or rent your personal information to third parties. Your household data is only shared with members of your household who you explicitly invite.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
        <Text style={styles.body}>
          Your data is stored securely on encrypted servers. We use industry-standard security measures including HTTPS encryption, hashed passwords, and secure token-based authentication.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights (GDPR)</Text>
        <Text style={styles.body}>
          You have the right to:{'\n'}
          {'\u2022'} Access your data (Profile → Download my data){'\n'}
          {'\u2022'} Delete your account and all data (Profile → Delete account){'\n'}
          {'\u2022'} Export your data in a portable format{'\n'}
          {'\u2022'} Withdraw consent at any time by deleting your account
        </Text>

        <Text style={styles.sectionTitle}>6. Cookies & Tracking</Text>
        <Text style={styles.body}>
          Sivena does not use tracking cookies or third-party analytics. We do not serve ads or share data with advertisers.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.body}>
          Sivena is designed for users aged 13 and older. We do not knowingly collect information from children under 13. Child profiles within the app are managed by parent/guardian accounts.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this privacy policy from time to time. We will notify you of any material changes through the app.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.body}>
          For privacy-related questions or requests, contact us at:{'\n'}
          privacy@sivena.app
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  updated: { ...typography.caption1, color: colors.textTertiary, marginBottom: spacing.lg },
  sectionTitle: { ...typography.headline, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
});
