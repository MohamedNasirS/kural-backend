import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns at each breakpoint
   */
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between items */
  gap?: "none" | "sm" | "md" | "lg";
}

const gapClasses = {
  none: "gap-0",
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4 lg:gap-6",
  lg: "gap-4 sm:gap-6 lg:gap-8",
};

/**
 * ResponsiveGrid - A grid container with responsive column configuration
 *
 * Usage:
 * ```tsx
 * <ResponsiveGrid cols={{ default: 1, sm: 2, md: 3, lg: 4 }} gap="md">
 *   <Card>...</Card>
 *   <Card>...</Card>
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </ResponsiveGrid>
 * ```
 */
const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  (
    {
      className,
      children,
      cols = { default: 1, sm: 2, md: 3, lg: 4 },
      gap = "md",
      ...props
    },
    ref
  ) => {
    // Build grid-cols classes
    const colClasses = cn(
      "grid",
      cols.default && `grid-cols-${cols.default}`,
      cols.sm && `sm:grid-cols-${cols.sm}`,
      cols.md && `md:grid-cols-${cols.md}`,
      cols.lg && `lg:grid-cols-${cols.lg}`,
      cols.xl && `xl:grid-cols-${cols.xl}`
    );

    return (
      <div
        ref={ref}
        className={cn(colClasses, gapClasses[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveGrid.displayName = "ResponsiveGrid";

/**
 * ResponsiveStatGrid - Specifically for stat cards
 * 1 col on mobile, 2 on sm, 2-3 on md, 4 on lg
 */
const ResponsiveStatGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "grid gap-3 sm:gap-4 lg:gap-6",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ResponsiveStatGrid.displayName = "ResponsiveStatGrid";

/**
 * ResponsiveCardGrid - For card layouts
 * Stacks on mobile, 2 cols on tablet, 3 on desktop
 */
const ResponsiveCardGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "grid gap-4 sm:gap-6",
        "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ResponsiveCardGrid.displayName = "ResponsiveCardGrid";

export { ResponsiveGrid, ResponsiveStatGrid, ResponsiveCardGrid };
