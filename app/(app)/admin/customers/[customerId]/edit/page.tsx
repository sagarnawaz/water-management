import { notFound } from "next/navigation";

import { CustomerForm } from "@/components/forms/customer-form";
import { PageHeader } from "@/components/layout/page-header";
import { getCustomer, listRiders } from "@/services/data";

type EditCustomerProps = {
  params: Promise<{ customerId: string }>;
};

export default async function EditCustomerPage({ params }: EditCustomerProps) {
  const { customerId } = await params;
  const [detail, riders] = await Promise.all([getCustomer(customerId), listRiders()]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title={`Edit ${detail.customer.name}`}
        description="Adjust service month, rider assignment, and activation without breaking historical delivery records."
      />
      <CustomerForm customer={detail.customer} riders={riders} />
    </div>
  );
}
