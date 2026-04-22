import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listCustomerSummaries, listRiders } from "@/services/data";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string;
    view?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const [customerSummaries, riders] = await Promise.all([
    listCustomerSummaries(params.q),
    listRiders(),
  ]);
  const view = params.view === "list" ? "list" : "cards";
  const riderMap = new Map(riders.map((rider) => [rider.id, rider.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Customer management"
        description="Search customers, review service plans, and keep rider assignments and due balances aligned."
        actions={
          <Link
            href="/admin/customers/new"
            className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
          >
            <Plus className="size-4" />
            Add customer
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <form className="flex flex-1 items-center gap-3" method="get">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                className="pl-10"
                placeholder="Search by name, phone, or area"
              />
            </div>
          </form>
          <div className="flex gap-2">
            <Link
              href={`/admin/customers?view=cards${params.q ? `&q=${params.q}` : ""}`}
              className={cn(
                buttonVariants({ variant: view === "cards" ? "default" : "outline" }),
                "rounded-2xl",
              )}
            >
              Cards
            </Link>
            <Link
              href={`/admin/customers?view=list${params.q ? `&q=${params.q}` : ""}`}
              className={cn(
                buttonVariants({ variant: view === "list" ? "default" : "outline" }),
                "rounded-2xl",
              )}
            >
              Compact
            </Link>
          </div>
        </CardContent>
      </Card>

      {customerSummaries.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Try a different search term or add a new customer."
        />
      ) : (
        <div className={cn("grid gap-4", view === "cards" ? "lg:grid-cols-2" : "grid-cols-1")}>
          {customerSummaries.map(({ customer, totals }) => (
            <Card key={customer.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700">
                    Due {formatCurrency(totals.currentDue)}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{customer.address}</p>
                  <p>{customer.area}</p>
                  <p>
                    {customer.dailyBottleQty} bottles / day - {riderMap.get(customer.assignedRiderId ?? "") || "No rider assigned"}
                  </p>
                  <p>
                    {customer.isActive ? "Active" : "Inactive"} - Month {customer.billingMonth}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/customers/${customer.id}`} className={cn(buttonVariants(), "rounded-2xl")}>
                    View details
                  </Link>
                  <Link
                    href={`/admin/orders/new?customerId=${customer.id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl")}
                  >
                    Manual order
                  </Link>
                  <Link
                    href={`/admin/payments/new?customerId=${customer.id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl")}
                  >
                    Add payment
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
