import { Badge } from "@/components/ui/badge";
import { capitalizeWords } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid" ||
    status === "verified" ||
    status === "delivered" ||
    status === "active"
      ? "success"
      : status === "partial" ||
          status === "pending_payment" ||
          status === "partially_delivered" ||
          status === "scheduled" ||
          status === "today"
        ? "warning"
        : status === "cancelled" ||
            status === "rejected" ||
            status === "inactive" ||
            status === "not_delivered" ||
            status === "skipped" ||
            status === "ended"
          ? "destructive"
          : status === "due" || status === "unpaid" || status === "rescheduled" || status === "paused"
            ? "secondary"
            : "default";

  return <Badge variant={variant}>{capitalizeWords(status)}</Badge>;
}
