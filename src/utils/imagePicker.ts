import * as ImagePicker from 'expo-image-picker';

import { notifyToast } from '../contexts/NotificationContext';
import { reportError } from '../services/errorReporter';

const CANCELED: ImagePicker.ImagePickerResult = { canceled: true, assets: null };

/**
 * Android can recreate the app's activity in the background (low memory, or
 * returning from the browser), leaving expo-image-picker holding a launcher
 * from the old one: "Attempting to launch an unregistered
 * ActivityResultLauncher". A second try a moment later usually lands on the
 * new activity.
 */
const isStaleLauncher = (error: unknown) =>
  error instanceof Error && /unregistered ActivityResultLauncher/i.test(error.message);

const launchSafely = async (
  launch: () => Promise<ImagePicker.ImagePickerResult>,
  what: string,
): Promise<ImagePicker.ImagePickerResult> => {
  try {
    return await launch();
  } catch (first) {
    if (isStaleLauncher(first)) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      try {
        return await launch();
      } catch {
        // Fall through to the message below.
      }
    } else {
      reportError('js_error', first, { location: `ImagePicker ${what}` });
    }
    notifyToast.error(
      isStaleLauncher(first)
        ? `Couldn't open ${what}. Please try again. If it keeps happening, close and reopen AccountE.`
        : `Couldn't open ${what}. Please try again.`,
    );
    return CANCELED;
  }
};

/** `launchImageLibraryAsync` that never rejects; a failure reads as a cancel. */
export const pickFromLibrary = (options?: ImagePicker.ImagePickerOptions) =>
  launchSafely(() => ImagePicker.launchImageLibraryAsync(options), 'your photos');

/**
 * `launchCameraAsync` that never rejects; a failure reads as a cancel.
 *
 * Prefer `CameraCaptureModal`: this opens the phone's camera app, and Android
 * can kill AccountE in the background meanwhile — tapping ✓ then restarts the
 * app on Home and the photo is lost.
 */
export const takeWithCamera = (options?: ImagePicker.ImagePickerOptions) =>
  launchSafely(() => ImagePicker.launchCameraAsync(options), 'the camera');
