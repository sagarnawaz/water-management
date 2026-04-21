import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { getRider, listRiders } from "@/services/data";

export default async function RidersPage() {
  const riders = await listRiders();
  const riderDetails = await Promise.all(
    riders.map(async (rider) => ({
      rider,
      detail: await getRider(rider.id),
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Riders"
        title="Rider management"
        description="Keep assignment capacity, collections, and reconciliation clear for each rider."
        actions={
          <Link
            href="/admin/riders/new"
            className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
          >
            <Plus className="size-4" />
            Add rider
          </Link>
        }
      />

      {riderDetails.length === 0 ? (
        <EmptyState
          title="No riders added yet"
          description="Add your first rider to start assigning deliveries and tracking collection accountability."
          action={
            <Link
              href="/admin/riders/new"
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
            >
              <Plus className="size-4" />
              Add rider
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {riderDetails.map(({ rider, detail }) => (
            <Card key={rider.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{rider.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {rider.phone} | {rider.vehicleNumber}
                    </p>
                  </div>
                  <StatusBadge status={rider.status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Today</p>
                    <p className="mt-2 text-xl font-semibold">
                      {detail?.totals.todayDeliveries}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Collected</p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatCurrency(detail?.totals.totalCollectedCash ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="mt-2 text-xl font-semibold">
                      {formatCurrency(detail?.totals.pendingReconciliation ?? 0)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/admin/riders/${rider.id}`}
                  className={cn(buttonVariants(), "rounded-2xl")}
                >
                  Open rider detail
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
