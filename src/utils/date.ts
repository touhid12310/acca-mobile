/**
 * Date utilities for the AccountE app
 */
import { getActiveTimeZone } from './timezone';

/**
 * Converts a Date object to local date input value (YYYY-MM-DD)
 */
export const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns today's date as an ISO date string (YYYY-MM-DD)
 */
export const todayDateInputValue = (): string => {
  return toDateInputValue(new Date());
};

/**
 * Formats a date string for display
 */
export const formatDate = (
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  timeZone?: string
): string => {
  try {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    const date = dateOnlyMatch
      ? new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3])
        )
      : new Date(dateString);
    return date.toLocaleDateString(undefined, {
      ...options,
      ...(!dateOnlyMatch ? { timeZone: timeZone || getActiveTimeZone() } : {}),
    });
  } catch {
    return dateString;
  }
};

/**
 * Formats a date as relative time (e.g., "2 days ago")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
};

/**
 * How old a transaction row is, for lists like Home's Recent activity.
 *
 * A row dated today says how long ago it was added ("5 minutes ago", from
 * its `created_at` timestamp). Older rows count whole calendar days from
 * their date ("Yesterday", "3 days ago"). The calendar date itself is never
 * read as a time: the API sends it as UTC midnight, which made a row added a
 * minute ago read "6 hours ago" (QA AE-20).
 */
export const formatTransactionAge = (
  date: string,
  createdAt?: string | null
): string => {
  const day = parseCalendarDate(date);
  if (Number.isNaN(day.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const diffDays = Math.round((today.getTime() - dayStart.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return formatDate(toDateInputValue(dayStart), { month: 'short', day: 'numeric' });
  }

  if (diffDays === 0) {
    const created = createdAt ? new Date(createdAt) : null;
    if (
      created &&
      !Number.isNaN(created.getTime()) &&
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate() &&
      created.getTime() <= now.getTime() + 60_000
    ) {
      return formatRelativeTime(createdAt as string);
    }
    return 'Today';
  }

  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 28) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.max(1, Math.floor(diffDays / 30));
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

/**
 * Returns the start and end dates of the current month
 */
export const getCurrentMonthRange = (): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
};

/**
 * Returns the start and end dates for a given number of months back
 */
export const getDateRangeForMonths = (
  months: number
): { start: string; end: string } => {
  const now = new Date();
  const end = toDateInputValue(now);

  const start = new Date(now);
  start.setMonth(start.getMonth() - months);

  return {
    start: toDateInputValue(start),
    end,
  };
};

/**
 * Parses a date string and returns a Date object
 */
export const parseDate = (dateString: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
  }
  return new Date(dateString);
};

/**
 * Reads a calendar date (transaction, due, target or opened date) as local
 * midnight of that day. The API sends these as 'YYYY-MM-DD' or as UTC
 * midnight ('2026-10-22T00:00:00.000000Z'); new Date() on either lands on the
 * previous day for anyone west of UTC. Not for real timestamps (created_at).
 */
export const parseCalendarDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
};

/**
 * Checks if a date string is valid
 */
export const isValidDate = (dateString: string): boolean => {
  const date = parseDate(dateString);
  return !isNaN(date.getTime());
};

/**
 * Returns the month name from a date string
 */
export const getMonthName = (
  dateString: string,
  format: 'long' | 'short' = 'long'
): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: format });
};

/**
 * Returns the year from a date string
 */
export const getYear = (dateString: string): number => {
  return new Date(dateString).getFullYear();
};
