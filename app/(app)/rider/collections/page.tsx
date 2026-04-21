import Link from "next/link";
import { CreditCard, ShieldCheck, Wallet } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { capitalizeWords, formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getRiderCollections } from "@/services/data";

export default async function RiderCollectionsPage() {
  const user = await requireUser("rider");
  const collections = await getRiderCollections(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Collections"
        title="Collection history"
        description="Track what you collected today, what is still waiting for verification, and recent payment records tied to your deliveries."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Cash today"
          value={formatCurrency(collections.cashCollectedToday)}
          hint="Today's cash collections"
          icon={Wallet}
        />
        <MetricCard
          title="Pending verification"
          value={formatCurrency(collections.pendingVerificationAmount)}
          hint="Online claims waiting for owner review"
          icon={ShieldCheck}
        />
        <MetricCard
          title="Total recorded"
          value={formatCurrency(collections.totalRecordedAmount)}
          hint="All collections in your history"
          icon={CreditCard}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent collection records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {collections.items.length === 0 ? (
            <EmptyState
              title="No collection entries yet"
              description="When you submit delivery payments, they will appear here with their verification status."
              action={
                <Link
                  href="/rider/deliveries"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 rounded-2xl",
                  )}
                >
                  Open deliveries
                </Link>
              }
            />
          ) : (
            collections.items.map(({ payment, customer, order }) => (
              <div key={payment.id} className="rounded-3xl border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      {customer?.name ?? "Customer"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(payment.amount)} |{" "}
                      {capitalizeWords(payment.paymentMethod)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(payment.receivedAt)}
                    </p>
                    {order ? (
                      <p className="text-sm text-muted-foreground">
                        Order: {order.orderNumber}
                      </p>
                    ) : null}
                    {payment.transactionReference ? (
                      <p className="text-sm text-muted-foreground">
                        Ref: {payment.transactionReference}
                      </p>
                    ) : null}
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
