/**
 * Responsive Components Library
 *
 * A collection of responsive wrapper components for handling
 * mobile, tablet, and desktop layouts in the KuralApp.
 *
 * @example
 * ```tsx
 * import {
 *   ResponsiveTable,
 *   ResponsiveTabsList,
 *   ResponsiveSelect,
 *   TruncatedText,
 *   ResponsiveButtonGroup,
 *   ResponsiveChartContainer,
 *   useIsMobile,
 * } from "@/components/responsive";
 * ```
 */

// Table components
export { ResponsiveTable } from "./ResponsiveTable";

// Tab components
export { ResponsiveTabsList, ResponsiveTabsTrigger } from "./ResponsiveTabs";

// Select components
export { ResponsiveSelect, ResponsiveSelectTrigger } from "./ResponsiveSelect";

// Text components
export { TruncatedText, SimpleTruncate } from "./TruncatedText";

// Button components
export { ResponsiveButtonGroup, SimpleResponsiveButtons } from "./ResponsiveButtonGroup";

// Grid components
export { ResponsiveGrid, ResponsiveStatGrid, ResponsiveCardGrid } from "./ResponsiveGrid";

// Chart components
export {
  ResponsiveChartContainer,
  useResponsiveChartHeight,
  useIsMobile,
  useBreakpoint,
} from "./ResponsiveChart";
