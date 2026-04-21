import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { capitalizeWords, formatCurrency } from "@/lib/format";

type DeliverySuccessProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{
    amount?: string;
    due?: string;
    outcome?: string;
  }>;
};

export default async function DeliverySuccessPage({
  params,
  searchParams,
}: DeliverySuccessProps) {
  const { orderId } = await params;
  const query = await searchParams;
  const amount = Number(query.amount || 0);
  const due = Number(query.due || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Success"
        title="Delivery submitted"
        description="The order, payment outcome, and ledger flow have been recorded."
      />

      <Card className="border-emerald-200 bg-emerald-50/70">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="size-7" />
            <div>
              <p className="text-lg font-semibold">Recorded payment summary</p>
              <p className="text-sm">Order {orderId}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/90 p-4">
              <p className="text-sm text-muted-foreground">Outcome</p>
              <p className="mt-2 text-lg font-semibold">{capitalizeWords(query.outcome || "saved")}</p>
            </div>
            <div className="rounded-3xl bg-white/90 p-4">
              <p className="text-sm text-muted-foreground">Recorded amount</p>
              <p className="mt-2 text-lg font-semibold">{formatCurrency(amount)}</p>
            </div>
            <div className="rounded-3xl bg-white/90 p-4">
              <p className="text-sm text-muted-foreground">Remaining due</p>
              <p className="mt-2 text-lg font-semibold">{formatCurrency(due)}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/rider" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-2xl justify-center")}>
              Next delivery
            </Link>
            <Link href={`/rider/deliveries/${orderId}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-2xl justify-center")}>
              View detail
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
