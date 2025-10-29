import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-gray-200 bg-white shadow-sm",
          className
        )}
        {...props}
      >
        {title && (
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    );
  }
);

Card.displayName = "Card";
