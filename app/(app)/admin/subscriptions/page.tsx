import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listCustomers, listRiders, listSubscriptions } from "@/services/data";

export default async function SubscriptionsPage() {
  const [subscriptions, customers, riders] = await Promise.all([
    listSubscriptions(),
    listCustomers(),
    listRiders(),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const riderMap = new Map(riders.map((rider) => [rider.id, rider]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Subscriptions"
        title="Service subscriptions"
        description="Manage recurring delivery plans that generate the daily rider workload."
        actions={
          <Link
            href="/admin/subscriptions/new"
            className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
          >
            <Plus className="size-4" />
            Create subscription
          </Link>
        }
      />

      {subscriptions.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          description="Create a customer, then add a subscription to start generating delivery records."
          action={
            <Link
              href="/admin/subscriptions/new"
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
            >
              <Plus className="size-4" />
              Create subscription
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">
                      {customerMap.get(subscription.customerId)?.name ?? "Customer"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.bottlesPerDelivery} bottles - {subscription.deliveryFrequency.replaceAll("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.preferredTimeSlot || "Any slot"}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <StatusBadge status={subscription.status} />
                    <p className="text-sm font-medium">
                      {formatCurrency(subscription.monthlyAmount)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>Rider: {subscription.riderId ? riderMap.get(subscription.riderId)?.name || "Unassigned" : "Unassigned"}</p>
                  <p>Payment: {subscription.paymentMethod.replaceAll("_", " ")}</p>
                  <p>Starts: {subscription.startDate}</p>
                  <p>Ends: {subscription.endDate || "Open"}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/customers/${subscription.customerId}`}
                    className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl")}
                  >
                    Customer detail
                  </Link>
                  <Link
                    href={`/admin/subscriptions/${subscription.id}/edit`}
                    className={cn(buttonVariants(), "rounded-2xl")}
                  >
                    Edit subscription
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
