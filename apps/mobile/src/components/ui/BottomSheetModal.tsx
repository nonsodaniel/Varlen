import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing, radius } from '../../constants/theme';

interface BottomSheetModalProps {
  snapPoints?: (string | number)[];
  title: string;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  children: React.ReactNode;
  scrollable?: boolean;
}

export function BottomSheetModalWrapper({
  snapPoints = ['90%'],
  title,
  onSave,
  saveLabel = 'Save',
  saveDisabled = false,
  children,
  scrollable = true,
}: BottomSheetModalProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => sub.remove();
  }, [handleClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>
    ),
    [colors],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      backgroundStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      style={styles.sheet}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity onPress={handleClose} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {onSave ? (
          <TouchableOpacity
            onPress={onSave}
            disabled={saveDisabled}
            style={{ opacity: saveDisabled ? 0.4 : 1 }}
          >
            <Text style={[styles.headerSave, { color: colors.primary }]}>
              {saveLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Content */}
      {scrollable ? (
        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <View style={styles.scrollContent}>{children}</View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    zIndex: 100,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.headline,
    flex: 1,
    textAlign: 'center',
  },
  headerSave: {
    ...typography.subhead,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
});
