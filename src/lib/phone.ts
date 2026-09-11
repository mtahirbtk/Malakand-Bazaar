/** Pakistani mobile numbers are 10 digits after the country code, starting with 3. */
const PK_MOBILE = /^3\d{9}$/;

export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+92")) digits = digits.slice(3);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!PK_MOBILE.test(digits)) return null;
  return `+92${digits}`;
}

export function formatPhoneDisplay(e164: string): string {
  const d = e164.replace(/^\+92/, "");
  return `+92 ${d.slice(0, 3)} ${d.slice(3)}`;
}

/**
 * Wraps a phone number in Unicode isolates so it renders left-to-right even
 * inside Urdu (RTL) text. Without this, "+92 300 1234567" displays as
 * "1234567 300 92+".
 */
export function isolateLtr(text: string): string {
  return `\u2066${text}\u2069`;
}
