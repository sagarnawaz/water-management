import Link from "next/link";
import { ArrowRight, CreditCard, Route, Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { isDeliveryCompleted } from "@/lib/delivery-status";
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
        description="See today&apos;s deliveries and any pending older stops that still need action."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Today + pending"
          value={String(dashboard.todayDeliveriesCount)}
          hint="Current work only"
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

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="overflow-hidden border-white/80 bg-white/95">
          <CardHeader className="gap-4 border-b border-border/60 pb-5">
            <div className="space-y-1.5">
              <CardTitle>Route focus</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Stay on pace, record each collection clearly, and complete every stop with the right payment status.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-primary/[0.08] p-4">
                <p className="text-sm text-muted-foreground">Today + pending</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {dashboard.todayDeliveriesCount}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-muted-foreground">Still pending</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {dashboard.pendingDeliveriesCount}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5">
            <Link
              href="/rider/deliveries"
              className={cn(buttonVariants({ size: "lg" }), "h-14 justify-between rounded-2xl px-4")}
            >
              <span>Open delivery queue</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/rider/collections"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 justify-between rounded-2xl px-4",
              )}
            >
              <span className="flex items-center gap-2">
                <CreditCard className="size-4" />
                View collections
              </span>
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle>Today&apos;s assigned stops</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Includes any older stop that was not completed yet.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.deliveries.length === 0 ? (
              <EmptyState
                title="No deliveries assigned today"
                description="Check back after the owner assigns today&apos;s stops."
              />
            ) : (
              dashboard.deliveries.map(({ order, customer, deliveryRecord }) => {
                const isCompleted = isDeliveryCompleted(deliveryRecord.status);

                return (
                  <div key={order.id} className="rounded-3xl border border-border/70 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
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
                      <div className="flex flex-col items-start gap-2 sm:items-end">
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
                          isCompleted ? "w-full justify-center" : "",
                        )}
                      >
                        View details
                      </Link>
                      {isCompleted ? null : (
                        <Link
                          href={`/rider/deliveries/${order.id}/complete`}
                          className={cn(buttonVariants(), "rounded-2xl")}
                        >
                          Mark delivered
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
