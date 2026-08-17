import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export const compatibleImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8 as const,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export type UploadFile = { uri: string; name: string; type: string };

export function uploadFileFromAsset(
  asset: { uri: string; fileName?: string | null; mimeType?: string | null },
  fallbackName = 'image.jpg',
): UploadFile {
  let name = asset.fileName || fallbackName;
  let type = (asset.mimeType || '').toLowerCase();

  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    /\.heic$/i.test(name) ||
    /\.heif$/i.test(name)
  ) {
    name = name.replace(/\.(heic|heif)$/i, '.jpg');
    if (!/\.jpe?g$/i.test(name)) {
      name = `${name.replace(/\.[^.]+$/, '')}.jpg`;
    }
    type = 'image/jpeg';
  }

  if (!type) {
    const ext = name.split('.').pop()?.toLowerCase();
    type =
      ext === 'png'
        ? 'image/png'
        : ext === 'pdf'
          ? 'application/pdf'
          : ext === 'csv'
            ? 'text/csv'
            : 'image/jpeg';
  }

  let uri = asset.uri;
  if (Platform.OS === 'ios' && uri && !uri.includes('://')) {
    uri = `file://${uri}`;
  }

  return { uri, name, type };
}
