import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TruncatedTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The text to display */
  text: string;
  /** Maximum width on mobile */
  mobileMaxWidth?: string;
  /** Maximum width on tablet */
  tabletMaxWidth?: string;
  /** Maximum width on desktop */
  desktopMaxWidth?: string;
  /** Maximum characters before truncation (alternative to width) */
  maxChars?: number;
  /** Show tooltip with full text on hover */
  showTooltip?: boolean;
  /** Tooltip side */
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

/**
 * TruncatedText - Text component that truncates with ellipsis and optional tooltip
 *
 * Usage:
 * ```tsx
 * // Width-based truncation
 * <TruncatedText
 *   text="This is a very long booth name that needs truncation"
 *   mobileMaxWidth="120px"
 *   tabletMaxWidth="200px"
 *   desktopMaxWidth="300px"
 *   showTooltip
 * />
 *
 * // Character-based truncation
 * <TruncatedText
 *   text="Very long email@example.com"
 *   maxChars={20}
 *   showTooltip
 * />
 * ```
 */
const TruncatedText = React.forwardRef<HTMLSpanElement, TruncatedTextProps>(
  (
    {
      text,
      mobileMaxWidth = "150px",
      tabletMaxWidth,
      desktopMaxWidth,
      maxChars,
      showTooltip = true,
      tooltipSide = "top",
      className,
      ...props
    },
    ref
  ) => {
    // Character-based truncation
    if (maxChars && text.length > maxChars) {
      const truncatedText = text.slice(0, maxChars) + "...";

      if (showTooltip) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  ref={ref}
                  className={cn("cursor-help", className)}
                  {...props}
                >
                  {truncatedText}
                </span>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>
                <p className="max-w-xs break-words">{text}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <span ref={ref} className={className} title={text} {...props}>
          {truncatedText}
        </span>
      );
    }

    // Width-based truncation with CSS
    const content = (
      <span
        ref={ref}
        className={cn(
          "block truncate",
          className
        )}
        style={{
          maxWidth: mobileMaxWidth,
        }}
        title={!showTooltip ? text : undefined}
        {...props}
      >
        <style>
          {`
            @media (min-width: 640px) {
              [data-truncate-id="${text.slice(0, 10)}"] {
                max-width: ${tabletMaxWidth || mobileMaxWidth};
              }
            }
            @media (min-width: 1024px) {
              [data-truncate-id="${text.slice(0, 10)}"] {
                max-width: ${desktopMaxWidth || tabletMaxWidth || mobileMaxWidth};
              }
            }
          `}
        </style>
        {text}
      </span>
    );

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p className="max-w-xs break-words">{text}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  }
);
TruncatedText.displayName = "TruncatedText";

/**
 * Simple inline truncate with responsive max-widths
 * Uses Tailwind classes directly
 */
interface SimpleTruncateProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** CSS max-width class for mobile (e.g., "max-w-[100px]") */
  mobile?: string;
  /** CSS max-width class for sm breakpoint */
  sm?: string;
  /** CSS max-width class for md breakpoint */
  md?: string;
  /** CSS max-width class for lg breakpoint */
  lg?: string;
}

const SimpleTruncate = React.forwardRef<HTMLSpanElement, SimpleTruncateProps>(
  ({ className, mobile = "max-w-[120px]", sm, md, lg, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "block truncate",
          mobile,
          sm && `sm:${sm}`,
          md && `md:${md}`,
          lg && `lg:${lg}`,
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
SimpleTruncate.displayName = "SimpleTruncate";

export { TruncatedText, SimpleTruncate };
