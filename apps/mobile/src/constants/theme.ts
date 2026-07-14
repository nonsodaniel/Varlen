// ═══════════════════════════════════════════════════════════════
// Sivena Design System — adapted from doctor.webp reference
//
// Key characteristics from reference:
//   • Background: light neutral (#F7F8FC), bright and airy
//   • Cards: pure white, well-rounded (18-22px), neutral black shadows
//   • Primary: vivid medium blue (#3B82F6)
//   • Action buttons: filled blue circles with white icons
//   • Typography: bold black titles, gray body, clean hierarchy
//   • Overall: cards "float" on the neutral surface with visible depth
// ═══════════════════════════════════════════════════════════════

export const colors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#DBEAFE',
  primaryMuted: '#93C5FD',

  surface: '#FFFFFF',
  background: '#F7F8FC',
  card: '#FFFFFF',
  elevated: '#FFFFFF',

  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#6B7280',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  border: '#E8ECF1',
  borderLight: '#F0F2F5',
  divider: '#F2F4F7',

  overlay: 'rgba(15, 23, 42, 0.4)',
  skeleton: '#F0F2F5',

  pinkLight: '#FCE7F3',
  purpleLight: '#EDE9FE',
  orangeLight: '#FFF8E1',
  backgroundSubtle: '#F5F7FA',
} as const;

export const categoryColors = {
  groceries: { bg: '#D1FAE5', icon: '#10B981', accent: '#10B981' },
  dining: { bg: '#FEF3C7', icon: '#F59E0B', accent: '#F59E0B' },
  utilities: { bg: '#FEF3C7', icon: '#F59E0B', accent: '#F59E0B' },
  rent: { bg: '#DBEAFE', icon: '#3B82F6', accent: '#3B82F6' },
  transport: { bg: '#EDE9FE', icon: '#8B5CF6', accent: '#8B5CF6' },
  entertainment: { bg: '#FCE7F3', icon: '#EC4899', accent: '#EC4899' },
  health: { bg: '#FEE2E2', icon: '#EF4444', accent: '#EF4444' },
  other: { bg: '#E2E8F0', icon: '#6B7280', accent: '#6B7280' },
  personal: { bg: '#EDE9FE', icon: '#8B5CF6', accent: '#8B5CF6' },
  household: { bg: '#FEF3C7', icon: '#F59E0B', accent: '#F59E0B' },
  work: { bg: '#DBEAFE', icon: '#3B82F6', accent: '#3B82F6' },
  errand: { bg: '#D1FAE5', icon: '#10B981', accent: '#10B981' },
} as const;

export const personColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
] as const;

export const typography = {
  largeTitle: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 34 },
  title1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 30 },
  title2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2, lineHeight: 26 },
  title3: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.1, lineHeight: 24 },
  headline: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.15, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.15, lineHeight: 22 },
  callout: { fontSize: 14, fontWeight: '400' as const, letterSpacing: -0.1, lineHeight: 20 },
  subhead: { fontSize: 13, fontWeight: '600' as const, letterSpacing: -0.05, lineHeight: 18 },
  footnote: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 17 },
  caption1: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.2, lineHeight: 15 },
  caption2: { fontSize: 10, fontWeight: '400' as const, letterSpacing: 0.1, lineHeight: 13 },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 40, '4xl': 44, '5xl': 56,
} as const;

export const radius = {
  xs: 6, sm: 8, md: 12, lg: 18, xl: 22, '2xl': 28, full: 9999,
} as const;

// Shadows calibrated to match the reference: clearly visible soft depth
// Cards should look like they're "floating" on the background
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const gradients = {
  hero: ['#3B82F6', '#60A5FA', '#93C5FD'] as const,
  warmCard: ['#FAFBFF', '#FFFFFF'] as const,
  connection: ['#EC4899', '#F472B6', '#F9A8D4'] as const,
  profileHero: ['#3B82F6', '#60A5FA'] as const,
  calendarSelected: ['#3B82F6', '#60A5FA'] as const,
  single: ['#3B82F6', '#60A5FA', '#93C5FD'] as const,
  couple: ['#EC4899', '#F472B6', '#F9A8D4'] as const,
  family: ['#10B981', '#34D399', '#6EE7B7'] as const,
  parenting: ['#F59E0B', '#FBBF24', '#FCD34D'] as const,
} as const;

export const heroTypography = {
  heroNumber: { fontSize: 44, fontWeight: '700' as const, letterSpacing: -1, lineHeight: 48 },
  heroLabel: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.8, lineHeight: 16 },
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.6, lineHeight: 38 },
} as const;

export const modeThemes = {
  single: {
    accent: '#3B82F6',
    accentLight: '#DBEAFE',
    accentMuted: '#93C5FD',
    gradient: gradients.single,
    label: 'Personal planning & self-care',
    icon: 'person-outline' as const,
  },
  couple: {
    accent: '#EC4899',
    accentLight: '#FCE7F3',
    accentMuted: '#F9A8D4',
    gradient: gradients.couple,
    label: 'Shared life with your partner',
    icon: 'heart-outline' as const,
  },
  family: {
    accent: '#10B981',
    accentLight: '#D1FAE5',
    accentMuted: '#6EE7B7',
    gradient: gradients.family,
    label: 'Coordinate your household',
    icon: 'people-outline' as const,
  },
  parenting: {
    accent: '#F59E0B',
    accentLight: '#FEF3C7',
    accentMuted: '#FCD34D',
    gradient: gradients.parenting,
    label: 'Track kids, school & activities',
    icon: 'happy-outline' as const,
  },
} as const;

export const timeColors = {
  morning: {
    backgroundTint: '#FFFBF5',
    heroOverlay: 'rgba(251, 191, 36, 0.08)',
  },
  afternoon: {
    backgroundTint: '#F7F8FC',
    heroOverlay: 'rgba(59, 130, 246, 0.05)',
  },
  evening: {
    backgroundTint: '#F5F3FF',
    heroOverlay: 'rgba(139, 92, 246, 0.06)',
  },
  night: {
    backgroundTint: '#F0F1F8',
    heroOverlay: 'rgba(30, 41, 59, 0.06)',
  },
} as const;
