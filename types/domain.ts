export type UserRole = "admin" | "rider";

export type RiderStatus = "active" | "inactive";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "jazzcash"
  | "easypaisa"
  | "credit"
  | "unknown";

export type PaymentRecordStatus =
  | "verified"
  | "pending_verification"
  | "rejected"
  | "received";

export type LedgerEntryType = "delivery" | "payment" | "adjustment";

export type OrderStatus = "assigned" | "today" | "delivered" | "pending_payment" | "cancelled";

export type OrderPaymentStatus =
  | "unpaid"
  | "paid"
  | "partial"
  | "due"
  | "verification_pending";

export type DeliveryFrequency = "daily" | "weekdays" | "custom_days";

export type BillingCycle = "monthly";

export type SubscriptionStatus = "active" | "inactive" | "paused" | "ended";

export type DeliveryRecordStatus =
  | "scheduled"
  | "delivered"
  | "partially_delivered"
  | "not_delivered"
  | "skipped"
  | "rescheduled";

export type DeliveryPaymentOutcome =
  | "cash_received"
  | "online_claimed"
  | "credit_due"
  | "partial_payment";

export interface SessionUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  riderId?: string;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  serviceAreas: string[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  area: string;
  notes?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Rider {
  id: string;
  authUserId: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  status: RiderStatus;
  createdAt: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  riderId?: string;
  bottlesPerDelivery: number;
  deliveryFrequency: DeliveryFrequency;
  deliveryDays: number[];
  preferredTimeSlot?: string;
  monthlyAmount: number;
  paymentMethod: PaymentMethod;
  billingCycle: BillingCycle;
  startDate: string;
  endDate?: string;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRecord {
  id: string;
  customerId: string;
  subscriptionId: string;
  riderId?: string;
  scheduledDate: string;
  scheduledTimeSlot?: string;
  scheduledBottles: number;
  deliveredBottles?: number;
  status: DeliveryRecordStatus;
  expectedAmount: number;
  collectedAmount: number;
  dueAmount: number;
  deliveredAt?: string;
  transactionReference?: string;
  note?: string;
  proofUrl?: string;
  createdAt: string;
  updatedAt: string;
  locationUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  subscriptionId?: string;
  riderId?: string;
  bottleQty: number;
  deliveredQty?: number;
  totalAmount: number;
  amountReceived: number;
  dueAmount: number;
  deliveryDate: string;
  notes?: string;
  orderStatus: OrderStatus;
  expectedPaymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  createdAt: string;
  updatedAt: string;
  transactionReference?: string;
  proofUrl?: string;
  locationUrl?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  subscriptionId?: string;
  deliveryRecordId?: string;
  orderId?: string;
  riderId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentRecordStatus;
  transactionReference?: string;
  proofUrl?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  receivedAt: string;
  notes?: string;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  subscriptionId?: string;
  deliveryRecordId?: string;
  orderId?: string;
  paymentId?: string;
  entryType: LedgerEntryType;
  debit: number;
  credit: number;
  balanceSnapshot: number;
  description: string;
  createdAt: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  hint: string;
}

export interface RiderCollectionSummary {
  riderId: string;
  riderName: string;
  cashCollected: number;
  onlineClaimed: number;
  pendingReconciliation: number;
  completedDeliveries: number;
  missedDeliveries: number;
  deliveredCount?: number;
}

export interface ReportSummary {
  totalScheduledDeliveries: number;
  completedDeliveries: number;
  missedDeliveries: number;
  totalOrders?: number;
  deliveredOrders?: number;
  cashCollected: number;
  pendingVerification: number;
  totalDue: number;
  riderWiseCollection: RiderCollectionSummary[];
}
