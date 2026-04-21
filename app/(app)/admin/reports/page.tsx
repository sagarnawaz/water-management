import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { getAreas, getReportSummary, listRiders } from "@/services/data";

type ReportsPageProps = {
  searchParams: Promise<{
    range?: "daily" | "weekly" | "monthly";
    rider?: string;
    area?: string;
    paymentMethod?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const range = params.range || "daily";
  const [summary, riders, areas] = await Promise.all([
    getReportSummary(range, {
      rider: params.rider,
      area: params.area,
      paymentMethod: params.paymentMethod,
    }),
    listRiders(),
    getAreas(),
  ]);
  const selectedRider = params.rider || "all";

  const riderRows =
    selectedRider === "all"
      ? summary.riderWiseCollection
      : summary.riderWiseCollection.filter((row) => row.riderId === selectedRider);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Operational reports"
        description="Daily, weekly, and monthly collection visibility with rider-wise breakdowns."
      />

      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <Select name="range" defaultValue={range}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
            <Select name="rider" defaultValue={params.rider || "all"}>
              <option value="all">All riders</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {rider.name}
                </option>
              ))}
            </Select>
            <Select name="area" defaultValue={params.area || "all"}>
              <option value="all">All areas</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
            <Select name="paymentMethod" defaultValue={params.paymentMethod || "all"}>
              <option value="all">All payment methods</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
            </Select>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Period</p><p className="mt-2 text-2xl font-semibold">{summary.label}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total orders</p><p className="mt-2 text-3xl font-semibold">{summary.totalOrders}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Delivered</p><p className="mt-2 text-3xl font-semibold">{summary.deliveredOrders}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Cash collected</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.cashCollected)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total due</p><p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.totalDue)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rider-wise collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {riderRows.length === 0 ? (
            <EmptyState
              title="No report rows match these filters"
              description="Change the date range or filter combination to inspect another part of the collection activity."
            />
          ) : (
            riderRows.map((row) => (
              <div key={row.riderId} className="rounded-3xl border border-border/70 p-4">
                <div className="grid gap-3 text-sm sm:grid-cols-4">
                  <p className="font-medium text-foreground">{row.riderName}</p>
                  <p>Cash: {formatCurrency(row.cashCollected)}</p>
                  <p>Online: {formatCurrency(row.onlineClaimed)}</p>
                  <p>Pending: {formatCurrency(row.pendingReconciliation)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
