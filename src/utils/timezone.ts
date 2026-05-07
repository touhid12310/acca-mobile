export const detectTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

let activeTimeZone: string | null = null;

export const isValidTimeZone = (timeZone?: string | null): boolean => {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const setActiveTimeZone = (timeZone?: string | null): void => {
  activeTimeZone = isValidTimeZone(timeZone) ? timeZone! : null;
};

export const getActiveTimeZone = (): string => activeTimeZone || detectTimeZone();

export const resolveUserTimeZone = (user?: {
  timezone?: string | null;
  settings?: { timezone?: string | null };
} | null): string => user?.timezone || user?.settings?.timezone || detectTimeZone();
