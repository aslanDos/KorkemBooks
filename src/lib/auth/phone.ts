const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 15;

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length >= PHONE_DIGITS_MIN && digits.length <= PHONE_DIGITS_MAX) return `+${digits}`;

  return null;
}

export function formatPhone(value: string) {
  if (!/^\+7\d{10}$/.test(value)) return value;
  return `+7 (${value.slice(2, 5)}) ${value.slice(5, 8)}-${value.slice(8, 10)}-${value.slice(10, 12)}`;
}

export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const nationalNumber = (digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits).slice(0, 10);
  if (!nationalNumber) return "+7";

  const areaCode = nationalNumber.slice(0, 3);
  let formatted = `+7 (${areaCode}`;
  if (areaCode.length === 3) formatted += ")";

  const firstPart = nationalNumber.slice(3, 6);
  if (firstPart) formatted += ` ${firstPart}`;

  const secondPart = nationalNumber.slice(6, 8);
  if (secondPart) formatted += `-${secondPart}`;

  const thirdPart = nationalNumber.slice(8, 10);
  if (thirdPart) formatted += `-${thirdPart}`;

  return formatted;
}
