import { Platform } from 'react-native';

export const typography = {
  fonts: Platform.select({
    ios: {
      sans: 'system-ui',
    },
    default: {
      sans: 'normal',
    },
  }),
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  } as const,
};
