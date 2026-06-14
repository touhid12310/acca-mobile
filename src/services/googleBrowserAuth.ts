import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";

import socialAuthService from "./socialAuthService";

export interface GoogleBrowserAuthResult {
  type: "success" | "cancel" | "error";
  code?: string;
  message?: string;
}

const RETURN_URL = "accounte://auth/callback";

/**
 * Browser-based Google sign-in, replacing expo-auth-session/providers/google.
 *
 * The native flow is dead on Android: Google rejects custom-scheme redirect
 * URIs on Android OAuth clients ("Access blocked … Error 400: invalid_request
 * … doesn't comply with Google's OAuth 2.0 policy"). So we run the same
 * web-client flow the SPA uses — the backend builds the Google URL (web
 * client, HTTPS redirect to the web app's /auth/callback), and that page sees
 * the `mobile-` state marker and hands the one-time code back to the app via
 * the accounte://auth/callback deep link.
 *
 * Returns the authorization code; exchange + 2FA handling live in
 * app/auth/callback.tsx, which the caller should route to with the code.
 */
export async function startGoogleBrowserAuth(
  intent: "login" | "signup",
): Promise<GoogleBrowserAuthResult> {
  // `mobile-` prefix tells the web /auth/callback page to bounce the code
  // back into the app instead of exchanging it itself.
  const state = `mobile-${Crypto.randomUUID()}`;

  const urlResult = await socialAuthService.getAuthorizationUrl({
    provider: "google",
    intent,
    state,
  });
  if (!urlResult.success || !urlResult.url) {
    return { type: "error", message: urlResult.message };
  }

  const result = await WebBrowser.openAuthSessionAsync(urlResult.url, RETURN_URL);

  if (result.type !== "success" || !result.url) {
    // 'cancel' / 'dismiss'. On Android the deep link itself may still open
    // /auth/callback — the dedup guards there handle that path.
    return { type: "cancel" };
  }

  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : undefined;
  const error = typeof queryParams?.error === "string" ? queryParams.error : undefined;
  const errorDescription =
    typeof queryParams?.error_description === "string"
      ? queryParams.error_description
      : undefined;

  if (error || !code) {
    return {
      type: "error",
      message: errorDescription || error || "Google sign-in failed",
    };
  }

  return { type: "success", code };
}

export default { startGoogleBrowserAuth };
