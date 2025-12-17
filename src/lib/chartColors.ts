/**
 * Chart Colors - STYLE_COOKBOOK Compliant
 *
 * Centralized color palette for all charts and visualizations.
 * Uses the 15-color palette from STYLE_COOKBOOK.md
 */

// Primary chart color palette (15 colors)
export const CHART_COLORS = [
  '#4f46e5', // Indigo (Primary)
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo light
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#0ea5e9', // Sky
] as const;

// "Others" category color
export const OTHERS_COLOR = '#9ca3af'; // gray-400

// Semantic colors for specific use cases
export const SEMANTIC_COLORS = {
  // Status colors
  success: '#10b981',  // Green
  warning: '#f59e0b',  // Amber
  error: '#ef4444',    // Red
  info: '#3b82f6',     // Blue
  neutral: '#6b7280',  // Gray

  // Sentiment colors
  positive: '#22c55e', // Green
  negative: '#ef4444', // Red
  balanced: '#f59e0b', // Amber
  flippable: '#f97316', // Orange

  // Gender colors
  male: '#3b82f6',     // Blue
  female: '#ec4899',   // Pink
  other: '#8b5cf6',    // Violet

  // Primary brand
  primary: '#4f46e5',  // Indigo
} as const;

// Party-specific colors (for election data)
export const PARTY_COLORS: Record<string, string> = {
  AIADMK: '#10b981',   // Green (Two Leaves)
  DMK: '#ef4444',      // Red
  BJP: '#f97316',      // Orange
  INC: '#3b82f6',      // Blue
  NTK: '#8b5cf6',      // Violet
  PMK: '#eab308',      // Yellow
  DMDK: '#ec4899',     // Pink
  MNM: '#ec4899',      // Pink
  CPM: '#dc2626',      // Dark Red
  CPI: '#b91c1c',      // Darker Red
  NOTA: '#6b7280',     // Gray
  IND: '#9ca3af',      // Light Gray (Independent)
  AMMK: '#14b8a6',     // Teal
  Others: '#9ca3af',   // Gray
};

// Social media sentiment colors
export const SOCIAL_SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#6b7280',
  negative: '#ef4444',
};

// Share of voice colors (for competitor analysis)
export const SHARE_OF_VOICE_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Green
  '#8b5cf6', // Violet
  '#f97316', // Orange
];

// ECharts tooltip configuration (consistent styling)
export const ECHARTS_TOOLTIP = {
  trigger: 'item' as const,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderColor: '#333',
  borderWidth: 1,
  textStyle: { color: '#fff', fontSize: 13 },
  padding: 10,
};

// ECharts animation settings
export const ECHARTS_ANIMATION = {
  animation: true,
  animationDuration: 600,
  animationDurationUpdate: 400,
  animationEasing: 'cubicInOut' as const,
};

// Helper function to get color by index (cycles through palette)
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// Helper function to get colors for N items
export function getChartColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => getChartColor(i));
}
