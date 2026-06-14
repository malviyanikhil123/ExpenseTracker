import { MD3DarkTheme } from 'react-native-paper';
import { colors } from './colors';

export const appTheme = {
  ...MD3DarkTheme,
  roundness: 16,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceSecondary,
    outline: colors.border,
    onSurface: colors.textPrimary,
    onBackground: colors.textPrimary,
    error: colors.expense,
    // Extra mapped tokens for Paper components
    onPrimary: colors.background,         // Dark text on primary orange buttons
    onSecondary: colors.background,       // Dark text on gold buttons
    secondaryContainer: colors.surfaceSecondary,
    onSecondaryContainer: colors.textPrimary,
    surfaceDisabled: colors.surfaceSecondary,
    onSurfaceVariant: colors.textMuted,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceSecondary,
      level3: colors.surfaceElevated,
      level4: colors.surfaceElevated,
      level5: colors.surfaceElevated,
    },
  },
};
