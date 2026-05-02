import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="overflow-hidden border-white/80 bg-white/95 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)]">
      <CardContent className="p-0">
        <div className="grid min-h-44 grid-cols-[1fr_auto] gap-4 p-5">
          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <p className="max-w-[18ch] text-sm font-medium leading-6 text-muted-foreground">
                {title}
              </p>
              <p className="break-words text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
                {value}
              </p>
            </div>

            <p className="max-w-[20ch] text-sm leading-6 text-muted-foreground">
              {hint}
            </p>
          </div>

          <div
            className={cn(
              "flex size-12 items-center justify-center self-start rounded-2xl",
              "bg-primary/10 text-primary ring-1 ring-primary/10",
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
