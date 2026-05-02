export function roundMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function sumMoney(values: number[]) {
  return roundMoney(values.reduce((sum, value) => sum + roundMoney(value), 0));
}

export function allocateMonthlyAmount(monthlyAmount: number, dateKeys: string[]) {
  const total = roundMoney(monthlyAmount);

  if (dateKeys.length === 0 || total <= 0) {
    return new Map(dateKeys.map((dateKey) => [dateKey, 0]));
  }

  const baseAmount = Math.floor(total / dateKeys.length);
  const remainder = total - baseAmount * dateKeys.length;
  const firstRemainderIndex = dateKeys.length - remainder;

  return new Map(
    dateKeys.map((dateKey, index) => [
      dateKey,
      baseAmount + (index >= firstRemainderIndex ? 1 : 0),
    ]),
  );
}
