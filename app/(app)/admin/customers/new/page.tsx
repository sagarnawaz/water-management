import { CustomerForm } from "@/components/forms/customer-form";
import { PageHeader } from "@/components/layout/page-header";
import { listRiders } from "@/services/data";

export default async function NewCustomerPage() {
  const riders = await listRiders();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Add customer"
        description="Create the customer profile first, then attach a subscription for daily service."
      />
      <CustomerForm riders={riders} />
    </div>
  );
}
