import * as React from "react";
import { cn } from "@/lib/utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResponsiveTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsList> {
  /**
   * Number of columns at each breakpoint
   * Default: { default: 2, sm: 3, md: 4, lg: 6 }
   */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /**
   * Use horizontal scroll instead of grid wrapping
   * Recommended for 6+ tabs
   */
  scrollable?: boolean;
}

/**
 * ResponsiveTabsList - A responsive wrapper for TabsList that handles mobile layouts
 *
 * Usage (Grid Mode - wraps tabs into rows):
 * ```tsx
 * <Tabs>
 *   <ResponsiveTabsList columns={{ default: 2, md: 3, lg: 6 }}>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *     ...
 *   </ResponsiveTabsList>
 *   <TabsContent>...</TabsContent>
 * </Tabs>
 * ```
 *
 * Usage (Scroll Mode - horizontal scroll):
 * ```tsx
 * <Tabs>
 *   <ResponsiveTabsList scrollable>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     ...
 *   </ResponsiveTabsList>
 * </Tabs>
 * ```
 */
const ResponsiveTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  ResponsiveTabsListProps
>(({ className, children, columns, scrollable = false, ...props }, ref) => {
  // Default column configuration
  const cols = {
    default: columns?.default ?? 2,
    sm: columns?.sm ?? 3,
    md: columns?.md ?? 4,
    lg: columns?.lg ?? 6,
    xl: columns?.xl ?? columns?.lg ?? 6,
  };

  if (scrollable) {
    return (
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <TabsList
          ref={ref}
          className={cn(
            "inline-flex h-10 w-auto min-w-full items-center justify-start gap-1 rounded-md bg-muted p-1 text-muted-foreground sm:justify-center",
            className
          )}
          {...props}
        >
          {children}
        </TabsList>
      </div>
    );
  }

  // Grid mode with responsive columns
  const gridClasses = cn(
    "grid w-full gap-1",
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  );

  return (
    <TabsList
      ref={ref}
      className={cn(gridClasses, "h-auto p-1", className)}
      {...props}
    >
      {children}
    </TabsList>
  );
});
ResponsiveTabsList.displayName = "ResponsiveTabsList";

/**
 * ResponsiveTabsTrigger - Tab trigger with responsive text sizing
 */
const ResponsiveTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger> & {
    /** Short label for mobile, full label shown on larger screens */
    shortLabel?: string;
  }
>(({ className, children, shortLabel, ...props }, ref) => {
  return (
    <TabsTrigger
      ref={ref}
      className={cn(
        "text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5",
        className
      )}
      {...props}
    >
      {shortLabel ? (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{children}</span>
        </>
      ) : (
        children
      )}
    </TabsTrigger>
  );
});
ResponsiveTabsTrigger.displayName = "ResponsiveTabsTrigger";

export { ResponsiveTabsList, ResponsiveTabsTrigger };
