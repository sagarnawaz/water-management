import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { getRider, listCustomers } from "@/services/data";

type RiderDetailProps = {
  params: Promise<{ riderId: string }>;
};

export default async function RiderDetailPage({ params }: RiderDetailProps) {
  const { riderId } = await params;
  const [detail, customers] = await Promise.all([
    getRider(riderId),
    listCustomers(),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rider detail"
        title={detail.rider.name}
        description={`${detail.rider.phone} • ${detail.rider.vehicleNumber}`}
        actions={
          <Link href={`/admin/riders/${detail.rider.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}>
            Edit rider
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Status</p><div className="mt-3"><StatusBadge status={detail.rider.status} /></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Today&apos;s deliveries</p><p className="mt-2 text-3xl font-semibold">{detail.totals.todayDeliveries}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Delivered</p><p className="mt-2 text-3xl font-semibold">{detail.totals.deliveredOrders}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Cash collected</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.totals.totalCollectedCash)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Assigned orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.orders.map((order) => (
              <div key={order.id} className="rounded-3xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {customers.find((customer) => customer.id === order.customerId)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(order.deliveryDate)}</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <StatusBadge status={order.orderStatus} />
                    <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-3xl bg-muted/60 p-4">
              <p className="text-sm text-muted-foreground">Pending reconciliation</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(detail.totals.pendingReconciliation)}
              </p>
            </div>
            {detail.payments.map((payment) => (
              <div key={payment.id} className="rounded-3xl border border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(payment.receivedAt)}</p>
                  </div>
                  <StatusBadge status={payment.paymentStatus} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
