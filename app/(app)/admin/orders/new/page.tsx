import { OrderWizardForm } from "@/components/forms/order-wizard-form";
import { PageHeader } from "@/components/layout/page-header";
import { listCustomers, listRiders } from "@/services/data";

export default async function NewOrderPage() {
  const [customers, riders] = await Promise.all([listCustomers(), listRiders()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Create order"
        description="Follow the guided mobile workflow to assign delivery and capture the expected payment path."
      />
      <OrderWizardForm customers={customers} riders={riders.filter((rider) => rider.status === "active")} />
    </div>
  );
}
