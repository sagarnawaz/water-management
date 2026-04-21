import Link from "next/link";
import { Plus } from "lucide-react";

import { cancelOrderFormAction } from "@/app/actions/mutations";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listCustomers, listOrders, listRiders } from "@/services/data";

type OrdersPageProps = {
  searchParams: Promise<{
    filter?: string;
  }>;
};

const filters = [
  "all",
  "today",
  "assigned",
  "delivered",
  "pending_payment",
  "cancelled",
];

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const activeFilter = filters.includes(params.filter || "")
    ? params.filter!
    : "all";
  const [orders, customers, riders] = await Promise.all([
    listOrders(activeFilter),
    listCustomers(),
    listRiders(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Order management"
        description="Handle dispatching, rider assignment, payment expectation, and cancellation without losing history."
        actions={
          <Link
            href="/admin/orders/new"
            className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
          >
            <Plus className="size-4" />
            Create order
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {filters.map((filter) => (
            <Link
              key={filter}
              href={`/admin/orders?filter=${filter}`}
              className={cn(
                buttonVariants({
                  variant: activeFilter === filter ? "default" : "outline",
                }),
                "rounded-2xl",
              )}
            >
              {filter.replaceAll("_", " ")}
            </Link>
          ))}
        </CardContent>
      </Card>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders in this filter"
          description="Create a new order or switch the filter to review another stage of the dispatch pipeline."
          action={
            <Link
              href="/admin/orders/new"
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
            >
              <Plus className="size-4" />
              Create order
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {customers.find((customer) => customer.id === order.customerId)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.deliveryDate)}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <StatusBadge status={order.orderStatus} />
                    <StatusBadge status={order.paymentStatus} />
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <p>
                    Rider:{" "}
                    {riders.find((rider) => rider.id === order.riderId)?.name ||
                      "Unassigned"}
                  </p>
                  <p>Qty: {order.bottleQty}</p>
                  <p>Total: {formatCurrency(order.totalAmount)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className={cn(buttonVariants(), "rounded-2xl")}
                  >
                    View detail
                  </Link>
                  <Link
                    href={`/admin/orders/${order.id}/edit`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "rounded-2xl",
                    )}
                  >
                    Edit / reassign
                  </Link>
                  <form action={cancelOrderFormAction.bind(null, order.id)}>
                    <button
                      type="submit"
                      className={cn(
                        buttonVariants({ variant: "destructive" }),
                        "rounded-2xl",
                      )}
                    >
                      Cancel order
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
