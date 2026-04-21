import {
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { DEMO_PASSWORD } from "@/lib/constants";
import type {
  BusinessProfile,
  Customer,
  LedgerEntry,
  Order,
  Payment,
  Rider,
  RiderCollectionSummary,
  SessionUser,
  UserRole,
} from "@/types/domain";

const TODAY = "2026-04-21";

export const businessProfile: BusinessProfile = {
  businessName: "AquaRoute Water Supply",
  ownerName: "Hassan Malik",
  phone: "+92 300 1234567",
  address: "Main Tanki Road, Gulshan-e-Noor, Karachi",
  serviceAreas: ["Gulshan", "North Nazimabad", "Buffer Zone", "Johar"],
};

const mockUsers: Array<SessionUser & { password: string }> = [
  {
    id: "profile-admin-1",
    role: "admin",
    name: "Hassan Malik",
    email: "owner@aquaroute.test",
    phone: "+92 300 1234567",
    password: DEMO_PASSWORD,
  },
  {
    id: "profile-rider-1",
    role: "rider",
    name: "Rafiq Ali",
    email: "rafiq@aquaroute.test",
    phone: "+92 311 1001001",
    riderId: "rider-1",
    password: DEMO_PASSWORD,
  },
  {
    id: "profile-rider-2",
    role: "rider",
    name: "Kamran Shah",
    email: "kamran@aquaroute.test",
    phone: "+92 311 1001002",
    riderId: "rider-2",
    password: DEMO_PASSWORD,
  },
];

export const customers: Customer[] = [
  {
    id: "cust-1",
    name: "Ahmed Traders",
    phone: "+92 321 5551001",
    alternatePhone: "+92 333 5551001",
    address: "Shop 14, Block 6, Gulshan-e-Iqbal",
    area: "Gulshan",
    notes: "Needs delivery before 11 AM.",
    dailyBottleQty: 12,
    pricePerBottle: 180,
    paymentMethod: "cash",
    assignedRiderId: "rider-1",
    billingMonth: "2026-04-01",
    serviceStartDate: "2026-04-01",
    serviceEndDate: "2026-04-30",
    createdAt: "2026-03-10T09:00:00Z",
    isActive: true,
  },
  {
    id: "cust-2",
    name: "Sana Clinic",
    phone: "+92 321 5551002",
    address: "Street 9, North Nazimabad",
    area: "North Nazimabad",
    notes: "Calls on arrival.",
    dailyBottleQty: 8,
    pricePerBottle: 180,
    paymentMethod: "bank_transfer",
    assignedRiderId: "rider-1",
    billingMonth: "2026-04-01",
    serviceStartDate: "2026-04-10",
    serviceEndDate: "2026-04-30",
    createdAt: "2026-03-14T09:00:00Z",
    isActive: true,
  },
  {
    id: "cust-3",
    name: "Usman Residency",
    phone: "+92 321 5551003",
    address: "House 33, Block D, Johar",
    area: "Johar",
    notes: "Monthly credit customer.",
    dailyBottleQty: 15,
    pricePerBottle: 180,
    paymentMethod: "credit",
    assignedRiderId: "rider-2",
    billingMonth: "2026-04-01",
    serviceStartDate: "2026-04-15",
    serviceEndDate: "2026-04-30",
    createdAt: "2026-03-22T09:00:00Z",
    isActive: true,
  },
  {
    id: "cust-4",
    name: "Noor Bakery",
    phone: "+92 321 5551004",
    address: "Main Bazaar, Buffer Zone",
    area: "Buffer Zone",
    notes: "",
    dailyBottleQty: 10,
    pricePerBottle: 170,
    paymentMethod: "easypaisa",
    assignedRiderId: "rider-2",
    billingMonth: "2026-04-01",
    serviceStartDate: "2026-04-01",
    serviceEndDate: "2026-04-30",
    createdAt: "2026-03-25T09:00:00Z",
    isActive: true,
  },
  {
    id: "cust-5",
    name: "Farah Home",
    phone: "+92 321 5551005",
    address: "House 19, Block 2, Gulshan",
    area: "Gulshan",
    notes: "Collect cash from guard if needed.",
    dailyBottleQty: 6,
    pricePerBottle: 180,
    paymentMethod: "cash",
    assignedRiderId: "rider-1",
    billingMonth: "2026-04-01",
    serviceStartDate: "2026-04-19",
    serviceEndDate: "2026-04-30",
    createdAt: "2026-04-01T09:00:00Z",
    isActive: true,
  },
];

export const riders: Rider[] = [
  {
    id: "rider-1",
    authUserId: "profile-rider-1",
    name: "Rafiq Ali",
    phone: "+92 311 1001001",
    vehicleNumber: "KHI-1882",
    status: "active",
    createdAt: "2026-02-01T09:00:00Z",
  },
  {
    id: "rider-2",
    authUserId: "profile-rider-2",
    name: "Kamran Shah",
    phone: "+92 311 1001002",
    vehicleNumber: "KHI-2211",
    status: "active",
    createdAt: "2026-02-11T09:00:00Z",
  },
  {
    id: "rider-3",
    authUserId: "profile-rider-3",
    name: "Asif Noor",
    phone: "+92 311 1001003",
    vehicleNumber: "KHI-3307",
    status: "inactive",
    createdAt: "2026-02-25T09:00:00Z",
  },
];

export const orders: Order[] = [
  {
    id: "order-1",
    orderNumber: "ORD-2401",
    customerId: "cust-1",
    riderId: "rider-1",
    bottleQty: 12,
    deliveredQty: 12,
    pricePerBottle: 180,
    totalAmount: 2160,
    amountReceived: 2160,
    dueAmount: 0,
    deliveryDate: `${TODAY}T09:30:00Z`,
    notes: "Office pantry refill.",
    orderStatus: "delivered",
    expectedPaymentMethod: "cash",
    paymentStatus: "paid",
    createdBy: "profile-admin-1",
    createdAt: `${TODAY}T07:10:00Z`,
    updatedAt: `${TODAY}T10:15:00Z`,
    locationUrl: "https://maps.google.com/?q=24.922,67.087",
  },
  {
    id: "order-2",
    orderNumber: "ORD-2402",
    customerId: "cust-2",
    riderId: "rider-1",
    bottleQty: 8,
    pricePerBottle: 180,
    totalAmount: 1440,
    amountReceived: 0,
    dueAmount: 1440,
    deliveryDate: `${TODAY}T11:00:00Z`,
    notes: "Reception delivery.",
    orderStatus: "assigned",
    expectedPaymentMethod: "bank_transfer",
    paymentStatus: "verification_pending",
    createdBy: "profile-admin-1",
    createdAt: `${TODAY}T08:00:00Z`,
    updatedAt: `${TODAY}T08:00:00Z`,
    transactionReference: "TRX-9921",
    locationUrl: "https://maps.google.com/?q=24.940,67.041",
  },
  {
    id: "order-3",
    orderNumber: "ORD-2403",
    customerId: "cust-3",
    riderId: "rider-2",
    bottleQty: 15,
    pricePerBottle: 180,
    totalAmount: 2700,
    amountReceived: 1000,
    dueAmount: 1700,
    deliveryDate: `${TODAY}T13:00:00Z`,
    notes: "Monthly billing customer.",
    orderStatus: "today",
    expectedPaymentMethod: "credit",
    paymentStatus: "partial",
    createdBy: "profile-admin-1",
    createdAt: `${TODAY}T08:20:00Z`,
    updatedAt: `${TODAY}T08:20:00Z`,
    locationUrl: "https://maps.google.com/?q=24.905,67.120",
  },
  {
    id: "order-4",
    orderNumber: "ORD-2398",
    customerId: "cust-4",
    riderId: "rider-2",
    bottleQty: 10,
    deliveredQty: 10,
    pricePerBottle: 170,
    totalAmount: 1700,
    amountReceived: 0,
    dueAmount: 1700,
    deliveryDate: "2026-04-20T16:30:00Z",
    notes: "",
    orderStatus: "pending_payment",
    expectedPaymentMethod: "easypaisa",
    paymentStatus: "verification_pending",
    createdBy: "profile-admin-1",
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T18:00:00Z",
    transactionReference: "EP-45211",
    locationUrl: "https://maps.google.com/?q=24.949,67.061",
  },
  {
    id: "order-5",
    orderNumber: "ORD-2392",
    customerId: "cust-5",
    riderId: "rider-1",
    bottleQty: 6,
    deliveredQty: 6,
    pricePerBottle: 180,
    totalAmount: 1080,
    amountReceived: 1080,
    dueAmount: 0,
    deliveryDate: "2026-04-19T10:15:00Z",
    notes: "",
    orderStatus: "delivered",
    expectedPaymentMethod: "cash",
    paymentStatus: "paid",
    createdBy: "profile-admin-1",
    createdAt: "2026-04-19T08:00:00Z",
    updatedAt: "2026-04-19T11:00:00Z",
    locationUrl: "https://maps.google.com/?q=24.912,67.084",
  },
  {
    id: "order-6",
    orderNumber: "ORD-2400",
    customerId: "cust-2",
    riderId: "rider-3",
    bottleQty: 5,
    pricePerBottle: 180,
    totalAmount: 900,
    amountReceived: 0,
    dueAmount: 0,
    deliveryDate: `${TODAY}T15:00:00Z`,
    notes: "Customer postponed.",
    orderStatus: "cancelled",
    expectedPaymentMethod: "unknown",
    paymentStatus: "unpaid",
    createdBy: "profile-admin-1",
    createdAt: `${TODAY}T09:15:00Z`,
    updatedAt: `${TODAY}T09:45:00Z`,
    locationUrl: "https://maps.google.com/?q=24.940,67.041",
  },
];

export const payments: Payment[] = [
  {
    id: "pay-1",
    orderId: "order-1",
    customerId: "cust-1",
    riderId: "rider-1",
    amount: 2160,
    paymentMethod: "cash",
    paymentStatus: "verified",
    receivedAt: `${TODAY}T10:10:00Z`,
    notes: "Collected on delivery.",
  },
  {
    id: "pay-2",
    orderId: "order-4",
    customerId: "cust-4",
    riderId: "rider-2",
    amount: 1700,
    paymentMethod: "easypaisa",
    paymentStatus: "pending_verification",
    transactionReference: "EP-45211",
    proofUrl: "/file.svg",
    receivedAt: "2026-04-20T17:50:00Z",
    notes: "Screenshot uploaded by rider.",
  },
  {
    id: "pay-3",
    orderId: "order-3",
    customerId: "cust-3",
    riderId: "rider-2",
    amount: 1000,
    paymentMethod: "cash",
    paymentStatus: "received",
    receivedAt: `${TODAY}T13:25:00Z`,
    notes: "Partial collection.",
  },
  {
    id: "pay-4",
    customerId: "cust-5",
    riderId: "rider-1",
    amount: 2500,
    paymentMethod: "bank_transfer",
    paymentStatus: "verified",
    transactionReference: "MBL-7118",
    verifiedBy: "profile-admin-1",
    verifiedAt: `${TODAY}T09:20:00Z`,
    receivedAt: `${TODAY}T09:00:00Z`,
    notes: "Manual settlement for last week balance.",
  },
];

export const ledgerEntries: LedgerEntry[] = [
  {
    id: "ledger-1",
    customerId: "cust-1",
    orderId: "order-1",
    entryType: "order",
    debit: 2160,
    credit: 0,
    balanceSnapshot: 2160,
    description: "Order created ORD-2401",
    createdAt: `${TODAY}T07:10:00Z`,
  },
  {
    id: "ledger-2",
    customerId: "cust-1",
    paymentId: "pay-1",
    orderId: "order-1",
    entryType: "payment",
    debit: 0,
    credit: 2160,
    balanceSnapshot: 0,
    description: "Cash received for ORD-2401",
    createdAt: `${TODAY}T10:10:00Z`,
  },
  {
    id: "ledger-3",
    customerId: "cust-3",
    orderId: "order-3",
    entryType: "order",
    debit: 2700,
    credit: 0,
    balanceSnapshot: 2700,
    description: "Order created ORD-2403",
    createdAt: `${TODAY}T08:20:00Z`,
  },
  {
    id: "ledger-4",
    customerId: "cust-3",
    paymentId: "pay-3",
    orderId: "order-3",
    entryType: "payment",
    debit: 0,
    credit: 1000,
    balanceSnapshot: 1700,
    description: "Partial cash collection",
    createdAt: `${TODAY}T13:25:00Z`,
  },
  {
    id: "ledger-5",
    customerId: "cust-4",
    orderId: "order-4",
    entryType: "order",
    debit: 1700,
    credit: 0,
    balanceSnapshot: 1700,
    description: "Order created ORD-2398",
    createdAt: "2026-04-20T10:00:00Z",
  },
  {
    id: "ledger-6",
    customerId: "cust-5",
    paymentId: "pay-4",
    entryType: "payment",
    debit: 0,
    credit: 2500,
    balanceSnapshot: 0,
    description: "Manual owner collection",
    createdAt: `${TODAY}T09:00:00Z`,
  },
];

function customerById(customerId: string) {
  return customers.find((customer) => customer.id === customerId);
}

function riderById(riderId?: string) {
  return riders.find((rider) => rider.id === riderId);
}

export function getMockSessionUserByEmail(email: string, role?: UserRole) {
  const user = mockUsers.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase(),
  );

  if (!user || (role && user.role !== role)) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    riderId: user.riderId,
  } satisfies SessionUser;
}

export function authenticateDemoUser(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();

  const user = mockUsers.find(
    (entry) =>
      (entry.email.toLowerCase() === normalized || entry.phone === identifier) &&
      entry.password === password,
  );

  return user
    ? ({
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        riderId: user.riderId,
      } satisfies SessionUser)
    : null;
}

export function listCustomers(query?: string) {
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

export function listRiders() {
  return riders;
}

export function listOrders(filter = "all") {
  if (filter === "all") {
    return orders;
  }

  return orders.filter((order) => order.orderStatus === filter);
}

export function getCustomer(id: string) {
  const customer = customerById(id);
  if (!customer) {
    return null;
  }

  const customerOrders = orders.filter((order) => order.customerId === id);
  const customerPayments = payments.filter((payment) => payment.customerId === id);
  const customerLedger = ledgerEntries
    .filter((entry) => entry.customerId === id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const totalOrders = customerOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0,
  );
  const totalPaid = customerPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  return {
    customer,
    orders: customerOrders,
    payments: customerPayments,
    ledger: customerLedger,
    totals: {
      totalOrders,
      totalPaid,
      currentDue: Math.max(totalOrders - totalPaid, 0),
    },
  };
}

export function getRider(id: string) {
  const rider = riderById(id);
  if (!rider) {
    return null;
  }

  const riderOrders = orders.filter((order) => order.riderId === id);
  const riderPayments = payments.filter((payment) => payment.riderId === id);
  const deliveredOrders = riderOrders.filter(
    (order) => order.orderStatus === "delivered",
  );

  return {
    rider,
    orders: riderOrders,
    payments: riderPayments,
    totals: {
      todayDeliveries: riderOrders.filter((order) =>
        isSameDay(parseISO(order.deliveryDate), parseISO(`${TODAY}T00:00:00Z`)),
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

export function getOrder(id: string) {
  const order = orders.find((entry) => entry.id === id);
  if (!order) {
    return null;
  }

  const customer = customerById(order.customerId);
  const rider = riderById(order.riderId);
  const paymentRecords = payments.filter((payment) => payment.orderId === id);
  const ledger = ledgerEntries.filter((entry) => entry.orderId === id);

  return {
    order,
    customer,
    rider,
    payments: paymentRecords,
    ledger,
  };
}

export function getAdminDashboardData() {
  const todayOrders = orders.filter((order) =>
    isSameDay(parseISO(order.deliveryDate), parseISO(`${TODAY}T00:00:00Z`)),
  );

  const deliveredToday = todayOrders.filter(
    (order) => order.orderStatus === "delivered",
  );
  const pendingVerification = payments.filter(
    (payment) => payment.paymentStatus === "pending_verification",
  );

  const totalDue = orders.reduce((sum, order) => sum + order.dueAmount, 0);
  const cashCollectedToday = payments
    .filter(
      (payment) =>
        payment.paymentMethod === "cash" &&
        isSameDay(parseISO(payment.receivedAt), parseISO(`${TODAY}T00:00:00Z`)),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);

  const riderCollectionSummary: RiderCollectionSummary[] = riders.map((rider) => {
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
  });

  return {
    todayOrdersCount: todayOrders.length,
    deliveredOrdersCount: deliveredToday.length,
    pendingPaymentsCount: pendingVerification.length,
    totalDue,
    cashCollectedToday,
    recentOrders: orders.slice(0, 4),
    pendingDues: customers
      .map((customer) => {
        const detail = getCustomer(customer.id);
        return {
          customer,
          dueAmount: detail?.totals.currentDue ?? 0,
        };
      })
      .filter((item) => item.dueAmount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .slice(0, 4),
    riderCollectionSummary,
  };
}

export function getPendingPayments() {
  return payments
    .filter((payment) => payment.paymentStatus === "pending_verification")
    .map((payment) => ({
      ...payment,
      customer: customerById(payment.customerId),
      rider: riderById(payment.riderId),
      order: orders.find((order) => order.id === payment.orderId),
    }));
}

export function getPaymentHistory() {
  return payments.map((payment) => ({
    ...payment,
    customer: customerById(payment.customerId),
    rider: riderById(payment.riderId),
    order: orders.find((order) => order.id === payment.orderId),
  }));
}

export function getReportSummary(range: "daily" | "weekly" | "monthly") {
  const boundary =
    range === "daily"
      ? parseISO(`${TODAY}T00:00:00Z`)
      : range === "weekly"
        ? startOfWeek(parseISO(`${TODAY}T00:00:00Z`), { weekStartsOn: 1 })
        : startOfMonth(parseISO(`${TODAY}T00:00:00Z`));

  const scopedOrders = orders.filter(
    (order) => parseISO(order.createdAt).getTime() >= boundary.getTime(),
  );
  const scopedPayments = payments.filter(
    (payment) => parseISO(payment.receivedAt).getTime() >= boundary.getTime(),
  );

  return {
    range,
    label:
      range === "daily"
        ? format(boundary, "dd MMM yyyy")
        : range === "weekly"
          ? `Week of ${format(boundary, "dd MMM yyyy")}`
          : format(boundary, "MMMM yyyy"),
    totalOrders: scopedOrders.length,
    deliveredOrders: scopedOrders.filter((order) => order.orderStatus === "delivered")
      .length,
    cashCollected: scopedPayments
      .filter((payment) => payment.paymentMethod === "cash")
      .reduce((sum, payment) => sum + payment.amount, 0),
    pendingVerification: scopedPayments
      .filter((payment) => payment.paymentStatus === "pending_verification")
      .reduce((sum, payment) => sum + payment.amount, 0),
    totalDue: scopedOrders.reduce((sum, order) => sum + order.dueAmount, 0),
    riderWiseCollection: riders.map((rider) => ({
      riderId: rider.id,
      riderName: rider.name,
      cashCollected: scopedPayments
        .filter(
          (payment) =>
            payment.riderId === rider.id && payment.paymentMethod === "cash",
        )
        .reduce((sum, payment) => sum + payment.amount, 0),
      onlineClaimed: scopedPayments
        .filter(
          (payment) =>
            payment.riderId === rider.id && payment.paymentMethod !== "cash",
        )
        .reduce((sum, payment) => sum + payment.amount, 0),
      pendingReconciliation: scopedPayments
        .filter(
          (payment) =>
            payment.riderId === rider.id &&
            payment.paymentStatus === "pending_verification",
        )
        .reduce((sum, payment) => sum + payment.amount, 0),
      deliveredCount: scopedOrders.filter(
        (order) => order.riderId === rider.id && order.orderStatus === "delivered",
      ).length,
    })),
  };
}

export function getRiderDashboard(user: SessionUser) {
  const riderId = user.riderId;
  const assignedOrders = orders.filter((order) => order.riderId === riderId);
  const todaysDeliveries = assignedOrders.filter((order) =>
    isSameDay(parseISO(order.deliveryDate), parseISO(`${TODAY}T00:00:00Z`)),
  );

  return {
    rider: riderById(riderId),
    todayDeliveriesCount: todaysDeliveries.length,
    pendingDeliveriesCount: todaysDeliveries.filter(
      (order) => order.orderStatus !== "delivered",
    ).length,
    cashCollectedToday: payments
      .filter(
        (payment) =>
          payment.riderId === riderId &&
          payment.paymentMethod === "cash" &&
          isSameDay(parseISO(payment.receivedAt), parseISO(`${TODAY}T00:00:00Z`)),
      )
      .reduce((sum, payment) => sum + payment.amount, 0),
    assignedOrders: todaysDeliveries,
  };
}

export function getAreas() {
  return Array.from(new Set(customers.map((customer) => customer.area)));
}

export function getDemoCredentials() {
  return mockUsers.map((user) => ({
    role: user.role,
    email: user.email,
    password: user.password,
  }));
}
