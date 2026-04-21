import * as React from "react";

import { cn } from "@/lib/utils";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-border/80 bg-background px-4 text-sm shadow-sm transition-colors focus-visible:border-primary/60 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
});

Select.displayName = "Select";

export { Select };
