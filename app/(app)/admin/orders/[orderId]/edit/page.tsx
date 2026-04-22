import { notFound, redirect } from "next/navigation";

import { getOrder } from "@/services/data";

type EditOrderProps = {
  params: Promise<{ orderId: string }>;
};

export default async function EditOrderPage({ params }: EditOrderProps) {
  const { orderId } = await params;
  const detail = await getOrder(orderId);

  if (!detail) {
    notFound();
  }

  if (!detail.subscription) {
    redirect(`/admin/orders/${orderId}`);
  }

  redirect(`/admin/subscriptions/${detail.subscription.id}/edit`);
}
