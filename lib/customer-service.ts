import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isFuture,
  isValid,
  min,
  parseISO,
  startOfMonth,
} from "date-fns";

export type MonthOption = {
  value: string;
  label: string;
  disabled: boolean;
};

export function getMonthOptions(referenceDate = new Date()) {
  const currentMonth = startOfMonth(referenceDate);
  const year = currentMonth.getFullYear();

  return Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(year, index, 1);
    return {
      value: format(monthDate, "yyyy-MM-01"),
      label: format(monthDate, "MMMM yyyy"),
      disabled: isAfter(monthDate, currentMonth),
    } satisfies MonthOption;
  });
}

export function normalizeServiceMonth(value: string) {
  return format(startOfMonth(parseISO(value)), "yyyy-MM-01");
}

export function getServiceEndDate(billingMonth: string) {
  return format(endOfMonth(parseISO(billingMonth)), "yyyy-MM-dd");
}

export function getServiceSummary(input: {
  billingMonth?: string;
  serviceStartDate?: string;
  dailyBottleQty?: number;
  pricePerBottle?: number;
}) {
  if (!input.billingMonth || !input.serviceStartDate) {
    return null;
  }

  const billingMonth = startOfMonth(parseISO(input.billingMonth));
  const serviceStartDate = parseISO(input.serviceStartDate);

  if (!isValid(billingMonth) || !isValid(serviceStartDate)) {
    return null;
  }

  const serviceEndDate = endOfMonth(billingMonth);
  const intervalStart =
    serviceStartDate.getTime() < billingMonth.getTime() ? billingMonth : serviceStartDate;

  if (intervalStart.getTime() > serviceEndDate.getTime()) {
    return {
      remainingDays: 0,
      estimatedAmount: 0,
      serviceEndDate: format(serviceEndDate, "yyyy-MM-dd"),
      monthLabel: format(billingMonth, "MMMM yyyy"),
    };
  }

  const remainingDays = eachDayOfInterval({
    start: intervalStart,
    end: serviceEndDate,
  }).length;

  const estimatedAmount =
    remainingDays * (input.dailyBottleQty ?? 0) * (input.pricePerBottle ?? 0);

  return {
    remainingDays,
    estimatedAmount,
    serviceEndDate: format(serviceEndDate, "yyyy-MM-dd"),
    monthLabel: format(billingMonth, "MMMM yyyy"),
  };
}

export function getActiveServiceHorizon(input: {
  serviceStartDate?: string;
  serviceEndDate?: string;
  today?: Date;
}) {
  if (!input.serviceStartDate || !input.serviceEndDate) {
    return null;
  }

  const serviceStartDate = parseISO(input.serviceStartDate);
  const serviceEndDate = parseISO(input.serviceEndDate);
  const today = input.today ?? new Date();

  if (!isValid(serviceStartDate) || !isValid(serviceEndDate)) {
    return null;
  }

  const horizonEnd = min([serviceEndDate, today]);
  if (isAfter(serviceStartDate, horizonEnd)) {
    return null;
  }

  return {
    start: serviceStartDate,
    end: horizonEnd,
  };
}

export function getServiceDateKeys(input: {
  serviceStartDate?: string;
  serviceEndDate?: string;
  today?: Date;
}) {
  const horizon = getActiveServiceHorizon(input);
  if (!horizon) {
    return [];
  }

  return eachDayOfInterval(horizon).map((date) => format(date, "yyyy-MM-dd"));
}

export function getScheduledDeliveryDateKeys(input: {
  startDate?: string;
  endDate?: string | null;
  deliveryFrequency?: "daily" | "weekdays" | "custom_days";
  deliveryDays?: number[];
  windowStart?: Date;
  windowEnd?: Date;
}) {
  if (!input.startDate) {
    return [];
  }

  const startDate = parseISO(input.startDate);
  const rawEndDate = input.endDate ? parseISO(input.endDate) : null;
  const windowStart = input.windowStart ?? new Date();
  const windowEnd = input.windowEnd ?? endOfMonth(windowStart);

  if (!isValid(startDate) || !isValid(windowStart) || !isValid(windowEnd)) {
    return [];
  }

  const effectiveStart = isBefore(startDate, windowStart) ? windowStart : startDate;
  const effectiveEnd = rawEndDate && isBefore(rawEndDate, windowEnd) ? rawEndDate : windowEnd;

  if (isAfter(effectiveStart, effectiveEnd)) {
    return [];
  }

  const allowedWeekDays = new Set((input.deliveryDays ?? []).map((value) => Number(value)));
  const frequency = input.deliveryFrequency ?? "daily";

  return eachDayOfInterval({ start: effectiveStart, end: effectiveEnd })
    .filter((date) => {
      if (frequency === "daily") {
        return true;
      }

      if (frequency === "weekdays") {
        const day = date.getDay();
        return day >= 1 && day <= 5;
      }

      return allowedWeekDays.size === 0 ? true : allowedWeekDays.has(date.getDay());
    })
    .map((date) => format(date, "yyyy-MM-dd"));
}

export function canActivateCustomerToday(serviceStartDate: string) {
  const parsed = parseISO(serviceStartDate);
  return isValid(parsed) && !isFuture(parsed);
}

export function normalizeWhatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (phone.trim().startsWith("+")) {
    return digits;
  }

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (digits.startsWith("0")) {
    return `92${digits.slice(1)}`;
  }

  return digits;
}

export function buildWhatsAppUrl(phone: string) {
  const normalized = normalizeWhatsappNumber(phone);
  return normalized ? `https://wa.me/${normalized}` : undefined;
}
