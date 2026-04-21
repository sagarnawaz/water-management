import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border border-border/80 bg-background px-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
