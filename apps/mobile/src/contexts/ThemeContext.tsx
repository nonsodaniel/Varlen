import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import {
  colors as lightColors,
  shadows as lightShadows,
} from '../constants/theme';

// ── Dark palette ──────────────────────────────────────────────────────────
// Warm charcoal base (not pure black) for a softer, more inviting feel.
// Surfaces use subtle blue-grey undertones that complement the primary blue.
const darkColors = {
  primary: '#6DB3F8',
  primaryDark: '#4A9BF5',
  primaryLight: '#1A2D45',
  primaryMuted: '#5BA3F0',

  surface: '#1E2028',
  background: '#13151A',
  card: '#1E2028',
  elevated: '#262831',

  text: '#EDEEF2',
  textSecondary: '#9BA1B0',
  textTertiary: '#6C7283',
  textInverse: '#13151A',

  success: '#4ADE80',
  successLight: '#0F2E1E',
  error: '#FB7185',
  errorLight: '#3D1520',
  warning: '#FCD34D',
  warningLight: '#33280E',
  info: '#6DB3F8',
  infoLight: '#1A2D45',

  border: '#2A2D37',
  borderLight: '#353840',
  divider: '#23252E',

  overlay: 'rgba(0, 0, 0, 0.55)',
  skeleton: '#262831',
} as const;

const darkShadows = {
  sm: {
    shadowColor: '#0A0B0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0A0B0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0A0B0E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  soft: {
    shadowColor: '#0A0B0E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

// ── Types ─────────────────────────────────────────────────────────────────
export type ThemeColors = typeof lightColors;
export type ThemeShadows = typeof lightShadows;

interface ThemeContextValue {
  colors: ThemeColors;
  shadows: ThemeShadows;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  shadows: lightShadows,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appearance = useSettingsStore((s) => s.appearance);
  const systemScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (appearance === 'system') return systemScheme === 'dark';
    return appearance === 'dark';
  }, [appearance, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? (darkColors as unknown as ThemeColors) : lightColors,
      shadows: isDark ? (darkShadows as unknown as ThemeShadows) : lightShadows,
      isDark,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
