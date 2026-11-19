import { getActiveTimeZone } from "./timezone";

/**
 * Calendar dates shown to people: one format everywhere — "Nov 12, 2026",
 * ranges "Nov 1 – Nov 12, 2026" — never the phone's numeric locale format
 * ("11/12/2026" reads as 11 December in Bangladesh, QA AE-47).
 *
 * A calendar date is a day, not an instant: 'YYYY-MM-DD' strings are read as
 * local midnight of that day (new Date('2026-11-12') would be UTC midnight and
 * show the 11th west of UTC), and "today" is today in the account's timezone.
 */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** 'YYYY-MM-DD' (or an ISO string starting with it) → local midnight of that day. */
export const parseDay = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Today's date in the account's timezone, as local midnight. */
export const todayInAccountZone = (timeZone?: string | null): Date => {
  const zone = timeZone || getActiveTimeZone();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);
    const year = get("year");
    const month = get("month");
    const day = get("day");
    if (year && month && day) return new Date(year, month - 1, day);
  } catch {
    // Unknown zone on this phone — fall back to the device's date.
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** "Nov 12, 2026" (or "Nov 12" without the year). */
export const formatDay = (
  value: string | Date | null | undefined,
  { withYear = true }: { withYear?: boolean } = {},
): string => {
  const date = parseDay(value);
  if (!date) return "";
  const base = `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  return withYear ? `${base}, ${date.getFullYear()}` : base;
};

/** "Nov 1 – Nov 12, 2026"; "Dec 1, 2025 – Jan 5, 2026" across years. */
export const formatDayRange = (
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): string => {
  const from = parseDay(start);
  const to = parseDay(end);
  if (!from && !to) return "";
  if (!from) return formatDay(to);
  if (!to) return formatDay(from);
  if (
    from.getFullYear() === to.getFullYear() &&
    from.getMonth() === to.getMonth() &&
    from.getDate() === to.getDate()
  ) {
    return formatDay(from);
  }
  if (from.getFullYear() === to.getFullYear()) {
    return `${formatDay(from, { withYear: false })} – ${formatDay(to)}`;
  }
  return `${formatDay(from)} – ${formatDay(to)}`;
};
