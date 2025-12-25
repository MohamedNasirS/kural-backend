import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height on mobile */
  mobileHeight?: number;
  /** Height on tablet */
  tabletHeight?: number;
  /** Height on desktop */
  desktopHeight?: number;
  /** Aspect ratio to maintain (width/height) - alternative to fixed heights */
  aspectRatio?: number;
}

/**
 * ResponsiveChartContainer - Container for charts with responsive height
 *
 * Usage:
 * ```tsx
 * <ResponsiveChartContainer
 *   mobileHeight={250}
 *   tabletHeight={350}
 *   desktopHeight={400}
 * >
 *   <ResponsiveContainer width="100%" height="100%">
 *     <LineChart data={data}>...</LineChart>
 *   </ResponsiveContainer>
 * </ResponsiveChartContainer>
 * ```
 */
const ResponsiveChartContainer = React.forwardRef<HTMLDivElement, ResponsiveChartContainerProps>(
  (
    {
      className,
      children,
      mobileHeight = 250,
      tabletHeight = 300,
      desktopHeight = 400,
      aspectRatio,
      ...props
    },
    ref
  ) => {
    const [height, setHeight] = React.useState(desktopHeight);

    React.useEffect(() => {
      const updateHeight = () => {
        const width = window.innerWidth;
        if (width < 640) {
          setHeight(mobileHeight);
        } else if (width < 1024) {
          setHeight(tabletHeight);
        } else {
          setHeight(desktopHeight);
        }
      };

      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }, [mobileHeight, tabletHeight, desktopHeight]);

    if (aspectRatio) {
      return (
        <div
          ref={ref}
          className={cn("relative w-full", className)}
          style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
          {...props}
        >
          <div className="absolute inset-0">{children}</div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        style={{ height: `${height}px` }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ResponsiveChartContainer.displayName = "ResponsiveChartContainer";

/**
 * useResponsiveChartHeight - Hook to get responsive chart height
 *
 * Usage:
 * ```tsx
 * const chartHeight = useResponsiveChartHeight({
 *   mobile: 200,
 *   tablet: 300,
 *   desktop: 400,
 * });
 *
 * <ResponsiveContainer width="100%" height={chartHeight}>
 *   <BarChart>...</BarChart>
 * </ResponsiveContainer>
 * ```
 */
export function useResponsiveChartHeight(config: {
  mobile?: number;
  tablet?: number;
  desktop?: number;
}): number {
  const { mobile = 250, tablet = 300, desktop = 400 } = config;
  const [height, setHeight] = React.useState(desktop);

  React.useEffect(() => {
    const updateHeight = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setHeight(mobile);
      } else if (width < 1024) {
        setHeight(tablet);
      } else {
        setHeight(desktop);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [mobile, tablet, desktop]);

  return height;
}

/**
 * useIsMobile - Simple hook to check if viewport is mobile
 */
export function useIsMobile(breakpoint: number = 640): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

/**
 * useBreakpoint - Hook to get current breakpoint
 */
export function useBreakpoint(): "mobile" | "sm" | "md" | "lg" | "xl" | "2xl" {
  const [breakpoint, setBreakpoint] = React.useState<"mobile" | "sm" | "md" | "lg" | "xl" | "2xl">("lg");

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint("mobile");
      else if (width < 768) setBreakpoint("sm");
      else if (width < 1024) setBreakpoint("md");
      else if (width < 1280) setBreakpoint("lg");
      else if (width < 1536) setBreakpoint("xl");
      else setBreakpoint("2xl");
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return breakpoint;
}

export { ResponsiveChartContainer };
