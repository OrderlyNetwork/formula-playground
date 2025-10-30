import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  /** Optional right-aligned header content (e.g., action buttons) */
  headerRight?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, headerRight, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(className)} {...props}>
        {title && (
          <div className="border-b border-gray-200 px-3 py-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
              {headerRight ? (
                <div className="flex items-center gap-2">{headerRight}</div>
              ) : null}
            </div>
          </div>
        )}
        <div>{children}</div>
      </div>
    );
  }
);

Card.displayName = "Card";
