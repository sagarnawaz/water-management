import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Home,
  ReceiptText,
  Route,
  Settings,
  Truck,
  Users,
} from "lucide-react";

import type { PaymentMethod, UserRole } from "@/types/domain";

export const APP_NAME = "AquaRoute Ops";

export const DEMO_PASSWORD = "water123";

export const paymentMethodOptions: Array<{
  value: PaymentMethod;
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "EasyPaisa" },
  { value: "credit", label: "Credit" },
  { value: "unknown", label: "Unknown" },
];

export const orderFilterOptions = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "assigned", label: "Assigned" },
  { value: "delivered", label: "Delivered" },
  { value: "pending_payment", label: "Pending Payment" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const reportRangeOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export const roleHome: Record<UserRole, string> = {
  admin: "/admin",
  rider: "/rider",
};

export function getNavigation(role: UserRole) {
  if (role === "admin") {
    return [
      { id: "dashboard", href: "/admin", label: "Dashboard", icon: Home },
      { id: "customers", href: "/admin/customers", label: "Customers", icon: Users },
      { id: "riders", href: "/admin/riders", label: "Riders", icon: Truck },
      { id: "orders", href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { id: "payments", href: "/admin/payments", label: "Payments", icon: CreditCard },
      { id: "ledger", href: "/admin/ledger", label: "Ledger", icon: ReceiptText },
      { id: "reports", href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { id: "settings", href: "/admin/settings", label: "Settings", icon: Settings },
    ];
  }

  return [
    { id: "today", href: "/rider", label: "Today", icon: Home },
    { id: "deliveries", href: "/rider/deliveries", label: "Deliveries", icon: Route },
    { id: "collections", href: "/rider/collections", label: "Collections", icon: CreditCard },
  ];
}
