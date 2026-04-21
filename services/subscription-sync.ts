import "server-only";

import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getServiceDateKeys } from "@/lib/customer-service";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { PaymentMethod } from "@/types/domain";

type SyncClient = SupabaseClient | null;

type SubscriptionCustomerRow = {
  id: string;
  name: string;
  daily_bottle_qty: number;
  price_per_bottle: number;
  default_payment_method: PaymentMethod;
  assigned_rider_id: string | null;
  billing_month: string;
  service_start_date: string;
  service_end_date: string;
  is_active: boolean;
};

type ExistingSubscriptionOrderRow = {
  id: string;
  customer_id: string;
  service_day: string;
  order_status: string;
};

function getPrivilegedClient(client?: SyncClient) {
  return client ?? createServiceRoleSupabaseClient();
}

function getPaymentStatus(method: PaymentMethod) {
  return method === "credit" ? "due" : "unpaid";
}

function buildDeliveryTimestamp(serviceDay: string) {
  return `${serviceDay}T09:00:00.000Z`;
}

export async function syncCustomerSubscriptionOrders(options?: {
  customerId?: string;
  client?: SyncClient;
}) {
  const supabase = getPrivilegedClient(options?.client);
  if (!supabase) {
    return;
  }

  let customerQuery = supabase.from("customers").select(`
      id,
      name,
      daily_bottle_qty,
      price_per_bottle,
      default_payment_method,
      assigned_rider_id,
      billing_month,
      service_start_date,
      service_end_date,
      is_active
    `);

  if (options?.customerId) {
    customerQuery = customerQuery.eq("id", options.customerId);
  }

  const { data: customerRows, error: customerError } = await customerQuery;

  if (customerError) {
    throw customerError;
  }

  const customers = (customerRows ?? []) as SubscriptionCustomerRow[];
  const eligibleCustomers = customers.filter(
    (customer) =>
      customer.is_active &&
      customer.assigned_rider_id &&
      customer.daily_bottle_qty > 0 &&
      customer.price_per_bottle > 0,
  );

  if (eligibleCustomers.length === 0) {
    return;
  }

  const customerIds = eligibleCustomers.map((customer) => customer.id);
  const { data: existingOrderRows, error: orderError } = await supabase
    .from("orders")
    .select("id, customer_id, service_day, order_status")
    .in("customer_id", customerIds)
    .eq("is_subscription_order", true)
    .not("service_day", "is", null);

  if (orderError) {
    throw orderError;
  }

  const existingOrders = (existingOrderRows ?? []) as ExistingSubscriptionOrderRow[];
  const existingOrderMap = new Map(
    existingOrders.map((order) => [`${order.customer_id}:${order.service_day}`, order]),
  );

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const insertRows: Array<Record<string, unknown>> = [];
  const updateRows: Array<Record<string, unknown>> = [];

  for (const customer of eligibleCustomers) {
    const serviceDays = getServiceDateKeys({
      serviceStartDate: customer.service_start_date,
      serviceEndDate: customer.service_end_date,
    });

    if (serviceDays.length === 0) {
      continue;
    }

    const totalAmount = customer.daily_bottle_qty * customer.price_per_bottle;

    for (const serviceDay of serviceDays) {
      const existingOrder = existingOrderMap.get(`${customer.id}:${serviceDay}`);

      if (existingOrder) {
        if (
          serviceDay === todayKey &&
          (existingOrder.order_status === "assigned" || existingOrder.order_status === "today")
        ) {
          updateRows.push({
            id: existingOrder.id,
            rider_id: customer.assigned_rider_id,
            bottle_qty: customer.daily_bottle_qty,
            price_per_bottle: customer.price_per_bottle,
            total_amount: totalAmount,
            due_amount: totalAmount,
            expected_payment_method: customer.default_payment_method,
            payment_status: getPaymentStatus(customer.default_payment_method),
            delivery_date: buildDeliveryTimestamp(serviceDay),
            updated_at: new Date().toISOString(),
          });
        }
        continue;
      }

      insertRows.push({
        customer_id: customer.id,
        rider_id: customer.assigned_rider_id,
        bottle_qty: customer.daily_bottle_qty,
        price_per_bottle: customer.price_per_bottle,
        total_amount: totalAmount,
        amount_received: 0,
        due_amount: totalAmount,
        delivery_date: buildDeliveryTimestamp(serviceDay),
        notes: `Auto-generated daily delivery for ${customer.name}`,
        order_status: "assigned",
        expected_payment_method: customer.default_payment_method,
        payment_status: getPaymentStatus(customer.default_payment_method),
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        service_day: serviceDay,
        is_subscription_order: true,
      });
    }
  }

  if (insertRows.length > 0) {
    const { data: insertedOrders, error: insertError } = await supabase
      .from("orders")
      .upsert(insertRows, {
        onConflict: "customer_id,service_day",
        ignoreDuplicates: true,
      })
      .select("id, customer_id, service_day, total_amount");

    if (insertError) {
      throw insertError;
    }

    if ((insertedOrders ?? []).length > 0) {
      const ledgerRows = (insertedOrders ?? []).map((order) => ({
        customer_id: order.customer_id,
        order_id: order.id,
        entry_type: "order",
        debit: order.total_amount,
        credit: 0,
        description: `Auto daily order for ${order.service_day}`,
      }));

      const { error: ledgerError } = await supabase.from("ledger_entries").insert(ledgerRows);
      if (ledgerError) {
        throw ledgerError;
      }
    }
  }

  await Promise.all(
    updateRows.map((row) =>
      supabase
        .from("orders")
        .update({
          rider_id: row.rider_id,
          bottle_qty: row.bottle_qty,
          price_per_bottle: row.price_per_bottle,
          total_amount: row.total_amount,
          due_amount: row.due_amount,
          expected_payment_method: row.expected_payment_method,
          payment_status: row.payment_status,
          delivery_date: row.delivery_date,
          updated_at: row.updated_at,
        })
        .eq("id", String(row.id)),
    ),
  );
}

export async function cancelPendingSubscriptionOrders(
  customerId: string,
  client?: SyncClient,
) {
  const supabase = getPrivilegedClient(client);
  if (!supabase) {
    return;
  }

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const { error } = await supabase
    .from("orders")
    .update({
      order_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("customer_id", customerId)
    .eq("is_subscription_order", true)
    .gte("service_day", todayKey)
    .in("order_status", ["assigned", "today"]);

  if (error) {
    throw error;
  }
}
