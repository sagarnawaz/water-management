import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed bg-card/70">
      <CardContent className="p-8 text-center">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
