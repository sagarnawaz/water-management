import { CustomerForm } from "@/components/forms/customer-form";
import { PageHeader } from "@/components/layout/page-header";
import { BUSINESS_PROFILE } from "@/lib/constants";
import { getAreas, listRiders } from "@/services/data";

export default async function NewCustomerPage() {
  const [riders, areas] = await Promise.all([listRiders(), getAreas()]);
  const areaOptions = Array.from(new Set([...BUSINESS_PROFILE.serviceAreas, ...areas])).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Add customer"
        description="Create the customer profile first, then attach a subscription for daily service."
      />
      <CustomerForm riders={riders} areaOptions={areaOptions} />
    </div>
  );
}
