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

// Party-specific colors (for election data) - Official party colors
export const PARTY_COLORS: Record<string, string> = {
  // Major Tamil Nadu parties
  DMK: '#E11D1D',      // Red (official DMK flag color)
  AIADMK: '#00A650',   // Green (Two Leaves symbol)
  ADMK: '#00A650',     // Green (alternate name)
  BJP: '#FF6B00',      // Saffron/Orange (official BJP color)
  TVK: '#8B1A4A',      // Maroon (Tamizhaga Vetri Kazhagam)
  NTK: '#C41E3A',      // Cardinal Red (Naam Tamilar Katchi - tiger red)
  PMK: '#FFD700',      // Mango Yellow (Pattali Makkal Katchi)
  DMDK: '#FFCC00',     // Golden Yellow (Desiya Murpokku Dravida Kazhagam)

  // National parties
  INC: '#00BFFF',      // Congress Blue/Cyan
  CONGRESS: '#00BFFF', // Congress Blue/Cyan (alternate name)
  CPM: '#CC0000',      // Communist Red (darker)
  CPI: '#990000',      // Communist Red (darkest)

  // Others
  MNM: '#6366f1',      // Indigo (Makkal Needhi Maiam)
  AMMK: '#14b8a6',     // Teal (Amma Makkal Munnetra Kazhagam)
  NOTA: '#6b7280',     // Gray
  IND: '#9ca3af',      // Light Gray (Independent)
  Others: '#9ca3af',   // Gray
  general: '#94a3b8',  // Slate gray
};

// Social media sentiment colors
export const SOCIAL_SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#6b7280',
  negative: '#ef4444',
};

// Share of voice colors (for competitor analysis) - Official party colors
export const SHARE_OF_VOICE_COLORS = [
  '#E11D1D', // DMK - Red
  '#00A650', // ADMK/AIADMK - Green (Two Leaves)
  '#8B1A4A', // TVK - Maroon
  '#C41E3A', // NTK - Cardinal Red
  '#FF6B00', // BJP - Saffron/Orange
  '#00BFFF', // CONGRESS - Cyan/Blue
  '#FFD700', // PMK - Mango Yellow
  '#FFCC00', // DMDK - Golden Yellow
  '#94a3b8', // general - Slate gray
  '#6366f1', // Others - Indigo
  '#14b8a6', // Teal
  '#a855f7', // Purple
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
