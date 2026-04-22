import { notFound } from "next/navigation";

import { SubscriptionForm } from "@/components/forms/subscription-form";
import { PageHeader } from "@/components/layout/page-header";
import { getSubscription, listCustomers, listRiders } from "@/services/data";

type EditSubscriptionPageProps = {
  params: Promise<{ subscriptionId: string }>;
};

export default async function EditSubscriptionPage({
  params,
}: EditSubscriptionPageProps) {
  const { subscriptionId } = await params;
  const [detail, customers, riders] = await Promise.all([
    getSubscription(subscriptionId),
    listCustomers(),
    listRiders(),
  ]);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscriptions"
        title={`Edit ${detail.customer?.name ?? "subscription"}`}
        description="Update recurring delivery terms without losing daily delivery history."
      />
      <SubscriptionForm
        customers={customers}
        riders={riders.filter((rider) => rider.status === "active")}
        subscription={detail.subscription}
      />
    </div>
  );
}
