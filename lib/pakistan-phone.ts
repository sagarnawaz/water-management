export const PAKISTAN_PHONE_PREFIX = "+92";
export const PAKISTAN_LOCAL_MOBILE_LENGTH = 10;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function getPakistanMobileLocalPart(value: string) {
  const digits = digitsOnly(value);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("92")) {
    return digits.slice(2, 2 + PAKISTAN_LOCAL_MOBILE_LENGTH);
  }

  if (digits.startsWith("0")) {
    return digits.slice(1, 1 + PAKISTAN_LOCAL_MOBILE_LENGTH);
  }

  return digits.slice(0, PAKISTAN_LOCAL_MOBILE_LENGTH);
}

export function sanitizePakistanMobileInput(value: string) {
  return getPakistanMobileLocalPart(value).slice(0, PAKISTAN_LOCAL_MOBILE_LENGTH);
}

export function isValidPakistanMobileLocalPart(value: string) {
  return /^3\d{9}$/.test(value);
}

export function normalizePakistanMobile(value: string) {
  const localPart = sanitizePakistanMobileInput(value);

  if (!isValidPakistanMobileLocalPart(localPart)) {
    return null;
  }

  return `${PAKISTAN_PHONE_PREFIX}${localPart}`;
}
