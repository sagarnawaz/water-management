import { notFound } from "next/navigation";

import { DeliveryCompletionForm } from "@/components/forms/delivery-completion-form";
import { PageHeader } from "@/components/layout/page-header";
import { getOrder } from "@/services/data";

type DeliveryCompleteProps = {
  params: Promise<{ orderId: string }>;
};

export default async function DeliveryCompletePage({ params }: DeliveryCompleteProps) {
  const { orderId } = await params;
  const detail = await getOrder(orderId);

  if (!detail || !detail.customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mark delivered"
        title={`Complete ${detail.order.orderNumber}`}
        description="Delivery cannot be closed until a payment outcome is selected."
      />
      <DeliveryCompletionForm order={detail.order} customer={detail.customer} />
    </div>
  );
}
