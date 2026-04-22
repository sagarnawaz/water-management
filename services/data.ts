import "server-only";

import { cache } from "react";
import { format, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";

import { getServiceSummary } from "@/lib/customer-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncCustomerSubscriptionOrders } from "@/services/subscription-sync";
import type {
  Customer,
  LedgerEntry,
  Order,
  OrderPaymentStatus,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentRecordStatus,
  Rider,
  SessionUser,
} from "@/types/domain";

const todayDate = () => startOfDay(new Date());
const CUSTOMER_SELECT = [
  "id",
  "name",
  "phone",
  "alternate_phone",
  "address",
  "area",
  "notes",
  "daily_bottle_qty",
  "price_per_bottle",
  "default_payment_method",
  "assigned_rider_id",
  "billing_month",
  "service_start_date",
  "service_end_date",
  "is_active",
  "created_at",
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
const ORDER_SELECT = [
  "id",
  "customer_id",
  "rider_id",
  "bottle_qty",
  "delivered_qty",
  "price_per_bottle",
  "total_amount",
  "amount_received",
  "due_amount",
  "delivery_date",
  "notes",
  "order_status",
  "expected_payment_method",
  "payment_status",
  "created_by",
  "created_at",
  "updated_at",
  "service_day",
  "is_subscription_order",
  "transaction_reference",
].join(", ");
const PAYMENT_SELECT = [
  "id",
  "order_id",
  "customer_id",
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
  "payment_id",
  "entry_type",
  "debit",
  "credit",
  "balance_snapshot",
  "description",
  "created_at",
].join(", ");
const SUBSCRIPTION_SYNC_WINDOW_MS = 5 * 60 * 1000;
let lastSubscriptionSyncAt = 0;
let subscriptionSyncPromise: Promise<void> | null = null;

function buildOrderNumber(id: string) {
  return `ORD-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
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

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    alternatePhone: row.alternate_phone ? String(row.alternate_phone) : undefined,
    address: String(row.address ?? ""),
    area: String(row.area ?? ""),
    notes: row.notes ? String(row.notes) : undefined,
    dailyBottleQty: toNumber(row.daily_bottle_qty) || 1,
    pricePerBottle: toNumber(row.price_per_bottle) || 180,
    paymentMethod: String(row.default_payment_method ?? "cash") as PaymentMethod,
    assignedRiderId: row.assigned_rider_id ? String(row.assigned_rider_id) : undefined,
    billingMonth: String(row.billing_month ?? format(new Date(), "yyyy-MM-01")),
    serviceStartDate: String(row.service_start_date ?? format(new Date(), "yyyy-MM-dd")),
    serviceEndDate: String(row.service_end_date ?? format(new Date(), "yyyy-MM-dd")),
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

function mapOrder(row: Record<string, unknown>, customer?: Customer): Order {
  return {
    id: String(row.id),
    orderNumber: buildOrderNumber(String(row.id)),
    customerId: String(row.customer_id ?? ""),
    riderId: row.rider_id ? String(row.rider_id) : undefined,
    bottleQty: toNumber(row.bottle_qty),
    deliveredQty:
      row.delivered_qty === null || row.delivered_qty === undefined
        ? undefined
        : toNumber(row.delivered_qty),
    pricePerBottle: toNumber(row.price_per_bottle),
    totalAmount: toNumber(row.total_amount),
    amountReceived: toNumber(row.amount_received),
    dueAmount: toNumber(row.due_amount),
    deliveryDate: String(row.delivery_date ?? new Date().toISOString()),
    notes: row.notes ? String(row.notes) : undefined,
    orderStatus: String(row.order_status ?? "assigned") as OrderStatus,
    expectedPaymentMethod: String(row.expected_payment_method ?? "cash") as PaymentMethod,
    paymentStatus: String(row.payment_status ?? "unpaid") as OrderPaymentStatus,
    createdBy: row.created_by ? String(row.created_by) : "",
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    serviceDay: row.service_day ? String(row.service_day) : undefined,
    isSubscriptionOrder: Boolean(row.is_subscription_order),
    transactionReference: row.transaction_reference
      ? String(row.transaction_reference)
      : undefined,
    locationUrl: buildLocationUrl(customer?.address),
  };
}

function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    orderId: row.order_id ? String(row.order_id) : undefined,
    customerId: String(row.customer_id ?? ""),
    riderId: row.rider_id ? String(row.rider_id) : undefined,
    amount: toNumber(row.amount),
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
  return {
    id: String(row.id),
    customerId: String(row.customer_id ?? ""),
    orderId: row.order_id ? String(row.order_id) : undefined,
    paymentId: row.payment_id ? String(row.payment_id) : undefined,
    entryType: String(row.entry_type ?? "adjustment") as LedgerEntry["entryType"],
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    balanceSnapshot:
      row.balance_snapshot === null || row.balance_snapshot === undefined
        ? 0
        : toNumber(row.balance_snapshot),
    description: String(row.description ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function computeRunningLedger(entries: LedgerEntry[]) {
  let runningBalance = 0;

  return [...entries]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        balanceSnapshot:
          entry.balanceSnapshot && entry.balanceSnapshot !== 0
            ? entry.balanceSnapshot
            : runningBalance,
      };
    });
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

async function fetchOrdersByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .in("id", ids);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapOrder(row as Record<string, unknown>));
}

async function maybeSyncSubscriptionOrders() {
  const now = Date.now();

  if (now - lastSubscriptionSyncAt < SUBSCRIPTION_SYNC_WINDOW_MS) {
    return;
  }

  if (!subscriptionSyncPromise) {
    subscriptionSyncPromise = (async () => {
      await syncCustomerSubscriptionOrders();
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

const getAllOrders = cache(async () => {
  await maybeSyncSubscriptionOrders();

  const [customerList, supabase] = await Promise.all([
    getAllCustomers(),
    createServerSupabaseClient(),
  ]);
  const customerMap = new Map(customerList.map((customer) => [customer.id, customer]));
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("delivery_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) =>
    mapOrder(
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
  const [customers, orders, payments] = await Promise.all([
    listCustomers(query),
    getAllOrders(),
    getAllPayments(),
  ]);

  const totalsByCustomer = new Map<string, { totalOrders: number; totalPaid: number }>();

  for (const order of orders) {
    const totals = totalsByCustomer.get(order.customerId) ?? { totalOrders: 0, totalPaid: 0 };
    totals.totalOrders += order.totalAmount;
    totalsByCustomer.set(order.customerId, totals);
  }

  for (const payment of payments) {
    const totals = totalsByCustomer.get(payment.customerId) ?? { totalOrders: 0, totalPaid: 0 };
    totals.totalPaid += payment.amount;
    totalsByCustomer.set(payment.customerId, totals);
  }

  return customers.map((customer) => {
    const totals = totalsByCustomer.get(customer.id) ?? { totalOrders: 0, totalPaid: 0 };

    return {
      customer,
      totals: {
        totalOrders: totals.totalOrders,
        totalPaid: totals.totalPaid,
        currentDue: Math.max(totals.totalOrders - totals.totalPaid, 0),
      },
    };
  });
}

export async function listRiders() {
  return getAllRiders();
}

export async function listOrders(filter = "all") {
  const orders = await getAllOrders();
  return filterOrdersByStatus(orders, filter);
}

export async function getCustomer(id: string) {
  const supabase = await createServerSupabaseClient();
  const [
    customerResult,
    ordersResult,
    paymentsResult,
    ledgerResult,
  ] = await Promise.all([
    supabase.from("customers").select(CUSTOMER_SELECT).eq("id", id).maybeSingle(),
    supabase.from("orders").select(ORDER_SELECT).eq("customer_id", id).order("delivery_date", { ascending: false }),
    supabase.from("payments").select(PAYMENT_SELECT).eq("customer_id", id).order("received_at", { ascending: false }),
    supabase.from("ledger_entries").select(LEDGER_SELECT).eq("customer_id", id).order("created_at", { ascending: true }),
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

  if (ordersResult.error) {
    throw ordersResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  if (ledgerResult.error) {
    throw ledgerResult.error;
  }

  const customerOrders = (ordersResult.data ?? []).map((row) =>
    mapOrder(row as Record<string, unknown>, customer),
  );
  const customerPayments = (paymentsResult.data ?? []).map((row) =>
    mapPayment(row as Record<string, unknown>),
  );
  const customerLedger = computeRunningLedger(
    (ledgerResult.data ?? []).map((row) => mapLedger(row as Record<string, unknown>)),
  );

  const totalOrders = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalPaid = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    customer,
    orders: customerOrders,
    payments: customerPayments,
    ledger: customerLedger,
    serviceSummary: getServiceSummary({
      billingMonth: customer.billingMonth,
      serviceStartDate: customer.serviceStartDate,
      dailyBottleQty: customer.dailyBottleQty,
      pricePerBottle: customer.pricePerBottle,
    }),
    totals: {
      totalOrders,
      totalPaid,
      currentDue: Math.max(totalOrders - totalPaid, 0),
    },
  };
}

export async function getRider(id: string) {
  const supabase = await createServerSupabaseClient();
  const [riderResult, ordersResult, paymentsResult] = await Promise.all([
    supabase.from("riders").select(RIDER_SELECT).eq("id", id).maybeSingle(),
    supabase.from("orders").select(ORDER_SELECT).eq("rider_id", id).order("delivery_date", { ascending: false }),
    supabase.from("payments").select(PAYMENT_SELECT).eq("rider_id", id).order("received_at", { ascending: false }),
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

  if (ordersResult.error) {
    throw ordersResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  const riderOrders = (ordersResult.data ?? []).map((row) =>
    mapOrder(row as Record<string, unknown>),
  );
  const riderPayments = (paymentsResult.data ?? []).map((row) =>
    mapPayment(row as Record<string, unknown>),
  );
  const deliveredOrders = riderOrders.filter((order) => order.orderStatus === "delivered");

  return {
    rider,
    orders: riderOrders,
    payments: riderPayments,
    totals: {
      todayDeliveries: riderOrders.filter((order) =>
        isSameDay(parseISO(order.deliveryDate), todayDate()),
      ).length,
      deliveredOrders: deliveredOrders.length,
      totalCollectedCash: riderPayments
        .filter((payment) => payment.paymentMethod === "cash")
        .reduce((sum, payment) => sum + payment.amount, 0),
      pendingReconciliation: riderPayments
        .filter((payment) => payment.paymentStatus === "pending_verification")
        .reduce((sum, payment) => sum + payment.amount, 0),
    },
  };
}

export async function getOrder(id: string) {
  const supabase = await createServerSupabaseClient();
  const orderResult = await supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();

  if (orderResult.error) {
    throw orderResult.error;
  }

  const orderRow = orderResult.data as Record<string, unknown> | null;

  if (!orderRow) {
    return null;
  }

  const customerId = String(orderRow.customer_id ?? "");
  const riderId = orderRow.rider_id ? String(orderRow.rider_id) : null;
  const [customerResult, riderResult, paymentsResult, ledgerResult] = await Promise.all([
    customerId
      ? supabase.from("customers").select(CUSTOMER_SELECT).eq("id", customerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    riderId
      ? supabase.from("riders").select(RIDER_SELECT).eq("id", riderId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("payments").select(PAYMENT_SELECT).eq("order_id", id).order("received_at", { ascending: false }),
    supabase.from("ledger_entries").select(LEDGER_SELECT).eq("order_id", id).order("created_at", { ascending: true }),
  ]);

  if (customerResult.error) {
    throw customerResult.error;
  }

  if (riderResult.error) {
    throw riderResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  if (ledgerResult.error) {
    throw ledgerResult.error;
  }

  const customer = customerResult.data
    ? mapCustomer(customerResult.data as Record<string, unknown>)
    : undefined;
  const order = mapOrder(orderRow, customer);

  const rider = riderResult.data
    ? mapRider(riderResult.data as Record<string, unknown>)
    : undefined;

  const payments = (paymentsResult.data ?? []).map((row) =>
    mapPayment(row as Record<string, unknown>),
  );
  const ledger = computeRunningLedger(
    (ledgerResult.data ?? []).map((row) => mapLedger(row as Record<string, unknown>)),
  );

  if (!order) {
    return null;
  }

  return {
    order,
    customer,
    rider,
    payments,
    ledger,
  };
}

export async function getAdminDashboardData() {
  const [customers, riders, orders, payments] = await Promise.all([
    getAllCustomers(),
    getAllRiders(),
    getAllOrders(),
    getAllPayments(),
  ]);

  const todayOrders = filterOrdersByStatus(orders, "today");
  const deliveredToday = todayOrders.filter((order) => order.orderStatus === "delivered");
  const pendingVerification = payments.filter(
    (payment) => payment.paymentStatus === "pending_verification",
  );

  const totalDue = orders.reduce((sum, order) => sum + order.dueAmount, 0);
  const cashCollectedToday = payments
    .filter(
      (payment) =>
        payment.paymentMethod === "cash" &&
        isSameDay(parseISO(payment.receivedAt), todayDate()),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return {
    customerCount: customers.length,
    riderCount: riders.length,
    todayOrdersCount: todayOrders.length,
    deliveredOrdersCount: deliveredToday.length,
    pendingPaymentsCount: pendingVerification.length,
    totalDue,
    cashCollectedToday,
    recentOrders: [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
      .map((order) => ({
        ...order,
        customerName: customerMap.get(order.customerId)?.name ?? "Customer",
      })),
    pendingDues: customers
      .map((customer) => {
        const customerOrders = orders.filter((order) => order.customerId === customer.id);
        const customerPayments = payments.filter((payment) => payment.customerId === customer.id);

        return {
          customer,
          dueAmount: Math.max(
            customerOrders.reduce((sum, order) => sum + order.totalAmount, 0) -
              customerPayments.reduce((sum, payment) => sum + payment.amount, 0),
            0,
          ),
        };
      })
      .filter((item) => item.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .slice(0, 4),
    riderCollectionSummary: riders.map((rider) => {
      const riderPayments = payments.filter((payment) => payment.riderId === rider.id);
      const riderOrders = orders.filter((order) => order.riderId === rider.id);

      return {
        riderId: rider.id,
        riderName: rider.name,
        cashCollected: riderPayments
          .filter((payment) => payment.paymentMethod === "cash")
          .reduce((sum, payment) => sum + payment.amount, 0),
        onlineClaimed: riderPayments
          .filter((payment) => payment.paymentMethod !== "cash")
          .reduce((sum, payment) => sum + payment.amount, 0),
        pendingReconciliation: riderPayments
          .filter((payment) => payment.paymentStatus === "pending_verification")
          .reduce((sum, payment) => sum + payment.amount, 0),
        deliveredCount: riderOrders.filter((order) => order.orderStatus === "delivered").length,
      };
    }),
  };
}

export async function getPendingPayments() {
  const [payments, customers, riders, orders] = await Promise.all([
    getAllPayments(),
    getAllCustomers(),
    getAllRiders(),
    getAllOrders(),
  ]);

  return payments
    .filter((payment) => payment.paymentStatus === "pending_verification")
    .map((payment) => ({
      ...payment,
      customer: customers.find((customer) => customer.id === payment.customerId),
      rider: riders.find((rider) => rider.id === payment.riderId),
      order: orders.find((order) => order.id === payment.orderId),
    }));
}

export async function getPaymentHistory() {
  const [payments, customers, riders, orders] = await Promise.all([
    getAllPayments(),
    getAllCustomers(),
    getAllRiders(),
    getAllOrders(),
  ]);

  return payments.map((payment) => ({
    ...payment,
    customer: customers.find((customer) => customer.id === payment.customerId),
    rider: riders.find((rider) => rider.id === payment.riderId),
    order: orders.find((order) => order.id === payment.orderId),
  }));
}

export async function getReportSummary(
  range: "daily" | "weekly" | "monthly",
  filters?: {
    rider?: string;
    area?: string;
    paymentMethod?: string;
  },
) {
  const [orders, payments, riders, customers] = await Promise.all([
    getAllOrders(),
    getAllPayments(),
    getAllRiders(),
    getAllCustomers(),
  ]);

  const boundary =
    range === "daily"
      ? todayDate()
      : range === "weekly"
        ? startOfWeek(todayDate(), { weekStartsOn: 1 })
        : startOfMonth(todayDate());

  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const scopedOrders = orders.filter(
    (order) => parseISO(order.createdAt).getTime() >= boundary.getTime(),
  );
  const scopedPayments = payments.filter(
    (payment) => parseISO(payment.receivedAt).getTime() >= boundary.getTime(),
  );

  const filteredOrders = scopedOrders.filter((order) => {
    const customer = customerMap.get(order.customerId);

    if (filters?.rider && filters.rider !== "all" && order.riderId !== filters.rider) {
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
    totalOrders: filteredOrders.length,
    deliveredOrders: filteredOrders.filter((order) => order.orderStatus === "delivered").length,
    cashCollected: filteredPayments
      .filter((payment) => payment.paymentMethod === "cash")
      .reduce((sum, payment) => sum + payment.amount, 0),
    pendingVerification: filteredPayments
      .filter((payment) => payment.paymentStatus === "pending_verification")
      .reduce((sum, payment) => sum + payment.amount, 0),
    totalDue: filteredOrders.reduce((sum, order) => sum + order.dueAmount, 0),
    riderWiseCollection: riders
      .filter((rider) => !filters?.rider || filters.rider === "all" || rider.id === filters.rider)
      .map((rider) => ({
        riderId: rider.id,
        riderName: rider.name,
        cashCollected: filteredPayments
          .filter((payment) => payment.riderId === rider.id && payment.paymentMethod === "cash")
          .reduce((sum, payment) => sum + payment.amount, 0),
        onlineClaimed: filteredPayments
          .filter((payment) => payment.riderId === rider.id && payment.paymentMethod !== "cash")
          .reduce((sum, payment) => sum + payment.amount, 0),
        pendingReconciliation: filteredPayments
          .filter(
            (payment) =>
              payment.riderId === rider.id &&
              payment.paymentStatus === "pending_verification",
          )
          .reduce((sum, payment) => sum + payment.amount, 0),
        deliveredCount: filteredOrders.filter(
          (order) => order.riderId === rider.id && order.orderStatus === "delivered",
        ).length,
      })),
  };
}

export async function getRiderDashboard(user: SessionUser) {
  const effectiveRiderId = await resolveEffectiveRiderId(user);

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
  const [riderResult, ordersResult, paymentsResult] = await Promise.all([
    supabase.from("riders").select(RIDER_SELECT).eq("id", effectiveRiderId).maybeSingle(),
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("rider_id", effectiveRiderId)
      .order("delivery_date", { ascending: false }),
    supabase
      .from("payments")
      .select(PAYMENT_SELECT)
      .eq("rider_id", effectiveRiderId)
      .order("received_at", { ascending: false }),
  ]);

  if (riderResult.error) {
    throw riderResult.error;
  }

  if (ordersResult.error) {
    throw ordersResult.error;
  }

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  const rider = riderResult.data
    ? mapRider(riderResult.data as Record<string, unknown>)
    : undefined;
  const assignedOrders = (ordersResult.data ?? []).map((row) =>
    mapOrder(row as Record<string, unknown>),
  );
  const payments = (paymentsResult.data ?? []).map((row) =>
    mapPayment(row as Record<string, unknown>),
  );
  const todaysDeliveries = assignedOrders.filter((order) =>
    isSameDay(parseISO(order.deliveryDate), todayDate()),
  );
  const customers = await fetchCustomersByIds(
    Array.from(new Set(todaysDeliveries.map((order) => order.customerId))),
  );
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return {
    rider,
    todayDeliveriesCount: todaysDeliveries.length,
    pendingDeliveriesCount: todaysDeliveries.filter((order) => order.orderStatus !== "delivered")
      .length,
    cashCollectedToday: payments
      .filter(
        (payment) =>
          payment.riderId === riderId &&
          payment.paymentMethod === "cash" &&
          isSameDay(parseISO(payment.receivedAt), todayDate()),
      )
      .reduce((sum, payment) => sum + payment.amount, 0),
    deliveries: todaysDeliveries.map((order) => ({
      order,
      customer: customerMap.get(order.customerId),
    })),
  };
}

export async function getRiderDeliveries(user: SessionUser) {
  const effectiveRiderId = await resolveEffectiveRiderId(user);

  if (!effectiveRiderId) {
    return {
      items: [],
      totalCount: 0,
      pendingCount: 0,
      deliveredCount: 0,
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("rider_id", effectiveRiderId)
    .order("delivery_date", { ascending: true });

  if (error) {
    throw error;
  }

  const orders = (data ?? []).map((row) => mapOrder(row as Record<string, unknown>));
  const customers = await fetchCustomersByIds(
    Array.from(new Set(orders.map((order) => order.customerId))),
  );
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const items = orders
    .map((order) => ({
      order,
      customer: customerMap.get(order.customerId),
    }));

  return {
    items,
    totalCount: items.length,
    pendingCount: items.filter(({ order }) => order.orderStatus !== "delivered").length,
    deliveredCount: items.filter(({ order }) => order.orderStatus === "delivered").length,
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

  const riderPayments = (data ?? []).map((row) =>
    mapPayment(row as Record<string, unknown>),
  );
  const [customers, orders] = await Promise.all([
    fetchCustomersByIds(Array.from(new Set(riderPayments.map((payment) => payment.customerId)))),
    fetchOrdersByIds(
      Array.from(
        new Set(
          riderPayments
            .map((payment) => payment.orderId)
            .filter((orderId): orderId is string => Boolean(orderId)),
        ),
      ),
    ),
  ]);
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const orderMap = new Map(orders.map((order) => [order.id, order]));

  return {
    items: riderPayments.map((payment) => ({
      payment,
      customer: customerMap.get(payment.customerId),
      order: payment.orderId ? orderMap.get(payment.orderId) : undefined,
    })),
    cashCollectedToday: riderPayments
      .filter(
        (payment) =>
          payment.paymentMethod === "cash" &&
          isSameDay(parseISO(payment.receivedAt), todayDate()),
      )
      .reduce((sum, payment) => sum + payment.amount, 0),
    pendingVerificationAmount: riderPayments
      .filter((payment) => payment.paymentStatus === "pending_verification")
      .reduce((sum, payment) => sum + payment.amount, 0),
    totalRecordedAmount: riderPayments.reduce((sum, payment) => sum + payment.amount, 0),
  };
}

export async function getAreas() {
  const customers = await getAllCustomers();
  return Array.from(new Set(customers.map((customer) => customer.area)));
}
