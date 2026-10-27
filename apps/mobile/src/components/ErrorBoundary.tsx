import React, { Component, ErrorInfo, ReactNode, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Clipboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, radius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

function ErrorFallback({
  error,
  errorInfo,
  onReset,
  showDetails,
  toggleDetails,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  showDetails: boolean;
  toggleDetails: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const errorText = [
    error?.message || 'Unknown error',
    error?.stack?.split('\n').slice(0, 5).join('\n'),
    errorInfo?.componentStack?.split('\n').slice(0, 5).join('\n'),
  ].filter(Boolean).join('\n\n');

  const handleCopy = () => {
    try {
      Clipboard.setString(errorText);
    } catch {}
  };

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLabel="Application error occurred">
      <View style={styles.iconContainer}>
        <Ionicons name="warning-outline" size={48} color={colors.error} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>
        The app ran into an unexpected error. You can try again or restart the app.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onReset}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Ionicons name="refresh-outline" size={20} color={colors.textInverse} />
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <>
          <TouchableOpacity
            style={styles.detailsToggle}
            onPress={toggleDetails}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsToggleText}>
              {showDetails ? 'Hide' : 'Show'} error details
            </Text>
            <Ionicons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {showDetails && (
            <View style={styles.detailsContainer}>
              <ScrollView keyboardDismissMode="on-drag" style={styles.detailsScroll} nestedScrollEnabled>
                <Text style={styles.detailsText} selectable>
                  {errorText}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopy}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
                <Text style={styles.copyButtonText}>Copy error</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    this.props.onReset?.();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          showDetails={this.state.showDetails}
          toggleDetails={this.toggleDetails}
        />
      );
    }

    return this.props.children;
  }
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.headline,
    color: colors.textInverse,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  detailsToggleText: {
    ...typography.caption1,
    color: colors.textTertiary,
  },
  detailsContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  detailsScroll: {
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  detailsText: {
    ...typography.caption1,
    color: colors.error,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  copyButtonText: {
    ...typography.caption1,
    color: colors.primary,
    fontWeight: '500',
  },
});
