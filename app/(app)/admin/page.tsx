import Link from "next/link";
import { ArrowRight, CreditCard, DollarSign, Package, Plus, Truck, Wallet } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { getAdminDashboardData } from "@/services/data";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboardData();
  const onRouteCount = dashboard.recentOrders.filter(
    (order) => order.orderStatus === "assigned" || order.orderStatus === "today",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Daily operations dashboard"
        description="Track dispatches, cash collection, pending dues, and rider accountability in one place."
        actions={
          <>
            <Link href="/admin/subscriptions/new" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}>
              <Plus className="size-4" />
              New Subscription
            </Link>
            <Link href="/admin/customers/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}>
              Add Customer
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Today's deliveries"
          value={String(dashboard.todayOrdersCount)}
          hint="Scheduled stops for today"
          icon={Package}
        />
        <MetricCard
          title="Completed"
          value={String(dashboard.deliveredOrdersCount)}
          hint="Delivered or partially delivered"
          icon={Truck}
        />
        <MetricCard
          title="Pending payments"
          value={String(dashboard.pendingPaymentsCount)}
          hint="Need admin verification"
          icon={CreditCard}
        />
        <MetricCard
          title="Total due"
          value={formatCurrency(dashboard.totalDue)}
          hint="Across all customer balances"
          icon={Wallet}
        />
        <MetricCard
          title="Cash collected today"
          value={formatCurrency(dashboard.cashCollectedToday)}
          hint="Rider and owner cash total"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-white/80 bg-white/95">
          <CardHeader className="gap-4 border-b border-border/60 pb-5">
            <div className="space-y-1.5">
              <CardTitle>Control center</CardTitle>
              <CardDescription>
                Keep dispatch, collections, and rider activity visible from one place.
              </CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-primary/[0.08] p-4">
                <p className="text-sm text-muted-foreground">Active subscriptions</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {dashboard.activeSubscriptionCount}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-muted-foreground">Customers in follow-up</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {dashboard.pendingDues.length}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-muted-foreground">Verification queue</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {dashboard.pendingPaymentsCount}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
            <Link
              href="/admin/subscriptions/new"
              className={cn(buttonVariants({ size: "lg" }), "h-14 justify-between rounded-2xl px-4")}
            >
              <span>Create subscription</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/admin/customers/new"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 justify-between rounded-2xl px-4",
              )}
            >
              <span>Add customer</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/admin/riders/new"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 justify-between rounded-2xl px-4",
              )}
            >
              <span>Add rider</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/admin/payments"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 justify-between rounded-2xl px-4",
              )}
            >
              <span>Review payments</span>
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle>Operations snapshot</CardTitle>
            <CardDescription>Live overview of the active delivery network.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Customers</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {dashboard.customerCount}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Riders</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {dashboard.riderCount}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">On route</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{onRouteCount}</p>
            </div>
            <div className="rounded-3xl bg-primary/[0.08] p-4">
              <p className="text-sm text-muted-foreground">Pending payments</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {dashboard.pendingPaymentsCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/80 bg-white/95">
          <CardHeader>
            <CardTitle>Recent deliveries</CardTitle>
            <CardDescription>Latest scheduled deliveries and payment expectations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                No recent deliveries are available yet.
              </div>
            ) : (
              dashboard.recentOrders.map((order) => (
                <div key={order.id} className="rounded-3xl border border-border/70 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">{order.orderNumber}</p>
                      <p className="truncate text-sm text-muted-foreground">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.deliveryDate)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <StatusBadge status={order.orderStatus} />
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle>Pending dues</CardTitle>
              <CardDescription>Customers that need follow-up or collection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.pendingDues.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                  No pending due balances right now.
                </div>
              ) : (
                dashboard.pendingDues.map((item) => (
                  <div key={item.customer.id} className="rounded-3xl border border-border/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.customer.name}</p>
                        <p className="text-sm text-muted-foreground">{item.customer.area}</p>
                      </div>
                      <p className="shrink-0 font-semibold text-foreground">
                        {formatCurrency(item.dueAmount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/95">
            <CardHeader>
              <CardTitle>Rider collection summary</CardTitle>
              <CardDescription>Cash and pending reconciliation by rider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.riderCollectionSummary.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
                  Rider summaries will appear after dispatch activity starts.
                </div>
              ) : (
                dashboard.riderCollectionSummary.map((summary) => (
                  <div key={summary.riderId} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{summary.riderName}</p>
                        <p className="text-sm text-muted-foreground">
                          {summary.deliveredCount} completed deliveries
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(summary.cashCollected)}
                        </p>
                        <p className="text-muted-foreground">
                          Pending {formatCurrency(summary.pendingReconciliation)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
