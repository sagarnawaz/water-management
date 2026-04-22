import "server-only";

import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getScheduledDeliveryDateKeys } from "@/lib/customer-service";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { PaymentMethod } from "@/types/domain";

type SyncClient = SupabaseClient | null;

type SubscriptionRow = {
  id: string;
  customer_id: string;
  rider_id: string | null;
  bottles_per_delivery: number;
  delivery_frequency: "daily" | "weekdays" | "custom_days";
  delivery_days: number[] | null;
  preferred_time_slot: string | null;
  monthly_amount: number;
  payment_method: PaymentMethod;
  start_date: string;
  end_date: string | null;
  status: "active" | "inactive" | "paused" | "ended";
};

type ExistingDeliveryRow = {
  id: string;
  subscription_id: string;
  scheduled_date: string;
  status: string;
};

function getPrivilegedClient(client?: SyncClient) {
  return client ?? createServiceRoleSupabaseClient();
}

function getWindowDates(windowStart?: Date, windowEnd?: Date) {
  const start = windowStart ?? startOfMonth(new Date());
  const end = windowEnd ?? endOfMonth(start);

  return {
    start,
    end,
    startKey: format(start, "yyyy-MM-dd"),
    endKey: format(end, "yyyy-MM-dd"),
  };
}

function getScheduledDaysInMonth(subscription: SubscriptionRow, scheduledDate: string) {
  const monthStart = startOfMonth(parseISO(`${scheduledDate}T00:00:00`));
  const monthEnd = endOfMonth(monthStart);

  return getScheduledDeliveryDateKeys({
    startDate: subscription.start_date,
    endDate: subscription.end_date,
    deliveryFrequency: subscription.delivery_frequency,
    deliveryDays: subscription.delivery_days ?? [],
    windowStart: monthStart,
    windowEnd: monthEnd,
  }).length;
}

function getExpectedAmount(subscription: SubscriptionRow, scheduledDate: string) {
  const scheduledDays = getScheduledDaysInMonth(subscription, scheduledDate);

  if (scheduledDays <= 0) {
    return 0;
  }

  return Number((subscription.monthly_amount / scheduledDays).toFixed(2));
}

function getInitialDueAmount(paymentMethod: PaymentMethod, expectedAmount: number) {
  if (expectedAmount <= 0) {
    return 0;
  }

  return paymentMethod === "credit" ? expectedAmount : expectedAmount;
}

export async function syncSubscriptionDeliveries(options?: {
  customerId?: string;
  subscriptionId?: string;
  client?: SyncClient;
  windowStart?: Date;
  windowEnd?: Date;
}) {
  const supabase = getPrivilegedClient(options?.client);
  if (!supabase) {
    return;
  }

  const { start, end, startKey, endKey } = getWindowDates(options?.windowStart, options?.windowEnd);

  let subscriptionQuery = supabase.from("subscriptions").select(
    [
      "id",
      "customer_id",
      "rider_id",
      "bottles_per_delivery",
      "delivery_frequency",
      "delivery_days",
      "preferred_time_slot",
      "monthly_amount",
      "payment_method",
      "start_date",
      "end_date",
      "status",
    ].join(", "),
  );

  if (options?.customerId) {
    subscriptionQuery = subscriptionQuery.eq("customer_id", options.customerId);
  }

  if (options?.subscriptionId) {
    subscriptionQuery = subscriptionQuery.eq("id", options.subscriptionId);
  }

  const { data: subscriptionRows, error: subscriptionError } = await subscriptionQuery;

  if (subscriptionError) {
    throw subscriptionError;
  }

  const subscriptions = ((subscriptionRows ?? []) as SubscriptionRow[]).filter(
    (subscription) =>
      subscription.status === "active" &&
      subscription.bottles_per_delivery > 0 &&
      subscription.start_date <= endKey &&
      (!subscription.end_date || subscription.end_date >= startKey),
  );

  if (subscriptions.length === 0) {
    return;
  }

  const subscriptionIds = subscriptions.map((subscription) => subscription.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("delivery_records")
    .select("id, subscription_id, scheduled_date, status")
    .in("subscription_id", subscriptionIds)
    .gte("scheduled_date", startKey)
    .lte("scheduled_date", endKey);

  if (existingError) {
    throw existingError;
  }

  const existingMap = new Map(
    ((existingRows ?? []) as ExistingDeliveryRow[]).map((row) => [
      `${row.subscription_id}:${row.scheduled_date}`,
      row,
    ]),
  );

  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];

  for (const subscription of subscriptions) {
    const scheduledDates = getScheduledDeliveryDateKeys({
      startDate: subscription.start_date,
      endDate: subscription.end_date,
      deliveryFrequency: subscription.delivery_frequency,
      deliveryDays: subscription.delivery_days ?? [],
      windowStart: start,
      windowEnd: end,
    });

    for (const scheduledDate of scheduledDates) {
      const existing = existingMap.get(`${subscription.id}:${scheduledDate}`);
      const expectedAmount = getExpectedAmount(subscription, scheduledDate);
      const basePayload = {
        customer_id: subscription.customer_id,
        subscription_id: subscription.id,
        rider_id: subscription.rider_id,
        scheduled_date: scheduledDate,
        scheduled_time_slot: subscription.preferred_time_slot,
        scheduled_bottles: subscription.bottles_per_delivery,
        expected_amount: expectedAmount,
        due_amount: getInitialDueAmount(subscription.payment_method, expectedAmount),
        updated_at: new Date().toISOString(),
      };

      if (!existing) {
        inserts.push({
          ...basePayload,
          collected_amount: 0,
          status: "scheduled",
          created_at: new Date().toISOString(),
        });
        continue;
      }

      if (existing.status === "scheduled" || existing.status === "rescheduled") {
        updates.push({
          id: existing.id,
          ...basePayload,
        });
      }
    }
  }

  if (inserts.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("delivery_records")
      .upsert(inserts, {
        onConflict: "subscription_id,scheduled_date",
        ignoreDuplicates: true,
      })
      .select("id, customer_id, subscription_id, scheduled_date, expected_amount");

    if (insertError) {
      throw insertError;
    }

    if ((insertedRows ?? []).length > 0) {
      const ledgerRows = (insertedRows ?? []).map((row) => ({
        customer_id: row.customer_id,
        subscription_id: row.subscription_id,
        delivery_record_id: row.id,
        entry_type: "delivery",
        debit: row.expected_amount,
        credit: 0,
        description: `Scheduled delivery for ${row.scheduled_date}`,
      }));

      const { error: ledgerError } = await supabase.from("ledger_entries").insert(ledgerRows);
      if (ledgerError) {
        throw ledgerError;
      }
    }
  }

  await Promise.all(
    updates.map((row) =>
      supabase
        .from("delivery_records")
        .update({
          rider_id: row.rider_id,
          scheduled_time_slot: row.scheduled_time_slot,
          scheduled_bottles: row.scheduled_bottles,
          expected_amount: row.expected_amount,
          due_amount: row.due_amount,
          updated_at: row.updated_at,
        })
        .eq("id", String(row.id)),
    ),
  );
}

export async function cancelUpcomingDeliveryRecordsForCustomer(
  customerId: string,
  client?: SyncClient,
) {
  const supabase = getPrivilegedClient(client);
  if (!supabase) {
    return;
  }

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const { error } = await supabase
    .from("delivery_records")
    .update({
      status: "skipped",
      note: "Subscription inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("customer_id", customerId)
    .gte("scheduled_date", todayKey)
    .in("status", ["scheduled", "rescheduled"]);

  if (error) {
    throw error;
  }
}
