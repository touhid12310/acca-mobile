/**
 * A plain-language message for a failed apiRequest result.
 *
 * Laravel answers a bad form with `{ message: "Validation failed", errors:
 * { field: ["The field is required."] } }`. People should read the field
 * messages themselves — never "Validation failed" or "category: …" (QA
 * AE-108). Falls back to the server's own message, then to `fallback`.
 */
const GENERIC_MESSAGES = new Set([
  "validation failed",
  "the given data was invalid.",
  "request failed",
]);

export function apiErrorMessage(
  result: any,
  fallback = "Something went wrong. Please try again.",
): string {
  const body = result?.data;
  const errors = body?.errors;

  if (errors && typeof errors === "object") {
    const messages: string[] = [];
    Object.values(errors).forEach((value) => {
      const list = Array.isArray(value) ? value : [value];
      const first = list.find((item) => typeof item === "string" && item.trim());
      if (typeof first === "string" && !messages.includes(first.trim())) {
        messages.push(first.trim());
      }
    });
    if (messages.length > 0) return messages.join("\n");
  }

  const message =
    (typeof body?.message === "string" && body.message.trim()) ||
    (typeof result?.error === "string" && result.error.trim()) ||
    "";
  if (!message || GENERIC_MESSAGES.has(message.toLowerCase())) return fallback;
  return message;
}

export default apiErrorMessage;
