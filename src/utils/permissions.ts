import { Alert, Linking } from 'react-native';

/**
 * iOS shows a permission prompt only once; after "Don't Allow" (and on
 * Android after repeated denials) the request resolves as denied without any
 * UI. Call this when a permission comes back denied with canAskAgain false so
 * the user has a way to turn it on in the phone's Settings.
 */
export const showPermissionSettingsAlert = (title: string, message: string): void => {
  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => {
        void Linking.openSettings();
      },
    },
  ]);
};
