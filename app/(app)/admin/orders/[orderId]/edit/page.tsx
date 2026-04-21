import { notFound } from "next/navigation";

import { OrderWizardForm } from "@/components/forms/order-wizard-form";
import { PageHeader } from "@/components/layout/page-header";
import { getOrder, listCustomers, listRiders } from "@/services/data";

type EditOrderProps = {
  params: Promise<{ orderId: string }>;
};

export default async function EditOrderPage({ params }: EditOrderProps) {
  const { orderId } = await params;
  const [detail, customers, riders] = await Promise.all([
    getOrder(orderId),
    listCustomers(),
    listRiders(),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title={`Edit ${detail.order.orderNumber}`}
        description="Change quantities, update assignment, or correct payment expectations without deleting history."
      />
      <OrderWizardForm customers={customers} riders={riders.filter((rider) => rider.status === "active")} order={detail.order} />
    </div>
  );
}
