import { PaymentForm } from "@/components/forms/payment-form";
import { PageHeader } from "@/components/layout/page-header";
import { listCustomers, listOrders, listRiders } from "@/services/data";

export default async function ManualPaymentPage() {
  const [customers, riders, orders] = await Promise.all([
    listCustomers(),
    listRiders(),
    listOrders(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payments"
        title="Manual payment entry"
        description="Record later collections taken by the owner or reconcile rider-submitted payments."
      />
      <PaymentForm customers={customers} riders={riders} orders={orders} />
    </div>
  );
}
