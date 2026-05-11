// Shared placeholder for empty / null cells across tables, cards, and
// detail views. Use this instead of "-", "N/A", or "".
export const EMPTY_PLACEHOLDER = "—"; // em dash (—)

export const placeholderIfEmpty = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined) return EMPTY_PLACEHOLDER;
  if (typeof value === "string" && value.trim() === "") return EMPTY_PLACEHOLDER;
  return String(value);
};
