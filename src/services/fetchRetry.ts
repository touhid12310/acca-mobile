/**
 * expo/fetch (the global fetch since Expo SDK 57) can refuse a request before
 * sending anything: "fetch failed: Call to function 'NativeRequest.start' has
 * been rejected" (caused by "Cannot convert provided JavaScriptObject to the
 * SharedObject, because it doesn't contain valid id"). The native side lost
 * the request object it had just made. Nothing reached the network, so one
 * more try with a fresh request is safe for every method, uploads included.
 *
 * Installed before installErrorReporting(), so the reporter only sees the
 * error when the second try fails too.
 */

const NOT_STARTED = /NativeRequest\.start' has been rejected/;

let installed = false;

export function installFetchRetry(): void {
  if (installed || typeof globalThis.fetch !== 'function') return;
  installed = true;

  const send = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await send(input, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!NOT_STARTED.test(message) || init?.signal?.aborted) throw error;
      return send(input, init);
    }
  }) as typeof fetch;
}
