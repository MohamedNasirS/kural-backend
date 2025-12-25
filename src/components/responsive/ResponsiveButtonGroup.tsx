import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface ButtonConfig {
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
}

interface ResponsiveButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of button configurations */
  buttons: ButtonConfig[];
  /** Number of buttons to show before collapsing into dropdown on mobile */
  mobileVisibleCount?: number;
  /** Number of buttons to show on tablet before collapsing */
  tabletVisibleCount?: number;
  /** Size of the buttons */
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * ResponsiveButtonGroup - Button group that collapses into dropdown on mobile
 *
 * Usage:
 * ```tsx
 * <ResponsiveButtonGroup
 *   mobileVisibleCount={1}
 *   tabletVisibleCount={2}
 *   buttons={[
 *     { label: "Create User", icon: <Plus />, onClick: handleCreate },
 *     { label: "Export", icon: <Download />, onClick: handleExport },
 *     { label: "Settings", icon: <Settings />, onClick: handleSettings },
 *   ]}
 * />
 * ```
 */
const ResponsiveButtonGroup = React.forwardRef<HTMLDivElement, ResponsiveButtonGroupProps>(
  (
    {
      className,
      buttons,
      mobileVisibleCount = 1,
      tabletVisibleCount = 2,
      size = "default",
      ...props
    },
    ref
  ) => {
    if (buttons.length === 0) return null;

    // If only 1-2 buttons, just show them normally with wrap
    if (buttons.length <= 2) {
      return (
        <div
          ref={ref}
          className={cn("flex flex-wrap gap-2", className)}
          {...props}
        >
          {buttons.map((btn, index) => (
            <Button
              key={index}
              variant={btn.variant || "default"}
              size={size}
              onClick={btn.onClick}
              disabled={btn.disabled}
              className="whitespace-nowrap"
            >
              {btn.icon}
              <span className={btn.icon ? "ml-2" : ""}>{btn.label}</span>
            </Button>
          ))}
        </div>
      );
    }

    // Mobile visible buttons
    const mobileVisible = buttons.slice(0, mobileVisibleCount);
    const mobileHidden = buttons.slice(mobileVisibleCount);

    // Tablet visible buttons
    const tabletVisible = buttons.slice(0, tabletVisibleCount);
    const tabletHidden = buttons.slice(tabletVisibleCount);

    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap items-center gap-2", className)}
        {...props}
      >
        {/* Mobile: Show limited buttons + dropdown */}
        <div className="flex items-center gap-2 sm:hidden">
          {mobileVisible.map((btn, index) => (
            <Button
              key={index}
              variant={btn.variant || "default"}
              size={size}
              onClick={btn.onClick}
              disabled={btn.disabled}
              className="whitespace-nowrap"
            >
              {btn.icon}
              {btn.shortLabel ? (
                <span className={btn.icon ? "ml-2" : ""}>{btn.shortLabel}</span>
              ) : (
                <span className={btn.icon ? "ml-2" : ""}>{btn.label}</span>
              )}
            </Button>
          ))}
          {mobileHidden.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={size}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {mobileHidden.map((btn, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
                  >
                    {btn.icon && <span className="mr-2">{btn.icon}</span>}
                    {btn.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Tablet: Show more buttons + dropdown */}
        <div className="hidden sm:flex md:hidden items-center gap-2">
          {tabletVisible.map((btn, index) => (
            <Button
              key={index}
              variant={btn.variant || "default"}
              size={size}
              onClick={btn.onClick}
              disabled={btn.disabled}
              className="whitespace-nowrap"
            >
              {btn.icon}
              <span className={btn.icon ? "ml-2" : ""}>{btn.label}</span>
            </Button>
          ))}
          {tabletHidden.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={size}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {tabletHidden.map((btn, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
                  >
                    {btn.icon && <span className="mr-2">{btn.icon}</span>}
                    {btn.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Desktop: Show all buttons */}
        <div className="hidden md:flex items-center gap-2">
          {buttons.map((btn, index) => (
            <Button
              key={index}
              variant={btn.variant || "default"}
              size={size}
              onClick={btn.onClick}
              disabled={btn.disabled}
              className="whitespace-nowrap"
            >
              {btn.icon}
              <span className={btn.icon ? "ml-2" : ""}>{btn.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }
);
ResponsiveButtonGroup.displayName = "ResponsiveButtonGroup";

/**
 * SimpleResponsiveButtons - Simpler wrapper that just handles flex-wrap
 */
const SimpleResponsiveButtons = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap gap-2",
        "justify-start sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
SimpleResponsiveButtons.displayName = "SimpleResponsiveButtons";

export { ResponsiveButtonGroup, SimpleResponsiveButtons };
