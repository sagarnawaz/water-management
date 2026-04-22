import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCustomer, listRiders } from "@/services/data";

type CustomerDetailProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CustomerDetailPage({ params }: CustomerDetailProps) {
  const { customerId } = await params;
  const [detail, riders] = await Promise.all([getCustomer(customerId), listRiders()]);

  if (!detail) {
    notFound();
  }

  const assignedRider = riders.find((rider) => rider.id === detail.customer.assignedRiderId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer detail"
        title={detail.customer.name}
        description={`${detail.customer.address} - ${detail.customer.area}`}
        actions={
          <>
            <Link href={`/admin/orders/new?customerId=${detail.customer.id}`} className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}>
              Manual order
            </Link>
            <Link href={`/admin/payments/new?customerId=${detail.customer.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}>
              Add payment
            </Link>
            <Link href={`/admin/customers/${detail.customer.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}>
              Edit customer
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Current due</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.totals.currentDue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total orders</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.totals.totalOrders)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total paid</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.totals.totalPaid)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile and service plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Phone: {detail.customer.phone}</p>
            {detail.customer.alternatePhone ? <p>Alt phone: {detail.customer.alternatePhone}</p> : null}
            <p>Area: {detail.customer.area}</p>
            <p>Status: {detail.customer.isActive ? "Active" : "Inactive"}</p>
            <p>Assigned rider: {assignedRider?.name || "Not assigned"}</p>
            <p>Daily bottles: {detail.customer.dailyBottleQty}</p>
            <p>Price per bottle: {formatCurrency(detail.customer.pricePerBottle)}</p>
            <p>Default payment: {detail.customer.paymentMethod.replaceAll("_", " ")}</p>
            <p>Billing month: {detail.customer.billingMonth}</p>
            <p>Service starts: {detail.customer.serviceStartDate}</p>
            <p>Service ends: {detail.customer.serviceEndDate}</p>
            {detail.serviceSummary ? (
              <p>
                Current month estimate: {detail.serviceSummary.remainingDays} days - {formatCurrency(detail.serviceSummary.estimatedAmount)}
              </p>
            ) : null}
            <p>Notes: {detail.customer.notes || "No special notes"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders recorded yet.</p>
            ) : (
              detail.orders.map((order) => (
                <div key={order.id} className="rounded-3xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.deliveryDate)}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <StatusBadge status={order.orderStatus} />
                      <p className="text-sm font-medium">{formatCurrency(order.totalAmount)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              detail.payments.map((payment) => (
                <div key={payment.id} className="rounded-3xl border border-border/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(payment.receivedAt)}</p>
                    </div>
                    <StatusBadge status={payment.paymentStatus} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ledger snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
            ) : (
              detail.ledger.map((entry) => (
                <div key={entry.id} className="rounded-3xl bg-muted/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(entry.balanceSnapshot)}</p>
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
