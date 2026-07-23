import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: July 4, 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By creating an account or using Sivena, you agree to these Terms and Conditions. If you do not agree, please do not use the app.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.body}>
          Sivena is a household management platform that helps you organize tasks, events, expenses, memories, and more with your household members.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.body}>
          You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating your account. You may not use another person's account without permission.
        </Text>

        <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
        <Text style={styles.body}>
          You agree not to:{'\n'}
          {'\u2022'} Use the service for any unlawful purpose{'\n'}
          {'\u2022'} Attempt to gain unauthorized access to the service{'\n'}
          {'\u2022'} Upload harmful content or malware{'\n'}
          {'\u2022'} Interfere with other users' use of the service{'\n'}
          {'\u2022'} Reverse engineer or decompile the application
        </Text>

        <Text style={styles.sectionTitle}>5. User Content</Text>
        <Text style={styles.body}>
          You retain ownership of all content you create in Sivena. By using the service, you grant us a limited license to store and process your content solely to provide the service to you and your household members.
        </Text>

        <Text style={styles.sectionTitle}>6. Household Sharing</Text>
        <Text style={styles.body}>
          When you invite members to your household, shared data becomes visible to all household members. You are responsible for managing who has access to your household.
        </Text>

        <Text style={styles.sectionTitle}>7. Service Availability</Text>
        <Text style={styles.body}>
          We strive to maintain high availability but do not guarantee uninterrupted access. We may perform maintenance or updates that temporarily affect service availability.
        </Text>

        <Text style={styles.sectionTitle}>8. Termination</Text>
        <Text style={styles.body}>
          You may delete your account at any time from Profile → Delete account. We reserve the right to suspend or terminate accounts that violate these terms.
        </Text>

        <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={styles.body}>
          Sivena is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
        <Text style={styles.body}>
          We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact</Text>
        <Text style={styles.body}>
          For questions about these terms, contact us at:{'\n'}
          legal@sivena.app
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
