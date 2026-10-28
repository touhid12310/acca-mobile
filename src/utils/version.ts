/** Version numbers as the stores show them: 1.9.2, up to four parts. */
const VERSION_PATTERN = /^\d{1,4}(\.\d{1,4}){0,3}$/;

/** "1.9.2" → [1, 9, 2]; null for anything that isn't a version number. */
export const parseVersion = (value: string | null | undefined): number[] | null => {
  const text = String(value ?? '').trim();
  return VERSION_PATTERN.test(text) ? text.split('.').map(Number) : null;
};

/**
 * Compares two versions part by part (1.10.0 is newer than 1.9.2; 1.9 is the
 * same as 1.9.0): -1 when `a` is older, 0 when equal, 1 when newer. Null when
 * either is not a version number, so a typo never triggers a prompt.
 */
export const compareVersions = (a: string | null | undefined, b: string | null | undefined): -1 | 0 | 1 | null => {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return 0;
};
