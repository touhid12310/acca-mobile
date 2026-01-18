/**
 * Number and string formatting utilities
 */

/**
 * Formats a number with thousand separators
 */
export const formatNumber = (
  value: number | string | null | undefined,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;

  return numericValue.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
};

/**
 * Formats a number as currency
 */
export const formatCurrency = (
  value: number | string | null | undefined,
  currencySymbol: string = '$',
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSign?: boolean;
  } = {}
): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSign = false,
  } = options;

  const formatted = Math.abs(numericValue).toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const sign =
    showSign && numericValue !== 0
      ? numericValue > 0
        ? '+'
        : '-'
      : numericValue < 0
      ? '-'
      : '';

  return `${sign}${currencySymbol}${formatted}`;
};

/**
 * Formats a percentage
 */
export const formatPercentage = (
  value: number | string | null | undefined,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  const { minimumFractionDigits = 0, maximumFractionDigits = 1 } = options;

  const formatted = numericValue.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return `${formatted}%`;
};

/**
 * Truncates a string to a maximum length
 */
export const truncateString = (
  str: string,
  maxLength: number,
  suffix: string = '...'
): string => {
  if (!str || str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Capitalizes the first letter of a string
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Converts a string to title case
 */
export const toTitleCase = (str: string): string => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Parses a string amount to number
 */
export const parseAmount = (value: unknown, fallback: number = 0): number => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? fallback : value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
};

/**
 * Gets initials from a name
 */
export const getInitials = (name: string, maxLength: number = 2): string => {
  if (!name) return '';

  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, maxLength)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return initials;
};
