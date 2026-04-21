import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{hint}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
