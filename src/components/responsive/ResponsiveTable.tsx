import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Minimum width before horizontal scroll kicks in */
  minWidth?: string;
  /** Show scroll indicator on mobile */
  showScrollHint?: boolean;
}

/**
 * ResponsiveTable - Wrapper for tables that enables horizontal scrolling on mobile/tablet
 *
 * Usage:
 * ```tsx
 * <ResponsiveTable minWidth="600px">
 *   <Table>
 *     <TableHeader>...</TableHeader>
 *     <TableBody>...</TableBody>
 *   </Table>
 * </ResponsiveTable>
 * ```
 */
const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  ({ className, children, minWidth = "600px", showScrollHint = true, ...props }, ref) => {
    const [canScroll, setCanScroll] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const checkScroll = () => {
        const hasOverflow = container.scrollWidth > container.clientWidth;
        setCanScroll(hasOverflow);
        setIsScrolled(container.scrollLeft > 0);
      };

      checkScroll();
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);

      return () => {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }, []);

    return (
      <div className="relative" ref={ref} {...props}>
        {/* Scroll hint indicator */}
        {showScrollHint && canScroll && !isScrolled && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10 flex items-center justify-center md:hidden">
            <span className="text-muted-foreground text-xs animate-pulse">→</span>
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            "overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
            "-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
            className
          )}
        >
          <div style={{ minWidth }}>
            {children}
          </div>
        </div>
      </div>
    );
  }
);
ResponsiveTable.displayName = "ResponsiveTable";

export { ResponsiveTable };
