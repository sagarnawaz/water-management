import Link from "next/link";

import { reviewPaymentAction } from "@/app/actions/mutations";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPaymentHistory, getPendingPayments } from "@/services/data";

export default async function PaymentsPage() {
  const [pending, history] = await Promise.all([
    getPendingPayments(),
    getPaymentHistory(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payments"
        title="Payment verification"
        description="Verify online claims, reject mismatches, and log manual owner collections."
        actions={
          <Link
            href="/admin/payments/new"
            className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl")}
          >
            Manual payment entry
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Pending payment verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState
              title="No payments are waiting for review"
              description="When riders submit online claims, they will appear here for verification."
              action={
                <Link
                  href="/admin/payments/new"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-2xl",
                  )}
                >
                  Record manual payment
                </Link>
              }
            />
          ) : (
            pending.map((payment) => (
              <div key={payment.id} className="rounded-3xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {payment.customer?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(payment.amount)} |{" "}
                      {payment.paymentMethod.replaceAll("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Rider: {payment.rider?.name || "Unassigned"} |{" "}
                      {formatDate(payment.receivedAt)}
                    </p>
                    {payment.transactionReference ? (
                      <p className="text-sm text-muted-foreground">
                        Ref: {payment.transactionReference}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={payment.paymentStatus} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={reviewPaymentAction.bind(null, payment.id, "verified")}>
                    <button
                      type="submit"
                      className={cn(buttonVariants(), "rounded-2xl")}
                    >
                      Verify payment
                    </button>
                  </form>
                  <form action={reviewPaymentAction.bind(null, payment.id, "rejected")}>
                    <button
                      type="submit"
                      className={cn(
                        buttonVariants({ variant: "destructive" }),
                        "rounded-2xl",
                      )}
                    >
                      Reject payment
                    </button>
                  </form>
                  <Link
                    href="/admin/payments/new"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "rounded-2xl",
                    )}
                  >
                    Add note / adjust
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <EmptyState
              title="No payments recorded yet"
              description="Once riders or the owner record collections, the history feed will appear here."
            />
          ) : (
            history.map((payment) => (
              <div key={payment.id} className="rounded-3xl bg-muted/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{payment.customer?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(payment.amount)} | {formatDate(payment.receivedAt)}
                    </p>
                  </div>
                  <StatusBadge status={payment.paymentStatus} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
