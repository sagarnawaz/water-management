import { CustomerForm } from "@/components/forms/customer-form";
import { PageHeader } from "@/components/layout/page-header";
import { listRiders } from "@/services/data";

export default async function NewCustomerPage() {
  const riders = await listRiders();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Add customer plan"
        description="Create the customer, assign the rider, choose the active billing month, and let daily orders flow automatically."
      />
      <CustomerForm riders={riders} />
    </div>
  );
}
