import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPinned, Phone } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getOrder } from "@/services/data";

type RiderDeliveryDetailProps = {
  params: Promise<{ orderId: string }>;
};

export default async function RiderDeliveryDetailPage({
  params,
}: RiderDeliveryDetailProps) {
  const { orderId } = await params;
  const detail = await getOrder(orderId);

  if (!detail || !detail.customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Delivery detail"
        title={detail.customer.name}
        description={detail.customer.address}
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{detail.order.orderNumber}</p>
              <p className="text-sm text-muted-foreground">{detail.customer.phone}</p>
            </div>
            <StatusBadge status={detail.order.orderStatus} />
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <p>Quantity: {detail.order.bottleQty}</p>
            <p>Total amount: {formatCurrency(detail.order.totalAmount)}</p>
            <p>Delivery date: {formatDateTime(detail.order.deliveryDate)}</p>
            <p>Expected payment: {detail.order.expectedPaymentMethod.replaceAll("_", " ")}</p>
            <p className="sm:col-span-2">Notes: {detail.order.notes || "No notes"}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <a href={`tel:${detail.customer.phone}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl justify-center")}>
              <Phone className="size-4" />
              Call customer
            </a>
            <a href={detail.order.locationUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl justify-center")}>
              <MapPinned className="size-4" />
              Open location
            </a>
            <Link href={`/rider/deliveries/${detail.order.id}/complete`} className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl justify-center")}>
              Mark delivered
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
