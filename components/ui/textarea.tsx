import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };
