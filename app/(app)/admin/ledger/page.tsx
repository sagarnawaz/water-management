import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getCustomer, listCustomers } from "@/services/data";

type LedgerPageProps = {
  searchParams: Promise<{
    customerId?: string;
  }>;
};

export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const params = await searchParams;
  const customers = await listCustomers();
  const activeCustomerId = params.customerId || customers[0]?.id;
  const detail = activeCustomerId ? await getCustomer(activeCustomerId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ledger"
        title="Customer running balance"
        description="Every order and payment writes to the ledger so due reconciliation stays audit friendly."
        actions={
          <Link
            href="/admin/payments/new"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 rounded-2xl",
            )}
          >
            Record payment
          </Link>
        }
      />

      {customers.length === 0 ? (
        <EmptyState
          title="No customers available for ledger review"
          description="Create a customer first, then orders and payments will begin building the running balance."
          action={
            <Link
              href="/admin/customers/new"
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
            >
              Add customer
            </Link>
          }
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select name="customerId" defaultValue={activeCustomerId}>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl")}
                >
                  Load ledger
                </button>
              </form>
            </CardContent>
          </Card>

          {detail ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Total orders</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatCurrency(detail.totals.totalOrders)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Total paid</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatCurrency(detail.totals.totalPaid)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">Current due</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {formatCurrency(detail.totals.currentDue)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{detail.customer.name} ledger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detail.ledger.length === 0 ? (
                    <EmptyState
                      title="No ledger entries yet"
                      description="Orders and payments for this customer will start building the balance history here."
                    />
                  ) : (
                    detail.ledger.map((entry) => (
                      <div key={entry.id} className="rounded-3xl border border-border/70 p-4">
                        <div className="grid gap-3 text-sm sm:grid-cols-[1.6fr_0.9fr_0.9fr_1fr]">
                          <div>
                            <p className="font-medium text-foreground">
                              {entry.description}
                            </p>
                            <p className="text-muted-foreground">
                              {formatDate(entry.createdAt)}
                            </p>
                          </div>
                          <p>Debit: {formatCurrency(entry.debit)}</p>
                          <p>Credit: {formatCurrency(entry.credit)}</p>
                          <p className="font-semibold">
                            Balance: {formatCurrency(entry.balanceSnapshot)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              title="This customer could not be loaded"
              description="Try another customer from the selector or refresh the page."
            />
          )}
        </>
      )}
    </div>
  );
}
