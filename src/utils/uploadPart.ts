import { Platform } from 'react-native';
import { File } from 'expo-file-system';

export type LocalFile = {
  uri: string;
  name?: string | null;
  type?: string | null;
};

/**
 * A local file (photo, recording, picked document) as a FormData value that
 * `fetch` can send.
 *
 * Expo SDK 57 installs expo/fetch as the global `fetch`. It builds the
 * multipart body itself and throws "Unsupported FormDataPart implementation"
 * for React Native's `{ uri, name, type }` objects, so every upload failed —
 * chat attachments, receipt scans, voice notes, CSV files, profile photos.
 * It does accept Blobs, and expo-file-system's `File` implements Blob: the
 * part is sent with the file's name, MIME type and bytes.
 */
export function uploadPart(file: LocalFile): Blob {
  if (Platform.OS !== 'web') {
    try {
      return new File(file.uri) as unknown as Blob;
    } catch {
      // A URI File can't open: fall back to the React Native shape below.
    }
  }

  return {
    uri: file.uri,
    name: file.name ?? undefined,
    type: file.type ?? undefined,
  } as unknown as Blob;
}
