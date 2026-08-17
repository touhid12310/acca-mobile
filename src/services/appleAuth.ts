import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export type AppleAuthResult =
  | {
      type: 'success';
      identityToken: string;
      appleUser: string;
      fullName?: string;
    }
  | { type: 'cancel' }
  | { type: 'error'; message: string };

const formatFullName = (
  name: AppleAuthentication.AppleAuthenticationFullName | null | undefined,
): string | undefined => {
  if (!name) return undefined;
  const parts = [name.givenName, name.middleName, name.familyName].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
};

export async function startAppleAuth(): Promise<AppleAuthResult> {
  if (Platform.OS !== 'ios') {
    return { type: 'error', message: 'Sign in with Apple is only available on iPhone and iPad.' };
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { type: 'error', message: 'Sign in with Apple is not available on this device.' };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { type: 'error', message: 'Apple did not return a sign-in token.' };
    }

    return {
      type: 'success',
      identityToken: credential.identityToken,
      appleUser: credential.user,
      fullName: formatFullName(credential.fullName),
    };
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === 'ERR_CANCELED') {
      return { type: 'cancel' };
    }
    return {
      type: 'error',
      message: error?.message || 'Sign in with Apple failed',
    };
  }
}

export default { startAppleAuth };
