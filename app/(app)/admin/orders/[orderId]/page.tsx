import Link from "next/link";
import { notFound } from "next/navigation";

import { cancelOrderFormAction } from "@/app/actions/mutations";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getOrder } from "@/services/data";

type OrderDetailProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: OrderDetailProps) {
  const { orderId } = await params;
  const detail = await getOrder(orderId);

  if (!detail || !detail.customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery detail"
        title={detail.order.orderNumber}
        description={`${detail.customer.name} - ${detail.customer.address}`}
        actions={
          <>
            <Link
              href={`/admin/orders/${detail.order.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl")}
            >
              Edit subscription
            </Link>
            <form action={cancelOrderFormAction.bind(null, detail.order.id)}>
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "destructive", size: "lg" }), "h-12 rounded-2xl")}
              >
                Cancel delivery
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Status</p><div className="mt-3"><StatusBadge status={detail.order.orderStatus} /></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Payment</p><div className="mt-3"><StatusBadge status={detail.order.paymentStatus} /></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Expected amount</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.order.totalAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Due</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(detail.order.dueAmount)}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Delivery summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Customer: {detail.customer.name}</p>
            <p>Phone: {detail.customer.phone}</p>
            <p>Assigned rider: {detail.rider?.name || "Unassigned"}</p>
            <p>Bottle quantity: {detail.order.bottleQty}</p>
            <p>Scheduled date: {formatDateTime(detail.order.deliveryDate)}</p>
            <p>Expected payment: {detail.order.expectedPaymentMethod.replaceAll("_", " ")}</p>
            {detail.subscription ? <p>Subscription status: {detail.subscription.status}</p> : null}
            <p>Notes: {detail.order.notes || "None"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Collections and proof</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {detail.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment entries linked yet.</p>
            ) : (
              detail.payments.map((payment) => (
                <div key={payment.id} className="rounded-3xl border border-border/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(payment.receivedAt)}</p>
                      {payment.transactionReference ? (
                        <p className="text-sm text-muted-foreground">Ref: {payment.transactionReference}</p>
                      ) : null}
                    </div>
                    <StatusBadge status={payment.paymentStatus} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ledger impact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {detail.ledger.map((entry) => (
            <div key={entry.id} className="rounded-3xl bg-muted/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{entry.description}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</p>
                </div>
                <p className="font-semibold">{formatCurrency(entry.balanceSnapshot)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
