import "server-only";

import { cache } from "react";
import { format, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek } from "date-fns";

import { getServiceSummary } from "@/lib/customer-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
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
import {
  businessProfile as mockBusinessProfile,
  customers as mockCustomers,
  getAdminDashboardData as getMockAdminDashboardData,
  getAreas as getMockAreas,
  getCustomer as getMockCustomer,
  getOrder as getMockOrder,
  getPaymentHistory as getMockPaymentHistory,
  getPendingPayments as getMockPendingPayments,
  getReportSummary as getMockReportSummary,
  getRider as getMockRider,
  getRiderDashboard as getMockRiderDashboard,
  ledgerEntries as mockLedgerEntries,
  listCustomers as listMockCustomers,
  listOrders as listMockOrders,
  listRiders as listMockRiders,
  orders as mockOrders,
  payments as mockPayments,
  riders as mockRiders,
} from "@/services/mock-data";

const todayDate = () => startOfDay(new Date());

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
    paymentMethod: String(
      row.default_payment_method ?? "cash",
    ) as PaymentMethod,
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

function mapOrder(
  row: Record<string, unknown>,
  customer?: Customer,
): Order {
  return {
    id: String(row.id),
    orderNumber: buildOrderNumber(String(row.id)),
    customerId: String(row.customer_id ?? ""),
    riderId: row.rider_id ? String(row.rider_id) : undefined,
    bottleQty: toNumber(row.bottle_qty),
    deliveredQty: row.delivered_qty === null || row.delivered_qty === undefined
      ? undefined
      : toNumber(row.delivered_qty),
    pricePerBottle: toNumber(row.price_per_bottle),
    totalAmount: toNumber(row.total_amount),
    amountReceived: toNumber(row.amount_received),
    dueAmount: toNumber(row.due_amount),
    deliveryDate: String(row.delivery_date ?? new Date().toISOString()),
    notes: row.notes ? String(row.notes) : undefined,
    orderStatus: String(row.order_status ?? "assigned") as OrderStatus,
    expectedPaymentMethod: String(
      row.expected_payment_method ?? "cash",
    ) as PaymentMethod,
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
    paymentStatus: String(
      row.payment_status ?? "received",
    ) as PaymentRecordStatus,
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
    return orders.filter((order) =>
      isSameDay(parseISO(order.deliveryDate), todayDate()),
    );
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

const getAllCustomers = cache(async () => {
  if (!hasSupabaseEnv()) {
    return mockCustomers;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapCustomer(row as Record<string, unknown>));
});

const getAllRiders = cache(async () => {
  if (!hasSupabaseEnv()) {
    return mockRiders;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("riders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRider(row as Record<string, unknown>));
});

const getAllOrders = cache(async () => {
  if (!hasSupabaseEnv()) {
    return mockOrders;
  }

  await syncCustomerSubscriptionOrders();
  const [customerList] = await Promise.all([getAllCustomers()]);
  const customerMap = new Map(customerList.map((customer) => [customer.id, customer]));
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
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
  if (!hasSupabaseEnv()) {
    return mockPayments;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("received_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapPayment(row as Record<string, unknown>));
});

const getAllLedgerEntries = cache(async () => {
  if (!hasSupabaseEnv()) {
    return computeRunningLedger(mockLedgerEntries);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return computeRunningLedger(
    (data ?? []).map((row) => mapLedger(row as Record<string, unknown>)),
  );
});

export const businessProfile = mockBusinessProfile;

function resolveRiderId(user: SessionUser, riders: Rider[]) {
  return user.riderId ?? riders.find((rider) => rider.authUserId === user.id)?.id;
}

export async function listCustomers(query?: string) {
  if (!hasSupabaseEnv()) {
    return listMockCustomers(query);
  }

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

export async function listRiders() {
  if (!hasSupabaseEnv()) {
    return listMockRiders();
  }

  return getAllRiders();
}

export async function listOrders(filter = "all") {
  if (!hasSupabaseEnv()) {
    return listMockOrders(filter);
  }

  const orders = await getAllOrders();
  return filterOrdersByStatus(orders, filter);
}

export async function getCustomer(id: string) {
  if (!hasSupabaseEnv()) {
    const detail = getMockCustomer(id);
    if (!detail) {
      return null;
    }

    return {
      ...detail,
      serviceSummary: getServiceSummary({
        billingMonth: detail.customer.billingMonth,
        serviceStartDate: detail.customer.serviceStartDate,
        dailyBottleQty: detail.customer.dailyBottleQty,
        pricePerBottle: detail.customer.pricePerBottle,
      }),
    };
  }

  const [customers, orders, payments, ledger] = await Promise.all([
    getAllCustomers(),
    getAllOrders(),
    getAllPayments(),
    getAllLedgerEntries(),
  ]);

  const customer = customers.find((entry) => entry.id === id);
  if (!customer) {
    return null;
  }

  const customerOrders = orders.filter((order) => order.customerId === id);
  const customerPayments = payments.filter((payment) => payment.customerId === id);
  const customerLedger = ledger.filter((entry) => entry.customerId === id);

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
  if (!hasSupabaseEnv()) {
    return getMockRider(id);
  }

  const [riders, orders, payments] = await Promise.all([
    getAllRiders(),
    getAllOrders(),
    getAllPayments(),
  ]);

  const rider = riders.find((entry) => entry.id === id);
  if (!rider) {
    return null;
  }

  const riderOrders = orders.filter((order) => order.riderId === id);
  const riderPayments = payments.filter((payment) => payment.riderId === id);
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
  if (!hasSupabaseEnv()) {
    return getMockOrder(id);
  }

  const [orders, customers, riders, payments, ledger] = await Promise.all([
    getAllOrders(),
    getAllCustomers(),
    getAllRiders(),
    getAllPayments(),
    getAllLedgerEntries(),
  ]);

  const order = orders.find((entry) => entry.id === id);
  if (!order) {
    return null;
  }

  return {
    order,
    customer: customers.find((customer) => customer.id === order.customerId),
    rider: riders.find((rider) => rider.id === order.riderId),
    payments: payments.filter((payment) => payment.orderId === id),
    ledger: ledger.filter((entry) => entry.orderId === id),
  };
}

export async function getAdminDashboardData() {
  if (!hasSupabaseEnv()) {
    return getMockAdminDashboardData();
  }

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

  return {
    todayOrdersCount: todayOrders.length,
    deliveredOrdersCount: deliveredToday.length,
    pendingPaymentsCount: pendingVerification.length,
    totalDue,
    cashCollectedToday,
    recentOrders: [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4),
    pendingDues: customers
      .map((customer) => {
        const customerOrders = orders.filter((order) => order.customerId === customer.id);
        const customerPayments = payments.filter(
          (payment) => payment.customerId === customer.id,
        );
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
        deliveredCount: riderOrders.filter((order) => order.orderStatus === "delivered")
          .length,
      };
    }),
  };
}

export async function getPendingPayments() {
  if (!hasSupabaseEnv()) {
    return getMockPendingPayments();
  }

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
  if (!hasSupabaseEnv()) {
    return getMockPaymentHistory();
  }

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
  if (!hasSupabaseEnv()) {
    return getMockReportSummary(range);
  }

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
    deliveredOrders: filteredOrders.filter((order) => order.orderStatus === "delivered")
      .length,
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
          .filter(
            (payment) =>
              payment.riderId === rider.id && payment.paymentMethod === "cash",
          )
          .reduce((sum, payment) => sum + payment.amount, 0),
        onlineClaimed: filteredPayments
          .filter(
            (payment) =>
              payment.riderId === rider.id && payment.paymentMethod !== "cash",
          )
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
  if (!hasSupabaseEnv()) {
    const fallback = getMockRiderDashboard(user);
    const customerMap = new Map(mockCustomers.map((customer) => [customer.id, customer]));

    return {
      ...fallback,
      deliveries: fallback.assignedOrders.map((order) => ({
        order,
        customer: customerMap.get(order.customerId),
      })),
    };
  }

  const [orders, payments, customers, riders] = await Promise.all([
    getAllOrders(),
    getAllPayments(),
    getAllCustomers(),
    getAllRiders(),
  ]);

  const riderId = resolveRiderId(user, riders);

  const assignedOrders = orders.filter((order) => order.riderId === riderId);
  const todaysDeliveries = assignedOrders.filter((order) =>
    isSameDay(parseISO(order.deliveryDate), todayDate()),
  );

  return {
    rider: riders.find((rider) => rider.id === riderId),
    todayDeliveriesCount: todaysDeliveries.length,
    pendingDeliveriesCount: todaysDeliveries.filter(
      (order) => order.orderStatus !== "delivered",
    ).length,
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
      customer: customers.find((customer) => customer.id === order.customerId),
    })),
  };
}

export async function getRiderDeliveries(user: SessionUser) {
  if (!hasSupabaseEnv()) {
    const riderId = user.riderId;
    const items = mockOrders
      .filter((order) => order.riderId === riderId)
      .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
      .map((order) => ({
        order,
        customer: mockCustomers.find((customer) => customer.id === order.customerId),
      }));

    return {
      items,
      totalCount: items.length,
      pendingCount: items.filter(({ order }) => order.orderStatus !== "delivered").length,
      deliveredCount: items.filter(({ order }) => order.orderStatus === "delivered").length,
    };
  }

  const [orders, customers, riders] = await Promise.all([
    getAllOrders(),
    getAllCustomers(),
    getAllRiders(),
  ]);

  const riderId = resolveRiderId(user, riders);
  const items = orders
    .filter((order) => order.riderId === riderId)
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .map((order) => ({
      order,
      customer: customers.find((customer) => customer.id === order.customerId),
    }));

  return {
    items,
    totalCount: items.length,
    pendingCount: items.filter(({ order }) => order.orderStatus !== "delivered").length,
    deliveredCount: items.filter(({ order }) => order.orderStatus === "delivered").length,
  };
}

export async function getRiderCollections(user: SessionUser) {
  if (!hasSupabaseEnv()) {
    const riderId = user.riderId;
    const riderPayments = mockPayments
      .filter((payment) => payment.riderId === riderId)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

    return {
      items: riderPayments.map((payment) => ({
        payment,
        customer: mockCustomers.find((customer) => customer.id === payment.customerId),
        order: mockOrders.find((order) => order.id === payment.orderId),
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

  const [payments, customers, orders, riders] = await Promise.all([
    getAllPayments(),
    getAllCustomers(),
    getAllOrders(),
    getAllRiders(),
  ]);

  const riderId = resolveRiderId(user, riders);
  const riderPayments = payments
    .filter((payment) => payment.riderId === riderId)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  return {
    items: riderPayments.map((payment) => ({
      payment,
      customer: customers.find((customer) => customer.id === payment.customerId),
      order: orders.find((order) => order.id === payment.orderId),
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
  if (!hasSupabaseEnv()) {
    return getMockAreas();
  }

  const customers = await getAllCustomers();
  return Array.from(new Set(customers.map((customer) => customer.area)));
}
