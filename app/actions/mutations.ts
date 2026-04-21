"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { normalizeServiceMonth } from "@/lib/customer-service";
import { requireUser } from "@/lib/auth/session";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cancelPendingSubscriptionOrders, syncCustomerSubscriptionOrders } from "@/services/subscription-sync";
import type { DeliveryPaymentOutcome, PaymentMethod } from "@/types/domain";
import { customerSchema, type CustomerInput } from "@/validations/customer";
import { deliverySchema } from "@/validations/delivery";
import { orderSchema, type OrderInput } from "@/validations/order";
import { manualPaymentSchema, type ManualPaymentInput } from "@/validations/payment";
import { riderSchema, type RiderInput } from "@/validations/rider";

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

async function uploadOptionalProof(file: File | null) {
  if (!file || file.size === 0 || !hasSupabaseEnv()) {
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
  return data.publicUrl;
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
        "Please check the customer form.",
    };
  }

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    const normalizedBillingMonth = normalizeServiceMonth(parsed.data.billingMonth);
    const normalizedServiceStartDate = format(
      parseISO(parsed.data.serviceStartDate),
      "yyyy-MM-dd",
    );
    const serviceEndDate = format(
      endOfMonth(startOfMonth(parseISO(normalizedBillingMonth))),
      "yyyy-MM-dd",
    );
    const isActive = parsed.data.serviceStatus === "active";
    const payload = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      alternate_phone: parsed.data.alternatePhone || null,
      address: parsed.data.address,
      area: parsed.data.area,
      daily_bottle_qty: parsed.data.dailyBottleQty,
      price_per_bottle: parsed.data.pricePerBottle,
      default_payment_method: parsed.data.paymentMethod,
      assigned_rider_id: parsed.data.assignedRiderId || null,
      billing_month: normalizedBillingMonth,
      service_start_date: normalizedServiceStartDate,
      service_end_date: serviceEndDate,
      activated_at: isActive ? new Date().toISOString() : null,
      is_active: isActive,
      notes: parsed.data.notes || null,
    };

    let customerId = parsed.data.id;
    if (parsed.data.id) {
      await supabase.from("customers").update(payload).eq("id", parsed.data.id);
    } else {
      const { data: createdCustomer } = await supabase
        .from("customers")
        .insert(payload)
        .select("id")
        .single();

      customerId = createdCustomer?.id;
    }

    if (customerId) {
      if (isActive) {
        await syncCustomerSubscriptionOrders({
          customerId,
        });
      } else {
        await cancelPendingSubscriptionOrders(customerId);
      }
    }
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  revalidatePath("/rider");
  revalidatePath("/rider/deliveries");

  return buildMutationResult(
    "/admin/customers",
    parsed.data.id ? "Customer updated." : "Customer created.",
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

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    const payload = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      vehicle_number: parsed.data.vehicleNumber,
      status: parsed.data.status,
    };

    if (parsed.data.id) {
      await supabase.from("riders").update(payload).eq("id", parsed.data.id);
    } else {
      await supabase.from("riders").insert(payload);
    }
  }

  revalidatePath("/admin/riders");

  return buildMutationResult(
    "/admin/riders",
    parsed.data.id ? "Rider updated." : "Rider added.",
  );
}

export async function saveOrderAction(input: OrderInput): Promise<MutationResult> {
  const user = await requireUser("admin");
  const parsed = orderSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please complete all order steps before saving.",
    };
  }

  const totalAmount = parsed.data.bottleQty * parsed.data.pricePerBottle;
  const now = new Date().toISOString();

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    let customerId = parsed.data.customerId;

    if (!customerId) {
      const { data: createdCustomer } = await supabase
        .from("customers")
        .insert({
          name: parsed.data.newCustomerName,
          phone: parsed.data.newCustomerPhone,
          address: parsed.data.newCustomerAddress,
          area: parsed.data.newCustomerArea,
        })
        .select("id")
        .single();

      customerId = createdCustomer?.id;
    }

    const orderPayload = {
      customer_id: customerId,
      rider_id: parsed.data.riderId,
      bottle_qty: parsed.data.bottleQty,
      price_per_bottle: parsed.data.pricePerBottle,
      total_amount: totalAmount,
      delivery_date: parsed.data.deliveryDate,
      notes: parsed.data.notes || null,
      order_status: parsed.data.id ? undefined : "assigned",
      expected_payment_method: parsed.data.expectedPaymentMethod,
      payment_status:
        parsed.data.expectedPaymentMethod === "credit" ? "due" : "unpaid",
      created_by: user.id,
      updated_at: now,
    };

    if (parsed.data.id) {
      await supabase.from("orders").update(orderPayload).eq("id", parsed.data.id);
    } else {
      const { data: createdOrder } = await supabase
        .from("orders")
        .insert({
          ...orderPayload,
          created_at: now,
        })
        .select("id")
        .single();

      if (createdOrder?.id && customerId) {
        await supabase.from("ledger_entries").insert({
          customer_id: customerId,
          order_id: createdOrder.id,
          entry_type: "order",
          debit: totalAmount,
          credit: 0,
          description: "Order created",
        });
      }
    }
  }

  revalidatePath("/admin/orders");

  return buildMutationResult(
    "/admin/orders",
    parsed.data.id ? "Order updated." : "Order created and assigned.",
  );
}

export async function cancelOrderAction(orderId: string) {
  await requireUser("admin");

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("orders")
      .update({
        order_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  }

  revalidatePath("/admin/orders");
  return buildMutationResult("/admin/orders", "Order cancelled.");
}

export async function cancelOrderFormAction(orderId: string) {
  await cancelOrderAction(orderId);
}

export async function reviewPaymentAction(
  paymentId: string,
  decision: "verified" | "rejected",
) {
  const user = await requireUser("admin");

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from("payments")
      .update({
        payment_status: decision,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
  }

  revalidatePath("/admin/payments");
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

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();
    const paymentStatus =
      parsed.data.paymentMethod === "cash" ? "verified" : "pending_verification";

    const { data: payment } = await supabase
      .from("payments")
      .insert({
        order_id: parsed.data.orderId || null,
        customer_id: parsed.data.customerId,
        rider_id: parsed.data.riderId || null,
        amount: parsed.data.amount,
        payment_method: parsed.data.paymentMethod,
        payment_status: paymentStatus,
        transaction_reference: parsed.data.transactionReference || null,
        notes: parsed.data.notes || null,
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    await supabase.from("ledger_entries").insert({
      customer_id: parsed.data.customerId,
      payment_id: payment?.id,
      order_id: parsed.data.orderId || null,
      entry_type: "payment",
      debit: 0,
      credit: parsed.data.amount,
      description: "Manual payment entry",
    });
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/ledger");

  return buildMutationResult("/admin/payments", "Payment recorded.");
}

export async function markDeliveryAction(formData: FormData): Promise<MutationResult> {
  const user = await requireUser("rider");
  const payload = {
    orderId: String(formData.get("orderId") || ""),
    deliveredQty: Number(formData.get("deliveredQty") || 0),
    paymentOutcome: String(formData.get("paymentOutcome") || ""),
    amountReceived: Number(formData.get("amountReceived") || 0),
    transactionReference: String(formData.get("transactionReference") || ""),
    notes: String(formData.get("notes") || ""),
  };

  const parsed = deliverySchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please capture delivery quantity and payment outcome.",
    };
  }

  const proof = formData.get("proof");
  const proofUrl = await uploadOptionalProof(proof instanceof File ? proof : null);
  const totalAmount = Number(formData.get("totalAmount") || 0);
  const remainingDue = Math.max(totalAmount - (parsed.data.amountReceived || 0), 0);

  const paymentOutcomeMap: Record<
    DeliveryPaymentOutcome,
    { method: PaymentMethod; orderPaymentStatus: string; recordStatus: string }
  > = {
    cash_received: {
      method: "cash",
      orderPaymentStatus: "paid",
      recordStatus: "verified",
    },
    online_claimed: {
      method: "bank_transfer",
      orderPaymentStatus: "verification_pending",
      recordStatus: "pending_verification",
    },
    unpaid_due: {
      method: "credit",
      orderPaymentStatus: "due",
      recordStatus: "received",
    },
    partial_payment: {
      method: "cash",
      orderPaymentStatus: "partial",
      recordStatus: "received",
    },
  };

  const mapping = paymentOutcomeMap[parsed.data.paymentOutcome];

  if (hasSupabaseEnv()) {
    const supabase = await createServerSupabaseClient();

    await supabase
      .from("orders")
      .update({
        delivered_qty: parsed.data.deliveredQty,
        amount_received:
          parsed.data.paymentOutcome === "online_claimed"
            ? 0
            : parsed.data.amountReceived || 0,
        due_amount: remainingDue,
        payment_status: mapping.orderPaymentStatus,
        order_status: "delivered",
        transaction_reference: parsed.data.transactionReference || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.orderId);

    if (
      parsed.data.paymentOutcome !== "unpaid_due" &&
      (parsed.data.amountReceived || parsed.data.paymentOutcome === "online_claimed")
    ) {
      const { data: payment } = await supabase
        .from("payments")
        .insert({
          order_id: parsed.data.orderId,
          customer_id: String(formData.get("customerId")),
          rider_id: user.riderId || null,
          amount:
            parsed.data.paymentOutcome === "online_claimed"
              ? totalAmount
              : parsed.data.amountReceived || 0,
          payment_method: mapping.method,
          payment_status: mapping.recordStatus,
          transaction_reference: parsed.data.transactionReference || null,
          proof_url: proofUrl,
          notes: parsed.data.notes || null,
          received_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      await supabase.from("ledger_entries").insert({
        customer_id: String(formData.get("customerId")),
        order_id: parsed.data.orderId,
        payment_id: payment?.id,
        entry_type: "payment",
        debit: 0,
        credit:
          parsed.data.paymentOutcome === "online_claimed"
            ? totalAmount
            : parsed.data.amountReceived || 0,
        description: "Delivery collection",
      });
    }
  }

  revalidatePath("/rider");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");

  const search = new URLSearchParams({
    amount:
      parsed.data.paymentOutcome === "online_claimed"
        ? String(totalAmount)
        : String(parsed.data.amountReceived || 0),
    due: String(remainingDue),
    outcome: parsed.data.paymentOutcome,
  });

  return buildMutationResult(
    `/rider/deliveries/${parsed.data.orderId}/success?${search.toString()}`,
    "Delivery recorded.",
  );
}
