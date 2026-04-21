export type UserRole = "admin" | "rider";

export type RiderStatus = "active" | "inactive";

export type OrderStatus =
  | "today"
  | "assigned"
  | "delivered"
  | "pending_payment"
  | "cancelled";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "jazzcash"
  | "easypaisa"
  | "credit"
  | "unknown";

export type OrderPaymentStatus =
  | "paid"
  | "partial"
  | "due"
  | "verification_pending"
  | "unpaid";

export type PaymentRecordStatus =
  | "verified"
  | "pending_verification"
  | "rejected"
  | "received";

export type LedgerEntryType = "order" | "payment" | "adjustment";

export type DeliveryPaymentOutcome =
  | "cash_received"
  | "online_claimed"
  | "unpaid_due"
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
  dailyBottleQty: number;
  pricePerBottle: number;
  paymentMethod: PaymentMethod;
  assignedRiderId?: string;
  billingMonth: string;
  serviceStartDate: string;
  serviceEndDate: string;
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

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  riderId?: string;
  bottleQty: number;
  deliveredQty?: number;
  pricePerBottle: number;
  totalAmount: number;
  amountReceived: number;
  dueAmount: number;
  deliveryDate: string;
  notes?: string;
  orderStatus: OrderStatus;
  expectedPaymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  serviceDay?: string;
  isSubscriptionOrder?: boolean;
  transactionReference?: string;
  locationUrl?: string;
}

export interface Payment {
  id: string;
  orderId?: string;
  customerId: string;
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
  deliveredCount: number;
}

export interface ReportSummary {
  totalOrders: number;
  deliveredOrders: number;
  cashCollected: number;
  pendingVerification: number;
  totalDue: number;
  riderWiseCollection: RiderCollectionSummary[];
}
