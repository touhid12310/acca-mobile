/**
 * Whether the user has seen an error during this app session.
 *
 * Dependency-free on purpose: the toast system sets it and the rating prompt
 * reads it, and neither should have to import the other (or everything the
 * other pulls in) to share one boolean.
 */
let hadError = false;

export const markSessionError = (): void => {
  hadError = true;
};

export const clearSessionError = (): void => {
  hadError = false;
};

export const sessionHadError = (): boolean => hadError;
