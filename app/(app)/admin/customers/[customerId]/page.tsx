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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer detail"
        title={detail.customer.name}
        description={`${detail.customer.address} - ${detail.customer.area}`}
        actions={
          <>
            <Link
              href={`/admin/subscriptions/new?customerId=${detail.customer.id}`}
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
            >
              New subscription
            </Link>
            <Link
              href={`/admin/payments/new?customerId=${detail.customer.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}
            >
              Add payment
            </Link>
            <Link
              href={`/admin/customers/${detail.customer.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}
            >
              Edit customer
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Current due</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.totals.currentDue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active subscriptions</p><p className="mt-2 text-3xl font-semibold">{detail.activeSubscriptions.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total paid</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.totals.totalPaid)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Phone: {detail.customer.phone}</p>
            {detail.customer.alternatePhone ? <p>Alt phone: {detail.customer.alternatePhone}</p> : null}
            <p>Area: {detail.customer.area}</p>
            <p>Status: {detail.customer.isActive ? "Active" : "Inactive"}</p>
            <p>Notes: {detail.customer.notes || "No special notes"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscriptions recorded yet.</p>
            ) : (
              detail.subscriptions.map((subscription) => {
                const assignedRider = riders.find((rider) => rider.id === subscription.riderId);

                return (
                  <div key={subscription.id} className="rounded-3xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{subscription.bottlesPerDelivery} bottles per stop</p>
                        <p className="text-sm text-muted-foreground">
                          {subscription.deliveryFrequency.replaceAll("_", " ")} - {subscription.preferredTimeSlot || "Any time"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Rider: {assignedRider?.name || "Unassigned"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(subscription.monthlyAmount)} / {subscription.billingCycle}
                        </p>
                      </div>
                      <div className="space-y-2 text-right">
                        <StatusBadge status={subscription.status} />
                        <Link
                          href={`/admin/subscriptions/${subscription.id}/edit`}
                          className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl")}
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Delivery history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.deliveryRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries recorded yet.</p>
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
      </div>
    </div>
  );
}
