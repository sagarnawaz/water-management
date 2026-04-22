import { PageHeader } from "@/components/layout/page-header";
import { SubscriptionForm } from "@/components/forms/subscription-form";
import { listCustomers, listRiders } from "@/services/data";

type NewSubscriptionPageProps = {
  searchParams: Promise<{ customerId?: string }>;
};

export default async function NewSubscriptionPage({ searchParams }: NewSubscriptionPageProps) {
  const params = await searchParams;
  const [customers, riders] = await Promise.all([listCustomers(), listRiders()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscriptions"
        title="Create subscription"
        description="Set up recurring delivery service so the system can generate daily delivery records automatically."
      />
      <SubscriptionForm
        customers={customers}
        riders={riders.filter((rider) => rider.status === "active")}
        customerId={params.customerId}
      />
    </div>
  );
}
