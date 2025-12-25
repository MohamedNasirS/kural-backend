import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResponsiveSelectProps {
  /** Current value */
  value?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Options array */
  options: Array<{
    value: string;
    label: string;
    /** Short label for mobile */
    shortLabel?: string;
  }>;
  /** Width on desktop (mobile is always full width) */
  desktopWidth?: string;
  /** Additional className for trigger */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * ResponsiveSelect - A select component that's full-width on mobile, fixed-width on desktop
 *
 * Usage:
 * ```tsx
 * <ResponsiveSelect
 *   value={selectedValue}
 *   onValueChange={setSelectedValue}
 *   placeholder="Select option..."
 *   desktopWidth="250px"
 *   options={[
 *     { value: "opt1", label: "Option 1" },
 *     { value: "opt2", label: "Option 2", shortLabel: "Opt 2" },
 *   ]}
 * />
 * ```
 */
const ResponsiveSelect = React.forwardRef<HTMLButtonElement, ResponsiveSelectProps>(
  (
    {
      value,
      onValueChange,
      placeholder = "Select...",
      options,
      desktopWidth = "200px",
      className,
      disabled = false,
    },
    ref
  ) => {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          ref={ref}
          className={cn(
            "w-full",
            `sm:w-[${desktopWidth}]`,
            className
          )}
          style={{
            // Fallback for dynamic width since Tailwind can't handle dynamic values
            maxWidth: "100%",
          }}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.shortLabel ? (
                <>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);
ResponsiveSelect.displayName = "ResponsiveSelect";

/**
 * ResponsiveSelectTrigger - Just the trigger with responsive width
 * Use this when you need more control over Select structure
 */
const ResponsiveSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof SelectTrigger> & {
    /** Width on md+ screens */
    mdWidth?: string;
    /** Width on lg+ screens */
    lgWidth?: string;
  }
>(({ className, mdWidth = "200px", lgWidth, children, ...props }, ref) => {
  return (
    <SelectTrigger
      ref={ref}
      className={cn(
        "w-full",
        mdWidth && `md:w-[${mdWidth}]`,
        lgWidth && `lg:w-[${lgWidth}]`,
        className
      )}
      {...props}
    >
      {children}
    </SelectTrigger>
  );
});
ResponsiveSelectTrigger.displayName = "ResponsiveSelectTrigger";

export { ResponsiveSelect, ResponsiveSelectTrigger };
