import { colors } from '@/src/theme/colors';
import { appTheme as newAppTheme } from '@/src/theme/theme';

export const palette = {
  background: colors.background,
  surface: colors.surface,
  surfaceAlt: colors.surfaceSecondary,
  surfaceElevated: colors.surfaceElevated,
  card: colors.card,
  primary: colors.primary,
  primarySoft: colors.primarySoft,
  secondary: colors.secondary,
  expense: colors.expense,
  income: colors.income,
  warning: colors.warning,
  text: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textDark: colors.background,
  muted: colors.textMuted,
  border: colors.border,
};

export const appTheme = newAppTheme;
export * from '@/src/theme';
