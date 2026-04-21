import { Badge } from "@/components/ui/badge";
import { capitalizeWords } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid" ||
    status === "verified" ||
    status === "delivered" ||
    status === "active"
      ? "success"
      : status === "partial" || status === "pending_payment"
        ? "warning"
        : status === "cancelled" || status === "rejected" || status === "inactive"
          ? "destructive"
          : status === "due" || status === "unpaid"
            ? "secondary"
            : "default";

  return <Badge variant={variant}>{capitalizeWords(status)}</Badge>;
}
