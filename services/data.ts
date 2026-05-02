import "server-only";

import { cache } from "react";
import { format, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";

import { roundMoney, sumMoney } from "@/lib/money";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncSubscriptionDeliveries } from "@/services/subscription-sync";
import type {
  Customer,
  DeliveryRecord,
  DeliveryRecordStatus,
  LedgerEntry,
  Order,
  OrderPaymentStatus,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentRecordStatus,
  Rider,
  RiderCollectionSummary,
  SessionUser,
  Subscription,
} from "@/types/domain";

const todayDate = () => startOfDay(new Date());
const SUBSCRIPTION_SYNC_WINDOW_MS = 5 * 60 * 1000;

function isCompletedDeliveryStatus(status: DeliveryRecordStatus) {
  return status === "delivered" || status === "partially_delivered";
}

function isVisibleRiderDelivery(delivery: DeliveryRecord, todayKey: string) {
  return (
    delivery.scheduledDate === todayKey ||
    (delivery.scheduledDate < todayKey && !isCompletedDeliveryStatus(delivery.status))
  );
}

function isConfirmedPayment(payment: Payment) {
  return payment.paymentStatus === "verified" || payment.paymentStatus === "received";
}

const CUSTOMER_SELECT = [
  "id",
  "name",
  "phone",
  "alternate_phone",
  "address",
  "area",
  "notes",
  "created_at",
  "is_active",
].join(", ");

const RIDER_SELECT = [
  "id",
  "auth_user_id",
  "name",
  "phone",
  "vehicle_number",
  "status",
  "created_at",
].join(", ");

const SUBSCRIPTION_SELECT = [
  "id",
  "customer_id",
  "rider_id",
  "bottles_per_delivery",
  "delivery_frequency",
  "delivery_days",
  "preferred_time_slot",
  "monthly_amount",
  "payment_method",
  "billing_cycle",
  "start_date",
  "end_date",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const DELIVERY_SELECT = [
  "id",
  "customer_id",
  "subscription_id",
  "rider_id",
  "scheduled_date",
  "scheduled_time_slot",
  "scheduled_bottles",
  "delivered_bottles",
  "status",
  "expected_amount",
  "collected_amount",
  "due_amount",
  "delivered_at",
  "transaction_reference",
  "note",
  "proof_url",
  "legacy_order_id",
  "created_at",
  "updated_at",
].join(", ");

const PAYMENT_SELECT = [
  "id",
  "order_id",
  "customer_id",
  "subscription_id",
  "delivery_record_id",
  "rider_id",
  "amount",
  "payment_method",
  "payment_status",
  "transaction_reference",
  "proof_url",
  "verified_by",
  "verified_at",
  "received_at",
  "notes",
].join(", ");

const LEDGER_SELECT = [
  "id",
  "customer_id",
  "order_id",
  "subscription_id",
  "delivery_record_id",
  "payment_id",
  "entry_type",
  "debit",
  "credit",
  "balance_snapshot",
  "description",
  "created_at",
].join(", ");

function isPermissionDeniedError(error: { code?: string } | null) {
  return error?.code === "42501";
}

let lastSubscriptionSyncAt = 0;
let subscriptionSyncPromise: Promise<void> | null = null;

function buildDeliveryNumber(id: string) {
  return `DLV-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

function buildLocationUrl(address?: string) {
  if (!address) {
    return undefined;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toMoney(value: unknown) {
  return roundMoney(toNumber(value));
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    alternatePhone: row.alternate_phone ? String(row.alternate_phone) : undefined,
    address: String(row.address ?? ""),
    area: String(row.area ?? ""),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
  };
}

function mapRider(row: Record<string, unknown>): Rider {
  return {
    id: String(row.id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : "",
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    vehicleNumber: String(row.vehicle_number ?? ""),
    status: String(row.status ?? "active") as Rider["status"],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id),
    customerId: String(row.customer_id ?? ""),
    riderId: row.rider_id ? String(row.rider_id) : undefined,
    bottlesPerDelivery: toNumber(row.bottles_per_delivery),
    deliveryFrequency: String(row.delivery_frequency ?? "daily") as Subscription["deliveryFrequency"],
    deliveryDays: Array.isArray(row.delivery_days)
      ? row.delivery_days.map((value) => toNumber(value))
      : [],
    preferredTimeSlot: row.preferred_time_slot ? String(row.preferred_time_slot) : undefined,
    monthlyAmount: toMoney(row.monthly_amount),
    paymentMethod: String(row.payment_method ?? "cash") as PaymentMethod,
    billingCycle: String(row.billing_cycle ?? "monthly") as Subscription["billingCycle"],
    startDate: String(row.start_date ?? format(new Date(), "yyyy-MM-dd")),
    endDate: row.end_date ? String(row.end_date) : undefined,
    status: String(row.status ?? "active") as Subscription["status"],
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapDeliveryRecord(row: Record<string, unknown>, customer?: Customer): DeliveryRecord {
  return {
    id: String(row.id),
    customerId: String(row.customer_id ?? ""),
    subscriptionId: String(row.subscription_id ?? ""),
    riderId: row.rider_id ? String(row.rider_id) : undefined,
    scheduledDate: String(row.scheduled_date ?? format(new Date(), "yyyy-MM-dd")),
    scheduledTimeSlot: row.scheduled_time_slot ? String(row.scheduled_time_slot) : undefined,
    scheduledBottles: toNumber(row.scheduled_bottles),
    deliveredBottles:
      row.delivered_bottles === null || row.delivered_bottles === undefined
        ? undefined
        : toNumber(row.delivered_bottles),
    status: String(row.status ?? "scheduled") as DeliveryRecordStatus,
    expectedAmount: toMoney(row.expected_amount),
    collectedAmount: toMoney(row.collected_amount),
    dueAmount: toMoney(row.due_amount),
    deliveredAt: row.delivered_at ? String(row.delivered_at) : undefined,
    transactionReference: row.transaction_reference
      ? String(row.transaction_reference)
      : undefined,
    note: row.note ? String(row.note) : undefined,
    proofUrl: row.proof_url ? String(row.proof_url) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    locationUrl: buildLocationUrl(customer?.address),
  };
}

function mapPayment(row: Record<string, unknown>): Payment {
  const deliveryRecordId = row.delivery_record_id ? String(row.delivery_record_id) : undefined;
  const legacyOrderId = row.order_id ? String(row.order_id) : undefined;

  return {
    id: String(row.id),
    customerId: String(row.customer_id ?? ""),
    subscriptionId: row.subscription_id ? String(row.subscription_id) : undefined,
    deliveryRecordId,
    orderId: legacyOrderId ?? deliveryRecordId,
    riderId: row.rider_id ? String(row.rider_id) : undefined,
    amount: toMoney(row.amount),
    paymentMethod: String(row.payment_method ?? "cash") as PaymentMethod,
    paymentStatus: String(row.payment_status ?? "received") as PaymentRecordStatus,
    transactionReference: row.transaction_reference
      ? String(row.transaction_reference)
      : undefined,
    proofUrl: row.proof_url ? String(row.proof_url) : undefined,
    verifiedBy: row.verified_by ? String(row.verified_by) : undefined,
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    receivedAt: String(row.received_at ?? new Date().toISOString()),
    notes: row.notes ? String(row.notes) : undefined,
  };
}

function mapLedger(row: Record<string, unknown>): LedgerEntry {
  const deliveryRecordId = row.delivery_record_id ? String(row.delivery_record_id) : undefined;
  const legacyOrderId = row.order_id ? String(row.order_id) : undefined;

  return {
    id: String(row.id),
    customerId: String(row.customer_id ?? ""),
    subscriptionId: row.subscription_id ? String(row.subscription_id) : undefined,
    deliveryRecordId,
    orderId: legacyOrderId ?? deliveryRecordId,
    paymentId: row.payment_id ? String(row.payment_id) : undefined,
    entryType: String(row.entry_type ?? "adjustment") as LedgerEntry["entryType"],
    debit: toMoney(row.debit),
    credit: toMoney(row.credit),
    balanceSnapshot:
      row.balance_snapshot === null || row.balance_snapshot === undefined
        ? 0
        : toMoney(row.balance_snapshot),
    description: String(row.description ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function computeRunningLedger(entries: LedgerEntry[]) {
  let runningBalance = 0;

  return [...entries]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry) => {
      runningBalance = roundMoney(runningBalance + entry.debit - entry.credit);
      return {
        ...entry,
        balanceSnapshot:
          entry.balanceSnapshot && entry.balanceSnapshot !== 0
            ? roundMoney(entry.balanceSnapshot)
            : runningBalance,
      };
    });
}

function getOrderStatus(record: DeliveryRecord): OrderStatus {
  if (record.status === "delivered") {
    return "delivered";
  }

  if (record.status === "partially_delivered") {
    return "pending_payment";
  }

  if (record.status === "not_delivered" || record.status === "skipped") {
    return "cancelled";
  }

  if (isSameDay(parseISO(`${record.scheduledDate}T00:00:00`), todayDate())) {
    return "today";
  }

  return "assigned";
}

function getOrderPaymentStatus(
  record: DeliveryRecord,
  subscription?: Subscription,
  payments: Payment[] = [],
): OrderPaymentStatus {
  if (payments.some((payment) => payment.paymentStatus === "pending_verification")) {
    return "verification_pending";
  }

  if (record.expectedAmount > 0 && record.dueAmount <= 0) {
    return "paid";
  }

  if (record.collectedAmount > 0 && record.dueAmount > 0) {
    return "partial";
  }

  if (record.dueAmount > 0 && subscription?.paymentMethod === "credit") {
    return "due";
  }

  return "unpaid";
}

function toOrderView(
  record: DeliveryRecord,
  subscription?: Subscription,
  customer?: Customer,
  payments: Payment[] = [],
): Order {
  return {
    id: record.id,
    orderNumber: buildDeliveryNumber(record.id),
    customerId: record.customerId,
    subscriptionId: record.subscriptionId,
    riderId: record.riderId,
    bottleQty: record.scheduledBottles,
    deliveredQty: record.deliveredBottles,
    totalAmount: record.expectedAmount,
    amountReceived: record.collectedAmount,
    dueAmount: record.dueAmount,
    deliveryDate: record.deliveredAt ?? `${record.scheduledDate}T09:00:00.000Z`,
    notes: record.note,
    orderStatus: getOrderStatus(record),
    expectedPaymentMethod: subscription?.paymentMethod ?? "cash",
    paymentStatus: getOrderPaymentStatus(record, subscription, payments),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    transactionReference: record.transactionReference,
    proofUrl: record.proofUrl,
    locationUrl: buildLocationUrl(customer?.address),
  };
}

function filterOrdersByStatus(orders: Order[], filter = "all") {
  if (filter === "all") {
    return orders;
  }

  if (filter === "today") {
    return orders.filter((order) => isSameDay(parseISO(order.deliveryDate), todayDate()));
  }

  if (filter === "pending_payment") {
    return orders.filter(
      (order) =>
        order.orderStatus === "pending_payment" ||
        order.paymentStatus === "partial" ||
        order.paymentStatus === "due" ||
        order.paymentStatus === "verification_pending",
    );
  }

  return orders.filter((order) => order.orderStatus === filter);
}

async function maybeSyncDeliveryRecords() {
  const now = Date.now();

  if (now - lastSubscriptionSyncAt < SUBSCRIPTION_SYNC_WINDOW_MS) {
    return;
  }

  if (!subscriptionSyncPromise) {
    subscriptionSyncPromise = (async () => {
      await syncSubscriptionDeliveries();
      lastSubscriptionSyncAt = Date.now();
    })().finally(() => {
      subscriptionSyncPromise = null;
    });
  }

  await subscriptionSyncPromise;
}

const getAllCustomers = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapCustomer(row as Record<string, unknown>));
});

const getAllRiders = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("riders")
    .select(RIDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRider(row as Record<string, unknown>));
});

const getAllSubscriptions = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapSubscription(row as Record<string, unknown>));
});

const getAllDeliveryRecords = cache(async () => {
  await maybeSyncDeliveryRecords();

  const [customers, supabase] = await Promise.all([
    getAllCustomers(),
    createServerSupabaseClient(),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const { data, error } = await supabase
    .from("delivery_records")
    .select(DELIVERY_SELECT)
    .order("scheduled_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapDeliveryRecord(
      row as Record<string, unknown>,
      customerMap.get(String((row as Record<string, unknown>).customer_id)),
    ),
  );
});

const getAllPayments = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .order("received_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
});

async function fetchCustomersByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapCustomer(row as Record<string, unknown>));
}

async function fetchDeliveryRecordsByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("delivery_records")
    .select(DELIVERY_SELECT)
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapDeliveryRecord(row as Record<string, unknown>));
}

async function resolveEffectiveRiderId(user: SessionUser) {
  if (user.riderId) {
    return user.riderId;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("riders")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ? String(data.id) : null;
}

export async function listCustomers(query?: string) {
  const customers = await getAllCustomers();

  if (!query) {
    return customers;
  }

  const normalized = query.toLowerCase();
  return customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(normalized) ||
      customer.phone.includes(query) ||
      customer.area.toLowerCase().includes(normalized),
  );
}

export async function listCustomerSummaries(query?: string) {
  const [customers, subscriptions, deliveries, payments] = await Promise.all([
    listCustomers(query),
    getAllSubscriptions(),
    getAllDeliveryRecords(),
    getAllPayments(),
  ]);

  const totalsByCustomer = new Map<
    string,
    { totalDeliveries: number; totalPaid: number; activeSubscriptions: number }
  >();

  for (const delivery of deliveries) {
    const totals = totalsByCustomer.get(delivery.customerId) ?? {
      totalDeliveries: 0,
      totalPaid: 0,
      activeSubscriptions: 0,
    };
    totals.totalDeliveries = roundMoney(totals.totalDeliveries + delivery.expectedAmount);
    totalsByCustomer.set(delivery.customerId, totals);
  }

  for (const payment of payments) {
    const totals = totalsByCustomer.get(payment.customerId) ?? {
      totalDeliveries: 0,
      totalPaid: 0,
      activeSubscriptions: 0,
    };
    if (isConfirmedPayment(payment)) {
      totals.totalPaid = roundMoney(totals.totalPaid + payment.amount);
    }
    totalsByCustomer.set(payment.customerId, totals);
  }

  for (const subscription of subscriptions) {
    if (subscription.status !== "active") {
      continue;
    }

    const totals = totalsByCustomer.get(subscription.customerId) ?? {
      totalDeliveries: 0,
      totalPaid: 0,
      activeSubscriptions: 0,
    };
    totals.activeSubscriptions += 1;
    totalsByCustomer.set(subscription.customerId, totals);
  }

  return customers.map((customer) => {
    const totals = totalsByCustomer.get(customer.id) ?? {
      totalDeliveries: 0,
      totalPaid: 0,
      activeSubscriptions: 0,
    };

    return {
      customer,
      totals: {
        totalOrders: roundMoney(totals.totalDeliveries),
        totalPaid: roundMoney(totals.totalPaid),
        currentDue: roundMoney(Math.max(totals.totalDeliveries - totals.totalPaid, 0)),
        activeSubscriptions: totals.activeSubscriptions,
      },
    };
  });
}

export async function listRiders() {
  return getAllRiders();
}

export async function listSubscriptions() {
  return getAllSubscriptions();
}

export async function listDeliveryRecords() {
  return getAllDeliveryRecords();
}

export async function listOrders(filter = "all") {
  const [deliveries, subscriptions, customers, payments] = await Promise.all([
    getAllDeliveryRecords(),
    getAllSubscriptions(),
    getAllCustomers(),
    getAllPayments(),
  ]);
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const paymentsByDelivery = new Map<string, Payment[]>();

  for (const payment of payments) {
    if (!payment.deliveryRecordId) {
      continue;
    }

    const list = paymentsByDelivery.get(payment.deliveryRecordId) ?? [];
    list.push(payment);
    paymentsByDelivery.set(payment.deliveryRecordId, list);
  }

  const orders = deliveries.map((delivery) =>
    toOrderView(
      delivery,
      subscriptionMap.get(delivery.subscriptionId),
      customerMap.get(delivery.customerId),
      paymentsByDelivery.get(delivery.id),
    ),
  );

  return filterOrdersByStatus(orders, filter);
}

export async function getCustomer(id: string) {
  const supabase = await createServerSupabaseClient();
  await maybeSyncDeliveryRecords();

  const [customerResult, subscriptionsResult, deliveriesResult, paymentsResult, ledgerResult] =
    await Promise.all([
      supabase.from("customers").select(CUSTOMER_SELECT).eq("id", id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select(SUBSCRIPTION_SELECT)
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("delivery_records")
        .select(DELIVERY_SELECT)
        .eq("customer_id", id)
        .order("scheduled_date", { ascending: false }),
      supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("customer_id", id)
        .order("received_at", { ascending: false }),
      supabase
        .from("ledger_entries")
        .select(LEDGER_SELECT)
        .eq("customer_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (customerResult.error) {
    throw customerResult.error;
  }

  const customer = customerResult.data
    ? mapCustomer(customerResult.data as Record<string, unknown>)
    : null;

  if (!customer) {
    return null;
  }

  if (subscriptionsResult.error) {
    throw subscriptionsResult.error;
  }

  if (deliveriesResult.error) {
    throw deliveriesResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  if (ledgerResult.error) {
    throw ledgerResult.error;
  }

  const subscriptions = (subscriptionsResult.data ?? []).map((row) =>
    mapSubscription(row as Record<string, unknown>),
  );
  const payments = (paymentsResult.data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  const paymentsByDelivery = new Map<string, Payment[]>();

  for (const payment of payments) {
    if (!payment.deliveryRecordId) {
      continue;
    }

    const list = paymentsByDelivery.get(payment.deliveryRecordId) ?? [];
    list.push(payment);
    paymentsByDelivery.set(payment.deliveryRecordId, list);
  }

  const deliveryRecords = (deliveriesResult.data ?? []).map((row) =>
    mapDeliveryRecord(row as Record<string, unknown>, customer),
  );
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const orders = deliveryRecords.map((delivery) =>
    toOrderView(
      delivery,
      subscriptionMap.get(delivery.subscriptionId),
      customer,
      paymentsByDelivery.get(delivery.id),
    ),
  );
  const ledger = computeRunningLedger(
    (ledgerResult.data ?? []).map((row) => mapLedger(row as Record<string, unknown>)),
  );
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active");
  const totalScheduledValue = sumMoney(deliveryRecords.map((delivery) => delivery.expectedAmount));
  const totalPaid = sumMoney(payments.filter(isConfirmedPayment).map((payment) => payment.amount));

  return {
    customer,
    subscriptions,
    activeSubscriptions,
    deliveryRecords,
    orders,
    payments,
    ledger,
    totals: {
      totalOrders: totalScheduledValue,
      totalPaid,
      currentDue: roundMoney(Math.max(totalScheduledValue - totalPaid, 0)),
    },
  };
}

export async function getSubscription(id: string) {
  const supabase = await createServerSupabaseClient();
  const [subscriptionResult, deliveriesResult] = await Promise.all([
    supabase.from("subscriptions").select(SUBSCRIPTION_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("delivery_records")
      .select(DELIVERY_SELECT)
      .eq("subscription_id", id)
      .order("scheduled_date", { ascending: false }),
  ]);

  if (subscriptionResult.error) {
    throw subscriptionResult.error;
  }

  if (deliveriesResult.error) {
    throw deliveriesResult.error;
  }

  const subscription = subscriptionResult.data
    ? mapSubscription(subscriptionResult.data as Record<string, unknown>)
    : null;

  if (!subscription) {
    return null;
  }

  const [customerResult, riderResult] = await Promise.all([
    supabase
      .from("customers")
      .select(CUSTOMER_SELECT)
      .eq("id", subscription.customerId)
      .maybeSingle(),
    subscription.riderId
      ? supabase.from("riders").select(RIDER_SELECT).eq("id", subscription.riderId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (customerResult.error) {
    throw customerResult.error;
  }

  if (riderResult.error) {
    throw riderResult.error;
  }

  return {
    subscription,
    customer: customerResult.data
      ? mapCustomer(customerResult.data as Record<string, unknown>)
      : undefined,
    rider: riderResult.data ? mapRider(riderResult.data as Record<string, unknown>) : undefined,
    deliveryRecords: (deliveriesResult.data ?? []).map((row) =>
      mapDeliveryRecord(row as Record<string, unknown>),
    ),
  };
}

export async function getRider(id: string) {
  const supabase = await createServerSupabaseClient();
  const [riderResult, subscriptionResult, deliveriesResult, paymentsResult] = await Promise.all([
    supabase.from("riders").select(RIDER_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select(SUBSCRIPTION_SELECT)
      .eq("rider_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("delivery_records")
      .select(DELIVERY_SELECT)
      .eq("rider_id", id)
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("rider_id", id)
      .order("received_at", { ascending: false }),
  ]);

  if (riderResult.error) {
    throw riderResult.error;
  }

  const rider = riderResult.data
    ? mapRider(riderResult.data as Record<string, unknown>)
    : null;

  if (!rider) {
    return null;
  }

  if (subscriptionResult.error) {
    throw subscriptionResult.error;
  }

  if (deliveriesResult.error) {
    throw deliveriesResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  const subscriptions = (subscriptionResult.data ?? []).map((row) =>
    mapSubscription(row as Record<string, unknown>),
  );
  const deliveryRecords = (deliveriesResult.data ?? []).map((row) =>
    mapDeliveryRecord(row as Record<string, unknown>),
  );
  const payments = (paymentsResult.data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const customers = await fetchCustomersByIds(
    Array.from(new Set(deliveryRecords.map((delivery) => delivery.customerId))),
  );
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const paymentsByDelivery = new Map<string, Payment[]>();

  for (const payment of payments) {
    if (!payment.deliveryRecordId) {
      continue;
    }

    const list = paymentsByDelivery.get(payment.deliveryRecordId) ?? [];
    list.push(payment);
    paymentsByDelivery.set(payment.deliveryRecordId, list);
  }

  const orders = deliveryRecords.map((delivery) =>
    toOrderView(
      delivery,
      subscriptionMap.get(delivery.subscriptionId),
      customerMap.get(delivery.customerId),
      paymentsByDelivery.get(delivery.id),
    ),
  );
  const deliveredOrders = orders.filter((order) => order.orderStatus === "delivered");

  return {
    rider,
    subscriptions,
    deliveryRecords,
    orders,
    payments,
    totals: {
      todayDeliveries: orders.filter((order) => isSameDay(parseISO(order.deliveryDate), todayDate()))
        .length,
      deliveredOrders: deliveredOrders.length,
      totalCollectedCash: payments
        .filter((payment) => payment.paymentMethod === "cash" && isConfirmedPayment(payment))
        .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
      pendingReconciliation: payments
        .filter((payment) => payment.paymentStatus === "pending_verification")
        .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
    },
  };
}

export async function getOrder(id: string) {
  const supabase = await createServerSupabaseClient();
  await maybeSyncDeliveryRecords();

  const deliveryResult = await supabase
    .from("delivery_records")
    .select(DELIVERY_SELECT)
    .or(`id.eq.${id},legacy_order_id.eq.${id}`)
    .maybeSingle();

  if (deliveryResult.error) {
    throw deliveryResult.error;
  }

  const deliveryRow = deliveryResult.data as Record<string, unknown> | null;

  if (!deliveryRow) {
    return null;
  }

  const deliveryRecord = mapDeliveryRecord(deliveryRow);
  const [customerResult, riderResult, subscriptionResult, paymentsResult, ledgerResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select(CUSTOMER_SELECT)
        .eq("id", deliveryRecord.customerId)
        .maybeSingle(),
      deliveryRecord.riderId
        ? supabase.from("riders").select(RIDER_SELECT).eq("id", deliveryRecord.riderId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("subscriptions")
        .select(SUBSCRIPTION_SELECT)
        .eq("id", deliveryRecord.subscriptionId)
        .maybeSingle(),
      supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("delivery_record_id", deliveryRecord.id)
        .order("received_at", { ascending: false }),
      supabase
        .from("ledger_entries")
        .select(LEDGER_SELECT)
        .eq("delivery_record_id", deliveryRecord.id)
        .order("created_at", { ascending: true }),
    ]);

  if (customerResult.error) {
    throw customerResult.error;
  }

  if (riderResult.error) {
    throw riderResult.error;
  }

  if (subscriptionResult.error) {
    throw subscriptionResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  if (ledgerResult.error && !isPermissionDeniedError(ledgerResult.error)) {
    throw ledgerResult.error;
  }

  const customer = customerResult.data
    ? mapCustomer(customerResult.data as Record<string, unknown>)
    : undefined;
  const subscription = subscriptionResult.data
    ? mapSubscription(subscriptionResult.data as Record<string, unknown>)
    : undefined;
  const rider = riderResult.data ? mapRider(riderResult.data as Record<string, unknown>) : undefined;
  const payments = (paymentsResult.data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  const ledger = computeRunningLedger(
    (ledgerResult.data ?? []).map((row) => mapLedger(row as Record<string, unknown>)),
  );

  return {
    deliveryRecord: customer ? { ...deliveryRecord, locationUrl: buildLocationUrl(customer.address) } : deliveryRecord,
    order: toOrderView(deliveryRecord, subscription, customer, payments),
    subscription,
    customer,
    rider,
    payments,
    ledger,
  };
}

export async function getAdminDashboardData() {
  const [customers, riders, subscriptions, deliveries, payments] = await Promise.all([
    getAllCustomers(),
    getAllRiders(),
    getAllSubscriptions(),
    getAllDeliveryRecords(),
    getAllPayments(),
  ]);

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const subscriptionMap = new Map(
    subscriptions.map((subscription) => [subscription.id, subscription]),
  );
  const paymentsByDelivery = new Map<string, Payment[]>();

  for (const payment of payments) {
    if (!payment.deliveryRecordId) {
      continue;
    }

    const list = paymentsByDelivery.get(payment.deliveryRecordId) ?? [];
    list.push(payment);
    paymentsByDelivery.set(payment.deliveryRecordId, list);
  }

  const orders = deliveries.map((delivery) =>
    toOrderView(
      delivery,
      subscriptionMap.get(delivery.subscriptionId),
      customerMap.get(delivery.customerId),
      paymentsByDelivery.get(delivery.id),
    ),
  );
  const todayOrders = orders.filter((order) => isSameDay(parseISO(order.deliveryDate), todayDate()));
  const deliveredToday = todayOrders.filter(
    (order) => order.orderStatus === "delivered" || order.orderStatus === "pending_payment",
  );
  const pendingVerification = payments.filter(
    (payment) => payment.paymentStatus === "pending_verification",
  );
  const customerSummaries = await listCustomerSummaries();

  return {
    customerCount: customers.filter((customer) => customer.isActive).length,
    riderCount: riders.filter((rider) => rider.status === "active").length,
    activeSubscriptionCount: subscriptions.filter((subscription) => subscription.status === "active")
      .length,
    todayOrdersCount: todayOrders.length,
    deliveredOrdersCount: deliveredToday.length,
    pendingPaymentsCount: pendingVerification.length,
    totalDue: sumMoney(deliveries.map((delivery) => delivery.dueAmount)),
    cashCollectedToday: payments
      .filter(
        (payment) =>
          payment.paymentMethod === "cash" &&
          isConfirmedPayment(payment) &&
          isSameDay(parseISO(payment.receivedAt), todayDate()),
      )
      .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
    recentOrders: [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
      .map((order) => ({
        ...order,
        customerName: customerMap.get(order.customerId)?.name ?? "Customer",
      })),
    pendingDues: customerSummaries
      .map((summary) => ({
        customer: summary.customer,
        dueAmount: summary.totals.currentDue,
      }))
      .filter((item) => item.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .slice(0, 4),
    riderCollectionSummary: riders.map<RiderCollectionSummary>((rider) => {
      const riderPayments = payments.filter((payment) => payment.riderId === rider.id);
      const riderOrders = orders.filter((order) => order.riderId === rider.id);
      const completedDeliveries = riderOrders.filter(
        (order) => order.orderStatus === "delivered" || order.orderStatus === "pending_payment",
      ).length;
      const missedDeliveries = riderOrders.filter((order) => order.orderStatus === "cancelled").length;

      return {
        riderId: rider.id,
        riderName: rider.name,
        cashCollected: riderPayments
          .filter((payment) => payment.paymentMethod === "cash" && isConfirmedPayment(payment))
          .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
        onlineClaimed: riderPayments
          .filter((payment) => payment.paymentMethod !== "cash")
          .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
        pendingReconciliation: riderPayments
          .filter((payment) => payment.paymentStatus === "pending_verification")
          .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
        completedDeliveries,
        missedDeliveries,
        deliveredCount: completedDeliveries,
      };
    }),
  };
}

export async function getPendingPayments() {
  const [payments, customers, riders, deliveryRecords, subscriptions] = await Promise.all([
    getAllPayments(),
    getAllCustomers(),
    getAllRiders(),
    getAllDeliveryRecords(),
    getAllSubscriptions(),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const riderMap = new Map(riders.map((rider) => [rider.id, rider]));
  const deliveryMap = new Map(deliveryRecords.map((delivery) => [delivery.id, delivery]));
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));

  return payments
    .filter((payment) => payment.paymentStatus === "pending_verification")
    .map((payment) => {
      const delivery = payment.deliveryRecordId
        ? deliveryMap.get(payment.deliveryRecordId)
        : undefined;
      const customer = customerMap.get(payment.customerId);

      return {
        ...payment,
        customer,
        rider: payment.riderId ? riderMap.get(payment.riderId) : undefined,
        order:
          delivery && customer
            ? toOrderView(
                delivery,
                delivery.subscriptionId
                  ? subscriptionMap.get(delivery.subscriptionId)
                  : undefined,
                customer,
                [payment],
              )
            : undefined,
      };
    });
}

export async function getPaymentHistory() {
  const [payments, customers, riders, deliveryRecords, subscriptions] = await Promise.all([
    getAllPayments(),
    getAllCustomers(),
    getAllRiders(),
    getAllDeliveryRecords(),
    getAllSubscriptions(),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const riderMap = new Map(riders.map((rider) => [rider.id, rider]));
  const deliveryMap = new Map(deliveryRecords.map((delivery) => [delivery.id, delivery]));
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));

  return payments.map((payment) => {
    const delivery = payment.deliveryRecordId ? deliveryMap.get(payment.deliveryRecordId) : undefined;
    const customer = customerMap.get(payment.customerId);

    return {
      ...payment,
      customer,
      rider: payment.riderId ? riderMap.get(payment.riderId) : undefined,
      order:
        delivery && customer
          ? toOrderView(
              delivery,
              delivery.subscriptionId ? subscriptionMap.get(delivery.subscriptionId) : undefined,
              customer,
              [payment],
            )
          : undefined,
    };
  });
}

export async function getReportSummary(
  range: "daily" | "weekly" | "monthly",
  filters?: {
    rider?: string;
    area?: string;
    paymentMethod?: string;
  },
) {
  const [deliveries, payments, riders, customers, subscriptions] = await Promise.all([
    getAllDeliveryRecords(),
    getAllPayments(),
    getAllRiders(),
    getAllCustomers(),
    getAllSubscriptions(),
  ]);

  const boundary =
    range === "daily"
      ? todayDate()
      : range === "weekly"
        ? startOfWeek(todayDate(), { weekStartsOn: 1 })
        : startOfMonth(todayDate());

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const scopedDeliveries = deliveries.filter(
    (delivery) => parseISO(`${delivery.scheduledDate}T00:00:00`).getTime() >= boundary.getTime(),
  );
  const scopedPayments = payments.filter(
    (payment) => parseISO(payment.receivedAt).getTime() >= boundary.getTime(),
  );

  const filteredDeliveries = scopedDeliveries.filter((delivery) => {
    const customer = customerMap.get(delivery.customerId);

    if (filters?.rider && filters.rider !== "all" && delivery.riderId !== filters.rider) {
      return false;
    }

    if (filters?.area && filters.area !== "all" && customer?.area !== filters.area) {
      return false;
    }

    return true;
  });

  const filteredPayments = scopedPayments.filter((payment) => {
    const customer = customerMap.get(payment.customerId);

    if (filters?.rider && filters.rider !== "all" && payment.riderId !== filters.rider) {
      return false;
    }

    if (
      filters?.paymentMethod &&
      filters.paymentMethod !== "all" &&
      payment.paymentMethod !== filters.paymentMethod
    ) {
      return false;
    }

    if (filters?.area && filters.area !== "all" && customer?.area !== filters.area) {
      return false;
    }

    return true;
  });

  return {
    range,
    label:
      range === "daily"
        ? format(boundary, "dd MMM yyyy")
        : range === "weekly"
          ? `Week of ${format(boundary, "dd MMM yyyy")}`
          : format(boundary, "MMMM yyyy"),
    totalScheduledDeliveries: filteredDeliveries.length,
    completedDeliveries: filteredDeliveries.filter((delivery) =>
      delivery.status === "delivered" || delivery.status === "partially_delivered",
    ).length,
    missedDeliveries: filteredDeliveries.filter((delivery) =>
      delivery.status === "not_delivered" || delivery.status === "skipped",
    ).length,
    totalOrders: filteredDeliveries.length,
    deliveredOrders: filteredDeliveries.filter((delivery) =>
      delivery.status === "delivered" || delivery.status === "partially_delivered",
    ).length,
    cashCollected: filteredPayments
      .filter((payment) => payment.paymentMethod === "cash" && isConfirmedPayment(payment))
      .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
    pendingVerification: filteredPayments
      .filter((payment) => payment.paymentStatus === "pending_verification")
      .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
    totalDue: sumMoney(filteredDeliveries.map((delivery) => delivery.dueAmount)),
    riderWiseCollection: riders
      .filter((rider) => !filters?.rider || filters.rider === "all" || rider.id === filters.rider)
      .map<RiderCollectionSummary>((rider) => {
        const riderPayments = filteredPayments.filter((payment) => payment.riderId === rider.id);
        const riderDeliveries = filteredDeliveries.filter((delivery) => delivery.riderId === rider.id);
        const completedDeliveries = riderDeliveries.filter(
          (delivery) => delivery.status === "delivered" || delivery.status === "partially_delivered",
        ).length;

        return {
          riderId: rider.id,
          riderName: rider.name,
          cashCollected: riderPayments
            .filter((payment) => payment.paymentMethod === "cash" && isConfirmedPayment(payment))
            .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
          onlineClaimed: riderPayments
            .filter((payment) => payment.paymentMethod !== "cash")
            .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
          pendingReconciliation: riderPayments
            .filter((payment) => payment.paymentStatus === "pending_verification")
            .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
          completedDeliveries,
          missedDeliveries: riderDeliveries.filter(
            (delivery) => delivery.status === "not_delivered" || delivery.status === "skipped",
          ).length,
          deliveredCount: completedDeliveries,
        };
      }),
    activeSubscriptions: subscriptions.filter((subscription) => subscription.status === "active").length,
  };
}

export async function getRiderDashboard(user: SessionUser) {
  const effectiveRiderId = await resolveEffectiveRiderId(user);
  const todayKey = format(new Date(), "yyyy-MM-dd");

  if (!effectiveRiderId) {
    return {
      rider: undefined,
      todayDeliveriesCount: 0,
      pendingDeliveriesCount: 0,
      cashCollectedToday: 0,
      deliveries: [],
    };
  }

  const supabase = await createServerSupabaseClient();
  await maybeSyncDeliveryRecords();

  const [riderResult, deliveriesResult, paymentsResult, subscriptions] = await Promise.all([
    supabase.from("riders").select(RIDER_SELECT).eq("id", effectiveRiderId).maybeSingle(),
    supabase
      .from("delivery_records")
      .select(DELIVERY_SELECT)
      .eq("rider_id", effectiveRiderId)
      .lte("scheduled_date", todayKey)
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("rider_id", effectiveRiderId)
      .order("received_at", { ascending: false }),
    getAllSubscriptions(),
  ]);

  if (riderResult.error) {
    throw riderResult.error;
  }

  if (deliveriesResult.error) {
    throw deliveriesResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  const rider = riderResult.data ? mapRider(riderResult.data as Record<string, unknown>) : undefined;
  const deliveryRecords = (deliveriesResult.data ?? [])
    .map((row) => mapDeliveryRecord(row as Record<string, unknown>))
    .filter((delivery) => isVisibleRiderDelivery(delivery, todayKey));
  const payments = (paymentsResult.data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  const paymentsByDelivery = new Map<string, Payment[]>();

  for (const payment of payments) {
    if (!payment.deliveryRecordId) {
      continue;
    }

    const list = paymentsByDelivery.get(payment.deliveryRecordId) ?? [];
    list.push(payment);
    paymentsByDelivery.set(payment.deliveryRecordId, list);
  }

  const customers = await fetchCustomersByIds(
    Array.from(new Set(deliveryRecords.map((delivery) => delivery.customerId))),
  );
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const deliveries = deliveryRecords.map((delivery) => ({
    deliveryRecord: delivery,
    order: toOrderView(
      delivery,
      subscriptionMap.get(delivery.subscriptionId),
      customerMap.get(delivery.customerId),
      paymentsByDelivery.get(delivery.id),
    ),
    customer: customerMap.get(delivery.customerId),
  }));

  return {
    rider,
    todayDeliveriesCount: deliveries.length,
    pendingDeliveriesCount: deliveries.filter(
      ({ deliveryRecord }) => !isCompletedDeliveryStatus(deliveryRecord.status),
    ).length,
    cashCollectedToday: payments
      .filter(
        (payment) =>
          payment.paymentMethod === "cash" &&
          isConfirmedPayment(payment) &&
          isSameDay(parseISO(payment.receivedAt), todayDate()),
      )
      .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
    deliveries,
  };
}

export async function getRiderDeliveries(user: SessionUser) {
  const effectiveRiderId = await resolveEffectiveRiderId(user);
  const todayKey = format(new Date(), "yyyy-MM-dd");

  if (!effectiveRiderId) {
    return {
      items: [],
      totalCount: 0,
      pendingCount: 0,
      deliveredCount: 0,
    };
  }

  const supabase = await createServerSupabaseClient();
  await maybeSyncDeliveryRecords();
  const [deliveriesResult, subscriptions, payments] = await Promise.all([
    supabase
      .from("delivery_records")
      .select(DELIVERY_SELECT)
      .eq("rider_id", effectiveRiderId)
      .lte("scheduled_date", todayKey)
      .order("scheduled_date", { ascending: false }),
    getAllSubscriptions(),
    getAllPayments(),
  ]);

  if (deliveriesResult.error) {
    throw deliveriesResult.error;
  }

  const deliveryRecords = (deliveriesResult.data ?? [])
    .map((row) => mapDeliveryRecord(row as Record<string, unknown>))
    .filter((delivery) => isVisibleRiderDelivery(delivery, todayKey));
  const customers = await fetchCustomersByIds(
    Array.from(new Set(deliveryRecords.map((delivery) => delivery.customerId))),
  );
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const paymentsByDelivery = new Map<string, Payment[]>();

  for (const payment of payments) {
    if (!payment.deliveryRecordId) {
      continue;
    }

    const list = paymentsByDelivery.get(payment.deliveryRecordId) ?? [];
    list.push(payment);
    paymentsByDelivery.set(payment.deliveryRecordId, list);
  }

  const items = deliveryRecords.map((delivery) => ({
    deliveryRecord: delivery,
    order: toOrderView(
      delivery,
      subscriptionMap.get(delivery.subscriptionId),
      customerMap.get(delivery.customerId),
      paymentsByDelivery.get(delivery.id),
    ),
    customer: customerMap.get(delivery.customerId),
  }));

  return {
    items,
    totalCount: items.length,
    pendingCount: items.filter(
      ({ deliveryRecord }) => !isCompletedDeliveryStatus(deliveryRecord.status),
    ).length,
    deliveredCount: items.filter(
      ({ deliveryRecord }) => isCompletedDeliveryStatus(deliveryRecord.status),
    ).length,
  };
}

export async function getRiderCollections(user: SessionUser) {
  const effectiveRiderId = await resolveEffectiveRiderId(user);

  if (!effectiveRiderId) {
    return {
      items: [],
      cashCollectedToday: 0,
      pendingVerificationAmount: 0,
      totalRecordedAmount: 0,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("rider_id", effectiveRiderId)
    .order("received_at", { ascending: false });

  if (error) {
    throw error;
  }

  const riderPayments = (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  const [customers, deliveries, subscriptions] = await Promise.all([
    fetchCustomersByIds(Array.from(new Set(riderPayments.map((payment) => payment.customerId)))),
    fetchDeliveryRecordsByIds(
      Array.from(
        new Set(
          riderPayments
            .map((payment) => payment.deliveryRecordId)
            .filter((deliveryRecordId): deliveryRecordId is string => Boolean(deliveryRecordId)),
        ),
      ),
    ),
    getAllSubscriptions(),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const deliveryMap = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
  const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));

  return {
    items: riderPayments.map((payment) => {
      const customer = customerMap.get(payment.customerId);
      const delivery = payment.deliveryRecordId ? deliveryMap.get(payment.deliveryRecordId) : undefined;

      return {
        payment,
        customer,
        order:
          delivery && customer
            ? toOrderView(
                delivery,
                subscriptionMap.get(delivery.subscriptionId),
                customer,
                [payment],
              )
            : undefined,
      };
    }),
    cashCollectedToday: riderPayments
      .filter(
        (payment) =>
          payment.paymentMethod === "cash" &&
          isConfirmedPayment(payment) &&
          isSameDay(parseISO(payment.receivedAt), todayDate()),
      )
      .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
    pendingVerificationAmount: riderPayments
      .filter((payment) => payment.paymentStatus === "pending_verification")
      .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
    totalRecordedAmount: riderPayments
      .filter((payment) => payment.paymentStatus !== "rejected")
      .reduce((sum, payment) => roundMoney(sum + payment.amount), 0),
  };
}

export async function getAreas() {
  const customers = await getAllCustomers();
  return Array.from(new Set(customers.map((customer) => customer.area)));
}
