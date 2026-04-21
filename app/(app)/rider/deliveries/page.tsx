import Link from "next/link";
import { ExternalLink, MapPinned, Phone, Route } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getRiderDeliveries } from "@/services/data";

export default async function RiderDeliveriesPage() {
  const user = await requireUser("rider");
  const deliveries = await getRiderDeliveries(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Deliveries"
        title="Assigned delivery queue"
        description="A complete list of your assigned stops with quick actions for calling, directions, and delivery completion."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Assigned orders"
          value={String(deliveries.totalCount)}
          hint="All assigned stops"
          icon={Route}
        />
        <MetricCard
          title="Pending completion"
          value={String(deliveries.pendingCount)}
          hint="Still to deliver"
          icon={ExternalLink}
        />
        <MetricCard
          title="Delivered"
          value={String(deliveries.deliveredCount)}
          hint="Already completed"
          icon={MapPinned}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deliveries.items.length === 0 ? (
            <EmptyState
              title="No deliveries assigned yet"
              description="New rider assignments will show up here with the most urgent stops first."
              action={
                <Link
                  href="/rider"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 rounded-2xl",
                  )}
                >
                  Back to dashboard
                </Link>
              }
            />
          ) : (
            deliveries.items.map(({ order, customer }) => {
              if (!customer) return null;

              return (
                <div
                  key={order.id}
                  className="rounded-[1.75rem] border border-border/70 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">
                        {customer.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.bottleQty} bottles | {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(order.deliveryDate)}
                      </p>
                    </div>
                    <div className="space-y-2 text-right">
                      <StatusBadge status={order.orderStatus} />
                      <p className="text-sm text-muted-foreground">
                        {order.expectedPaymentMethod.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <a
                      href={`tel:${customer.phone}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "h-12 justify-center rounded-2xl",
                      )}
                    >
                      <Phone className="size-4" />
                      Call
                    </a>
                    <a
                      href={order.locationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "h-12 justify-center rounded-2xl",
                      )}
                    >
                      <MapPinned className="size-4" />
                      Map
                    </a>
                    <Link
                      href={`/rider/deliveries/${order.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "lg" }),
                        "h-12 justify-center rounded-2xl",
                      )}
                    >
                      <ExternalLink className="size-4" />
                      Detail
                    </Link>
                    <Link
                      href={`/rider/deliveries/${order.id}/complete`}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "h-12 justify-center rounded-2xl",
                      )}
                    >
                      Mark delivered
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
