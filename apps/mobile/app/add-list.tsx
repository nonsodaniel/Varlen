import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../src/constants/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { useListStore } from '../src/stores/listStore';
import { useAuthStore } from '../src/stores/authStore';
import { useAlert } from '../src/components/AlertProvider';
import { haptics } from '../src/hooks/useHaptics';

export default function AddListScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { addList } = useListStore();
  const user = useAuthStore((s) => s.user);
  const { showAlert } = useAlert();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await addList({
        name: name.trim(),
        shared: true,
        createdBy: user?.id ?? '',
      });
      haptics.success();
      router.back();
    } catch {
      showAlert('Error', 'Could not create list. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New List</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>List name</Text>
          <TextInput
            style={[styles.input, {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            }]}
            placeholder="e.g. Groceries, Household supplies..."
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            You can add items after creating the list.
          </Text>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[
              styles.createBtn,
              { backgroundColor: colors.primary },
              (!name.trim() || saving) && styles.createBtnDisabled,
            ]}
            onPress={handleCreate}
            disabled={!name.trim() || saving}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>{saving ? 'Creating...' : 'Create List'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, _shadows: any) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title3,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  body: {
    padding: spacing.xl,
    flex: 1,
  },
  label: {
    ...typography.subhead,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    fontSize: 16,
    height: 52,
  },
  hint: {
    ...typography.caption1,
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'android' ? spacing.lg : spacing.md,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.full,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: {
    color: '#fff',
    ...typography.headline,
    fontWeight: '700',
  },
});
