"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { roundMoney } from "@/lib/money";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  syncSubscriptionDeliveries,
} from "@/services/subscription-sync";
import type { DeliveryPaymentOutcome, PaymentMethod } from "@/types/domain";
import { customerSchema, type CustomerInput } from "@/validations/customer";
import { deliverySchema } from "@/validations/delivery";
import { manualPaymentSchema, type ManualPaymentInput } from "@/validations/payment";
import { riderSchema, type RiderInput } from "@/validations/rider";
import { subscriptionSchema, type SubscriptionInput } from "@/validations/subscription";

type MutationResult = {
  success: boolean;
  message?: string;
  redirectTo?: string;
};

function buildMutationResult(path: string, message: string): MutationResult {
  return {
    success: true,
    redirectTo: path,
    message,
  };
}

function roundAmount(value: number) {
  return roundMoney(value);
}

async function insertLedgerEntry(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  payload: Record<string, unknown>,
) {
  const ledgerClient = createServiceRoleSupabaseClient() ?? supabase;
  const { error } = await ledgerClient.from("ledger_entries").insert(payload);

  if (error) {
    throw error;
  }
}

async function uploadOptionalProof(file: File | null) {
  if (!file || file.size === 0) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `delivery-proofs/${Date.now()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("delivery-proofs")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    return null;
  }

  const { data } = supabase.storage.from("delivery-proofs").getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}

function getChargeAmount(input: {
  status: string;
  scheduledBottles: number;
  deliveredQty: number;
  expectedAmount: number;
}) {
  if (
    input.status === "not_delivered" ||
    input.status === "skipped" ||
    input.status === "rescheduled"
  ) {
    return 0;
  }

  if (!input.scheduledBottles || input.deliveredQty >= input.scheduledBottles) {
    return input.expectedAmount;
  }

  return roundAmount((input.expectedAmount / input.scheduledBottles) * input.deliveredQty);
}

export async function saveCustomerAction(input: CustomerInput): Promise<MutationResult> {
  await requireUser("admin");
  const parsed = customerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.flatten().fieldErrors.name?.[0] ??
        parsed.error.flatten().fieldErrors.phone?.[0] ??
        parsed.error.flatten().fieldErrors.alternatePhone?.[0] ??
        parsed.error.flatten().fieldErrors.area?.[0] ??
        parsed.error.flatten().fieldErrors.address?.[0] ??
        parsed.error.flatten().fieldErrors.notes?.[0] ??
        "Please check the customer form.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const payload = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    alternate_phone: parsed.data.alternatePhone || null,
    address: parsed.data.address,
    area: parsed.data.area,
    notes: parsed.data.notes || null,
    is_active: parsed.data.isActive,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("customers").update(payload).eq("id", parsed.data.id);
    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("customers").insert(payload);
    if (error) {
      throw error;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/subscriptions");

  return buildMutationResult(
    "/admin/customers",
    parsed.data.id ? "Customer updated." : "Customer created.",
  );
}

export async function saveSubscriptionAction(
  input: SubscriptionInput,
): Promise<MutationResult> {
  const user = await requireUser("admin");
  const parsed = subscriptionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.flatten().fieldErrors.customerId?.[0] ??
        parsed.error.flatten().fieldErrors.bottlesPerDelivery?.[0] ??
        "Please check the subscription form.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const payload = {
    customer_id: parsed.data.customerId,
    rider_id: parsed.data.riderId || null,
    bottles_per_delivery: parsed.data.bottlesPerDelivery,
    delivery_frequency: parsed.data.deliveryFrequency,
    delivery_days: parsed.data.deliveryDays,
    preferred_time_slot: parsed.data.preferredTimeSlot || null,
    monthly_amount: roundMoney(parsed.data.monthlyAmount),
    payment_method: parsed.data.paymentMethod,
    billing_cycle: parsed.data.billingCycle,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate || null,
    status: parsed.data.status,
    created_by: user.id,
  };

  let subscriptionId = parsed.data.id;

  if (parsed.data.id) {
    const { error } = await supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", parsed.data.id);
    if (error) {
      throw error;
    }
  } else {
    const { data, error } = await supabase
      .from("subscriptions")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      throw error;
    }
    subscriptionId = data?.id;
  }

  if (subscriptionId && parsed.data.status === "active") {
    await syncSubscriptionDeliveries({ subscriptionId });
  }

  if (subscriptionId && parsed.data.status !== "active") {
    const { error } = await supabase
      .from("delivery_records")
      .update({
        status: "skipped",
        note: "Subscription inactive",
        expected_amount: 0,
        due_amount: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscriptionId)
      .in("status", ["scheduled", "rescheduled"]);

    if (error) {
      throw error;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");

  return buildMutationResult(
    "/admin/subscriptions",
    parsed.data.id ? "Subscription updated." : "Subscription created.",
  );
}

export async function saveRiderAction(input: RiderInput): Promise<MutationResult> {
  await requireUser("admin");
  const parsed = riderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.flatten().fieldErrors.name?.[0] ??
        parsed.error.flatten().fieldErrors.phone?.[0] ??
        "Please check the rider form.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const payload = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    vehicle_number: parsed.data.vehicleNumber,
    status: parsed.data.status,
  };

  if (parsed.data.id) {
    const { error } = await supabase.from("riders").update(payload).eq("id", parsed.data.id);
    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("riders").insert(payload);
    if (error) {
      throw error;
    }
  }

  revalidatePath("/admin/riders");
  revalidatePath("/admin/subscriptions");

  return buildMutationResult(
    "/admin/riders",
    parsed.data.id ? "Rider updated." : "Rider added.",
  );
}

export async function saveOrderAction(): Promise<MutationResult> {
  await requireUser("admin");

  return {
    success: false,
    message: "Manual daily orders have been replaced by subscriptions and delivery records.",
  };
}

export async function cancelOrderAction(orderId: string) {
  await requireUser("admin");

  const supabase = await createServerSupabaseClient();
  const { data: deliveryRecord, error: fetchError } = await supabase
    .from("delivery_records")
    .select("id, customer_id, subscription_id, expected_amount, status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!deliveryRecord) {
    return buildMutationResult("/admin/orders", "Delivery already unavailable.");
  }

  const { error: updateError } = await supabase
    .from("delivery_records")
    .update({
      status: "skipped",
      note: "Cancelled by admin",
      expected_amount: 0,
      due_amount: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    throw updateError;
  }

  if (Number(deliveryRecord.expected_amount) > 0) {
    const { error: ledgerError } = await supabase.from("ledger_entries").insert({
      customer_id: deliveryRecord.customer_id,
      subscription_id: deliveryRecord.subscription_id,
      delivery_record_id: deliveryRecord.id,
      entry_type: "adjustment",
      debit: 0,
      credit: Number(deliveryRecord.expected_amount),
      description: "Delivery cancelled adjustment",
    });

    if (ledgerError) {
      throw ledgerError;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");

  return buildMutationResult("/admin/orders", "Delivery cancelled.");
}

export async function cancelOrderFormAction(orderId: string) {
  await cancelOrderAction(orderId);
}

export async function reviewPaymentAction(
  paymentId: string,
  decision: "verified" | "rejected",
) {
  const user = await requireUser("admin");

  const supabase = await createServerSupabaseClient();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, amount, customer_id, subscription_id, delivery_record_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError) {
    throw paymentError;
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      payment_status: decision,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (updateError) {
    throw updateError;
  }

  if (payment?.delivery_record_id && decision === "verified") {
    const { data: deliveryRecord, error: deliveryFetchError } = await supabase
      .from("delivery_records")
      .select("collected_amount, due_amount")
      .eq("id", payment.delivery_record_id)
      .maybeSingle();

    if (deliveryFetchError) {
      throw deliveryFetchError;
    }

    const paymentAmount = roundMoney(Number(payment.amount));
    const collectedAmount = roundMoney(
      Number(deliveryRecord?.collected_amount ?? 0) + paymentAmount,
    );
    const dueAmount = roundMoney(
      Math.max(Number(deliveryRecord?.due_amount ?? 0) - paymentAmount, 0),
    );

    const { error: deliveryError } = await supabase
      .from("delivery_records")
      .update({
        collected_amount: collectedAmount,
        due_amount: dueAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.delivery_record_id);

    if (deliveryError) {
      throw deliveryError;
    }

    await insertLedgerEntry(supabase, {
      customer_id: payment.customer_id,
      subscription_id: payment.subscription_id,
      delivery_record_id: payment.delivery_record_id,
      payment_id: payment.id,
      entry_type: "payment",
      debit: 0,
      credit: paymentAmount,
      description: "Verified online payment",
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/ledger");
}

export async function saveManualPaymentAction(
  input: ManualPaymentInput,
): Promise<MutationResult> {
  await requireUser("admin");
  const parsed = manualPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.flatten().fieldErrors.customerId?.[0] ??
        parsed.error.flatten().fieldErrors.amount?.[0] ??
        "Please complete the payment form.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const paymentStatus =
    parsed.data.paymentMethod === "cash" ? "verified" : "pending_verification";
  const paymentAmount = roundMoney(parsed.data.amount);

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      customer_id: parsed.data.customerId,
      subscription_id: parsed.data.subscriptionId || null,
      delivery_record_id: parsed.data.deliveryRecordId || null,
      rider_id: parsed.data.riderId || null,
      amount: paymentAmount,
      payment_method: parsed.data.paymentMethod,
      payment_status: paymentStatus,
      transaction_reference: parsed.data.transactionReference || null,
      notes: parsed.data.notes || null,
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (paymentError) {
    throw paymentError;
  }

  if (parsed.data.deliveryRecordId && paymentStatus === "verified") {
    const { data: deliveryRecord, error: deliveryFetchError } = await supabase
      .from("delivery_records")
      .select("collected_amount, due_amount")
      .eq("id", parsed.data.deliveryRecordId)
      .maybeSingle();

    if (deliveryFetchError) {
      throw deliveryFetchError;
    }

    const collectedAmount = roundMoney(
      Number(deliveryRecord?.collected_amount ?? 0) + paymentAmount,
    );
    const dueAmount = roundMoney(
      Math.max(Number(deliveryRecord?.due_amount ?? 0) - paymentAmount, 0),
    );

    const { error: deliveryUpdateError } = await supabase
      .from("delivery_records")
      .update({
        collected_amount: collectedAmount,
        due_amount: dueAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.deliveryRecordId);

    if (deliveryUpdateError) {
      throw deliveryUpdateError;
    }
  }

  if (paymentStatus === "verified") {
    await insertLedgerEntry(supabase, {
      customer_id: parsed.data.customerId,
      subscription_id: parsed.data.subscriptionId || null,
      delivery_record_id: parsed.data.deliveryRecordId || null,
      payment_id: payment?.id,
      entry_type: "payment",
      debit: 0,
      credit: paymentAmount,
      description: "Manual payment entry",
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/ledger");
  revalidatePath("/admin/customers");

  return buildMutationResult("/admin/payments", "Payment recorded.");
}

export async function markDeliveryAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser("rider");
  const payload = {
    deliveryRecordId: String(formData.get("deliveryRecordId") || ""),
    deliveredQty: Number(formData.get("deliveredQty") || 0),
    status: String(formData.get("status") || ""),
    paymentOutcome: String(formData.get("paymentOutcome") || ""),
    amountReceived: Number(formData.get("amountReceived") || 0),
    transactionReference: String(formData.get("transactionReference") || ""),
    notes: String(formData.get("notes") || ""),
  };

  const parsed = deliverySchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please capture delivery status, quantity, and payment outcome.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: currentRecord, error: recordError } = await supabase
    .from("delivery_records")
    .select("id, customer_id, subscription_id, expected_amount, scheduled_bottles")
    .eq("id", parsed.data.deliveryRecordId)
    .maybeSingle();

  if (recordError) {
    throw recordError;
  }

  if (!currentRecord) {
    return {
      success: false,
      message: "Delivery record was not found.",
    };
  }

  const proof = formData.get("proof");
  const proofUpload = await uploadOptionalProof(proof instanceof File ? proof : null);
  const expectedAmount = roundMoney(Number(currentRecord.expected_amount ?? 0));
  const scheduledBottles = Number(currentRecord.scheduled_bottles ?? 0);
  const chargeAmount = getChargeAmount({
    status: parsed.data.status,
    scheduledBottles,
    deliveredQty: parsed.data.deliveredQty,
    expectedAmount,
  });

  const paymentOutcomeMap: Record<
    DeliveryPaymentOutcome,
    { method: PaymentMethod; paymentStatus: string; recordStatus: string }
  > = {
    cash_received: {
      method: "cash",
      paymentStatus: "verified",
      recordStatus: "verified",
    },
    online_claimed: {
      method: "bank_transfer",
      paymentStatus: "pending_verification",
      recordStatus: "pending_verification",
    },
    credit_due: {
      method: "credit",
      paymentStatus: "received",
      recordStatus: "received",
    },
    partial_payment: {
      method: "cash",
      paymentStatus: "received",
      recordStatus: "received",
    },
  };

  const mapping = paymentOutcomeMap[parsed.data.paymentOutcome];
  const collectedAmount =
    parsed.data.paymentOutcome === "online_claimed"
      ? 0
      : parsed.data.paymentOutcome === "credit_due"
        ? 0
        : roundMoney(parsed.data.amountReceived || 0);
  const remainingDue =
    parsed.data.paymentOutcome === "online_claimed"
      ? chargeAmount
      : roundMoney(Math.max(chargeAmount - collectedAmount, 0));

  const { error: updateError } = await supabase
    .from("delivery_records")
    .update({
      delivered_bottles:
        parsed.data.status === "not_delivered" ||
        parsed.data.status === "skipped" ||
        parsed.data.status === "rescheduled"
          ? 0
          : parsed.data.deliveredQty,
      status: parsed.data.status,
      expected_amount: chargeAmount,
      collected_amount: collectedAmount,
      due_amount: remainingDue,
      delivered_at:
        parsed.data.status === "delivered" || parsed.data.status === "partially_delivered"
          ? new Date().toISOString()
          : null,
      transaction_reference: parsed.data.transactionReference || null,
      note: parsed.data.notes || null,
      proof_url: proofUpload?.publicUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.deliveryRecordId);

  if (updateError) {
    throw updateError;
  }

  const adjustmentAmount = roundMoney(Math.max(expectedAmount - chargeAmount, 0));

  if (adjustmentAmount > 0) {
    await insertLedgerEntry(supabase, {
      customer_id: currentRecord.customer_id,
      subscription_id: currentRecord.subscription_id,
      delivery_record_id: currentRecord.id,
      entry_type: "adjustment",
      debit: 0,
      credit: adjustmentAmount,
      description: "Delivery adjustment",
    });
  }

  if (
    parsed.data.paymentOutcome !== "credit_due" &&
    (collectedAmount > 0 || parsed.data.paymentOutcome === "online_claimed")
  ) {
    const paymentAmount =
      parsed.data.paymentOutcome === "online_claimed" ? chargeAmount : collectedAmount;
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        customer_id: currentRecord.customer_id,
        subscription_id: currentRecord.subscription_id,
        delivery_record_id: parsed.data.deliveryRecordId,
        rider_id: user.riderId || null,
        amount: paymentAmount,
        payment_method: mapping.method,
        payment_status: mapping.recordStatus,
        transaction_reference: parsed.data.transactionReference || null,
        proof_url: proofUpload?.publicUrl || null,
        notes: parsed.data.notes || null,
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (paymentError) {
      throw paymentError;
    }

    if (proofUpload) {
      await supabase.from("delivery_proofs").insert({
        delivery_record_id: parsed.data.deliveryRecordId,
        payment_id: payment?.id,
        storage_path: proofUpload.path,
        public_url: proofUpload.publicUrl,
      });
    }

    if (parsed.data.paymentOutcome !== "online_claimed") {
      await insertLedgerEntry(supabase, {
        customer_id: currentRecord.customer_id,
        subscription_id: currentRecord.subscription_id,
        delivery_record_id: parsed.data.deliveryRecordId,
        payment_id: payment?.id,
        entry_type: "payment",
        debit: 0,
        credit: paymentAmount,
        description: "Delivery collection",
      });
    }
  }

  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");
  revalidatePath("/rider/collections");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/ledger");

  const search = new URLSearchParams({
    amount:
      parsed.data.paymentOutcome === "online_claimed"
        ? String(chargeAmount)
        : String(collectedAmount),
    due: String(remainingDue),
    outcome: parsed.data.paymentOutcome,
  });

  return buildMutationResult(
    `/rider/deliveries/${parsed.data.deliveryRecordId}/success?${search.toString()}`,
    "Delivery recorded.",
  );
}
