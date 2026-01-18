/**
 * Date utilities for the ACCA app
 */

/**
 * Returns today's date as an ISO date string (YYYY-MM-DD)
 */
export const todayDateInputValue = (): string => {
  return new Date().toISOString().split('T')[0];
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
  }
): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
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
 * Returns the start and end dates of the current month
 */
export const getCurrentMonthRange = (): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

/**
 * Returns the start and end dates for a given number of months back
 */
export const getDateRangeForMonths = (
  months: number
): { start: string; end: string } => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  const start = new Date(now);
  start.setMonth(start.getMonth() - months);

  return {
    start: start.toISOString().split('T')[0],
    end,
  };
};

/**
 * Parses a date string and returns a Date object
 */
export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Checks if a date string is valid
 */
export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
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
