import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: string;
  iconColor?: string;
}

interface CustomAlertProps {
  visible: boolean;
  config: AlertConfig | null;
  onDismiss: () => void;
}

export function CustomAlert({ visible, config, onDismiss }: CustomAlertProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!config) return null;

  const buttons = config.buttons ?? [{ text: 'OK', style: 'default' }];
  const hasDestructive = buttons.some((b) => b.style === 'destructive');

  // Determine icon based on content
  const iconName = config.icon ??
    (hasDestructive ? 'alert-circle-outline' : 'information-circle-outline');
  const iconColor = config.iconColor ??
    (hasDestructive ? colors.error : colors.primary);

  const handleButton = (button: AlertButton) => {
    button.onPress?.();
    onDismiss();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <BlurView intensity={30} tint="dark" style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.alertCard,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                <Ionicons name={iconName as any} size={28} color={iconColor} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{config.title}</Text>

              {/* Message */}
              {config.message ? (
                <Text style={styles.message}>{config.message}</Text>
              ) : null}

              {/* Buttons */}
              <View style={[
                styles.buttonRow,
                buttons.length === 1 && styles.buttonRowSingle,
              ]}>
                {buttons.map((button, idx) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  const isLast = idx === buttons.length - 1;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.button,
                        isCancel && styles.buttonCancel,
                        isDestructive && styles.buttonDestructive,
                        !isCancel && !isDestructive && styles.buttonDefault,
                        buttons.length === 1 && styles.buttonFull,
                      ]}
                      onPress={() => handleButton(button)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.buttonTextCancel,
                          isDestructive && styles.buttonTextDestructive,
                          !isCancel && !isDestructive && styles.buttonTextDefault,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </BlurView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const createStyles = (colors: any, shadows: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...shadows.lg,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    flex: undefined,
    paddingHorizontal: spacing['2xl'],
    minWidth: 140,
  },
  buttonCancel: {
    backgroundColor: colors.background,
  },
  buttonDestructive: {
    backgroundColor: colors.error,
  },
  buttonDefault: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
  buttonTextDestructive: {
    color: '#FFFFFF',
  },
  buttonTextDefault: {
    color: '#FFFFFF',
  },
});
