import Link from "next/link";
import { ArrowRight, CreditCard, Route, Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getRiderDashboard } from "@/services/data";

export default async function RiderDashboardPage() {
  const user = await requireUser("rider");
  const dashboard = await getRiderDashboard(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rider"
        title="Today&apos;s route"
        description="See your assigned deliveries, track collections, and move quickly through each stop."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Today's deliveries"
          value={String(dashboard.todayDeliveriesCount)}
          hint="Stops assigned for today"
          icon={Route}
        />
        <MetricCard
          title="Pending stops"
          value={String(dashboard.pendingDeliveriesCount)}
          hint="Still waiting for completion"
          icon={ArrowRight}
        />
        <MetricCard
          title="Cash collected"
          value={formatCurrency(dashboard.cashCollectedToday)}
          hint="Today's recorded cash"
          icon={Wallet}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link
              href="/rider/deliveries"
              className={cn(buttonVariants({ size: "lg" }), "h-14 justify-start rounded-2xl")}
            >
              Open delivery queue
            </Link>
            <Link
              href="/rider/collections"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 justify-start rounded-2xl",
              )}
            >
              <CreditCard className="size-4" />
              View collections
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s assigned stops</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.deliveries.length === 0 ? (
              <EmptyState
                title="No deliveries assigned today"
                description="Check back after the owner assigns new customer stops."
              />
            ) : (
              dashboard.deliveries.map(({ order, customer }) => (
                <div key={order.id} className="rounded-3xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {customer?.name ?? "Customer"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer?.address ?? "Address unavailable"}
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

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/rider/deliveries/${order.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "rounded-2xl",
                      )}
                    >
                      View detail
                    </Link>
                    <Link
                      href={`/rider/deliveries/${order.id}/complete`}
                      className={cn(buttonVariants(), "rounded-2xl")}
                    >
                      Mark delivered
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
