const lightToDarkTintMap: Record<string, string> = {
  '#FCE7F3': '#2D1520',
  '#DBEAFE': '#1A2D45',
  '#D1FAE5': '#0F2E1E',
  '#EDE9FE': '#1F1530',
  '#FEF3C7': '#33280E',
  '#EFF6FF': '#1A2D45',
  '#ECFDF5': '#0F2E1E',
  '#FFF8E1': '#33280E',
  '#FEE2E2': '#3D1520',
  '#F0F2F5': '#353840',
  '#F5F7FA': '#1A1C22',
  '#FFF0F5': '#2D1520',
  '#FFEDD5': '#2D1F0E',
  '#CFFAFE': '#0F2E2E',
  '#F3F4F6': '#272930',
  '#EEF2FF': '#1A1D35',
  '#FFFBEB': '#33280E',
  '#F5F3FF': '#1F1530',
  '#FDF2F8': '#2D1520',
  '#FDF5F0': '#2D1F15',
  '#F0FAF4': '#132E1E',
  '#FCF0F5': '#2D1520',
  '#FFF9EB': '#33280E',
  '#F5F0FA': '#1F1530',
  '#EFF5FB': '#152535',
  '#FEF5ED': '#2D1F0E',
  '#FDE68A': '#4A3A10',
  '#A7F3D0': '#143D28',
  '#DDD6FE': '#2A1E45',
  '#FBCFE8': '#3D1830',
};

export function adaptTintColor(color: string, isDark: boolean): string {
  if (!isDark) return color;
  return lightToDarkTintMap[color.toUpperCase()] ?? color;
}
