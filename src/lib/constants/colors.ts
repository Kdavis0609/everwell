// Metric Color Palette - Consistent colors for each metric type
export const METRIC_COLORS = {
  weight: {
    primary: '#0D9488', // teal-600
    light: '#14B8A6', // teal-500
    dark: '#0F766E', // teal-700
    bg: '#CCFBF1', // teal-100
    bgDark: '#134E4A' // teal-900
  },
  sleep_hours: {
    primary: '#7C3AED', // violet-600
    light: '#8B5CF6', // violet-500
    dark: '#6D28D9', // violet-700
    bg: '#EDE9FE', // violet-100
    bgDark: '#4C1D95' // violet-900
  },
  calories: {
    primary: '#EA580C', // orange-600
    light: '#F97316', // orange-500
    dark: '#C2410C', // orange-700
    bg: '#FED7AA', // orange-100
    bgDark: '#7C2D12' // orange-900
  },
  protein: {
    primary: '#16A34A', // green-600
    light: '#22C55E', // green-500
    dark: '#15803D', // green-700
    bg: '#DCFCE7', // green-100
    bgDark: '#14532D' // green-900
  },
  water_intake: {
    primary: '#0284C7', // sky-600
    light: '#0EA5E9', // sky-500
    dark: '#0369A1', // sky-700
    bg: '#E0F2FE', // sky-100
    bgDark: '#0C4A6E' // sky-900
  },
  blood_pressure: {
    primary: '#DC2626', // red-600
    light: '#EF4444', // red-500
    dark: '#B91C1C', // red-700
    bg: '#FEE2E2', // red-100
    bgDark: '#7F1D1D' // red-900
  },
  steps: {
    primary: '#0891B2', // cyan-600
    light: '#06B6D4', // cyan-500
    dark: '#0E7490', // cyan-700
    bg: '#CFFAFE', // cyan-100
    bgDark: '#164E63' // cyan-900
  },
  caffeine: {
    primary: '#A16207', // amber-600
    light: '#F59E0B', // amber-500
    dark: '#92400E', // amber-700
    bg: '#FEF3C7', // amber-100
    bgDark: '#78350F' // amber-900
  }
} as const;

// Helper function to get metric colors
export function getMetricColors(metricSlug: string) {
  return METRIC_COLORS[metricSlug as keyof typeof METRIC_COLORS] || METRIC_COLORS.weight;
}

// Chart color palette (for Recharts)
export const CHART_COLORS = {
  primary: '#0D9488', // teal-600
  secondary: '#7C3AED', // violet-600
  accent: '#EA580C', // orange-600
  success: '#16A34A', // green-600
  warning: '#F59E0B', // amber-500
  danger: '#DC2626', // red-600
  info: '#0891B2', // cyan-600
  neutral: '#6B7280' // gray-500
} as const;
