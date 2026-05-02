import type { DeliveryRecordStatus } from "@/types/domain";

export function isDeliveryCompleted(status: DeliveryRecordStatus) {
  return status === "delivered" || status === "partially_delivered";
}
