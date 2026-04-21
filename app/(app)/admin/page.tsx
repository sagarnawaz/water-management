import Link from "next/link";
import { CreditCard, DollarSign, Package, Plus, Truck, Wallet } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { getAdminDashboardData, listCustomers, listRiders } from "@/services/data";

export default async function AdminDashboardPage() {
  const [dashboard, customers, riders] = await Promise.all([
    getAdminDashboardData(),
    listCustomers(),
    listRiders(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Daily operations dashboard"
        description="Track dispatches, cash collection, pending dues, and rider accountability in one place."
        actions={
          <>
            <Link href="/admin/orders/new" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}>
              <Plus className="size-4" />
              New Order
            </Link>
            <Link href="/admin/customers/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}>
              Add Customer
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Today's orders"
          value={String(dashboard.todayOrdersCount)}
          hint="All deliveries planned for today"
          icon={Package}
        />
        <MetricCard
          title="Delivered"
          value={String(dashboard.deliveredOrdersCount)}
          hint="Completed delivery updates"
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

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Fast shortcuts for the owner&apos;s daily workflow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href="/admin/orders/new" className={cn(buttonVariants({ size: "lg" }), "h-14 justify-start rounded-2xl")}>
              Create order
            </Link>
            <Link href="/admin/customers/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-14 justify-start rounded-2xl")}>
              Add customer
            </Link>
            <Link href="/admin/riders/new" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-14 justify-start rounded-2xl")}>
              Add rider
            </Link>
            <Link href="/admin/payments" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-14 justify-start rounded-2xl")}>
              Pending payments
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations snapshot</CardTitle>
            <CardDescription>Active network overview.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">Customers</p>
              <p className="mt-2 text-2xl font-semibold">{customers.length}</p>
            </div>
            <div className="rounded-3xl bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">Riders</p>
              <p className="mt-2 text-2xl font-semibold">{riders.length}</p>
            </div>
            <div className="rounded-3xl bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">On route</p>
              <p className="mt-2 text-2xl font-semibold">
                {
                  dashboard.recentOrders.filter((order) => order.orderStatus === "assigned")
                    .length
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest dispatches and payment expectations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentOrders.map((order) => (
              <div key={order.id} className="rounded-3xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {customers.find((customer) => customer.id === order.customerId)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(order.deliveryDate)}</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <StatusBadge status={order.orderStatus} />
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending dues</CardTitle>
              <CardDescription>Customers that need follow-up or collection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.pendingDues.map((item) => (
                <div key={item.customer.id} className="rounded-3xl border border-border/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.customer.name}</p>
                      <p className="text-sm text-muted-foreground">{item.customer.area}</p>
                    </div>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(item.dueAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rider collection summary</CardTitle>
              <CardDescription>Cash and pending reconciliation by rider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.riderCollectionSummary.map((summary) => (
                <div key={summary.riderId} className="rounded-3xl bg-muted/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{summary.riderName}</p>
                      <p className="text-sm text-muted-foreground">
                        {summary.deliveredCount} delivered orders
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{formatCurrency(summary.cashCollected)}</p>
                      <p className="text-muted-foreground">
                        Pending {formatCurrency(summary.pendingReconciliation)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
