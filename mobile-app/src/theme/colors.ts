export const colors = {
  // Core backgrounds
  background: '#3C3D48',
  surface: '#4A4B57',          // Solid opaque surface — was rgba(255,255,255,0.04) = nearly invisible
  surfaceSecondary: '#52535F',  // Slightly lighter solid surface — was rgba(255,255,255,0.08)
  surfaceElevated: '#565761',   // For dialogs/modals that need to float above surface
  card: '#50515F',              // Elevated card surfaces

  // Brand
  primary: '#F6A242',    // Primary Orange
  secondary: '#F1C183',  // Secondary Gold

  // Text
  textPrimary: '#FDFDFD',
  textSecondary: '#E8E8E7',
  textMuted: '#BAC0BE',

  // Borders
  border: 'rgba(255, 255, 255, 0.12)',

  // Semantic colors — clearly distinct from each other
  expense: '#FF6B6B',    // Red-ish for expenses — clearly different from income/primary
  income: '#6BCB77',     // Green for income — clearly different from expense
  warning: '#F1C183',    // Gold/secondary for warnings/budget

  // Overlay transparent variants (for subtle backgrounds)
  primarySoft: 'rgba(246, 162, 66, 0.15)',
};

export const chartPalette = ['#F6A242', '#F1C183', '#6BCB77', '#FF6B6B', '#BAC0BE', '#E8E8E7'];

export function getCategoryColor(indexOrId: string | number | undefined | null): string {
  if (!indexOrId) return colors.primary;
  let num = 0;
  if (typeof indexOrId === 'number') {
    num = indexOrId;
  } else {
    // Simple hash for string ID
    const str = String(indexOrId);
    for (let i = 0; i < str.length; i++) {
      num += str.charCodeAt(i);
    }
  }
  return chartPalette[num % chartPalette.length];
}
