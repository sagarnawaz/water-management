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
        eyebrow="Update delivery"
        title={`Complete ${detail.order.orderNumber}`}
        description="A delivery record cannot be closed until its status and payment outcome are captured."
      />
      <DeliveryCompletionForm
        deliveryRecord={detail.deliveryRecord}
        subscription={detail.subscription}
        customer={detail.customer}
      />
    </div>
  );
}
