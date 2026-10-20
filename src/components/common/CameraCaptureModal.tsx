import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, type CameraType } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { notifyToast } from '../../contexts/NotificationContext';
import { reportError } from '../../services/errorReporter';
import { pickFromLibrary } from '../../utils/imagePicker';
import {
  compatibleImagePickerOptions,
  uploadFileFromAsset,
  type UploadFile,
} from '../../utils/uploads';

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * A photo the user took and kept, or picked from the gallery. Called once
   * per opening — close the camera from here.
   */
  onPhoto: (photo: UploadFile) => void;
  /** Show a Gallery button for photos already on the phone. */
  allowGallery?: boolean;
};

/**
 * Full-screen camera that runs inside the app. Ask for the camera permission
 * before opening it.
 *
 * Use this rather than the phone's camera app (`launchCameraAsync`): while the
 * camera app is open AccountE sits in the background, and on phones short of
 * memory Android kills it. Tapping ✓ then restarts AccountE on Home and the
 * photo is lost.
 */
export function CameraCaptureModal({ visible, onClose, onPhoto, allowGallery = false }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* The modal unmounts this when it closes, so every opening starts fresh. */}
      <CameraScreen onClose={onClose} onPhoto={onPhoto} allowGallery={allowGallery} />
    </Modal>
  );
}

function CameraScreen({ onClose, onPhoto, allowGallery }: Omit<Props, 'visible'>) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // The shot waiting for Retake / Use photo, like the phone's own camera.
  const [shot, setShot] = useState<UploadFile | null>(null);
  // Refs, not state: a double tap lands before the re-render that disables
  // the button, and a second "Use photo" would send the receipt twice.
  const busyRef = useRef(false);
  const deliveredRef = useRef(false);

  const bottom = Math.max(insets.bottom, 20) + 12;

  const deliver = (photo: UploadFile) => {
    if (deliveredRef.current) return;
    deliveredRef.current = true;
    onPhoto(photo);
  };

  const runBusy = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const takePhoto = () =>
    runBusy(async () => {
      if (!ready) return;
      try {
        const picture = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
        if (picture?.uri) {
          // The preview is unmounted while the shot is reviewed; Retake waits
          // for it to start again.
          setReady(false);
          setShot({ uri: picture.uri, name: `photo-${Date.now()}.jpg`, type: 'image/jpeg' });
        }
      } catch (error) {
        reportError('js_error', error, { location: 'In-app camera' });
        notifyToast.error("Couldn't take the photo. Please try again.");
      }
    });

  const pickFromGallery = () =>
    runBusy(async () => {
      const result = await pickFromLibrary(compatibleImagePickerOptions);
      if (!result.canceled && result.assets[0]) {
        deliver(uploadFileFromAsset(result.assets[0], `image-${Date.now()}.jpg`));
      }
    });

  const closeButton = (
    <TouchableOpacity
      style={[styles.closeButton, { top: insets.top + 12 }]}
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel="Close camera"
    >
      <MaterialCommunityIcons name="close" size={28} color="#fff" />
    </TouchableOpacity>
  );

  if (shot) {
    return (
      <View style={styles.screen}>
        <Image
          source={{ uri: shot.uri }}
          style={styles.fill}
          resizeMode="contain"
          resizeMethod="resize"
        />
        {closeButton}
        <View style={[styles.bottomBar, styles.reviewBar, { bottom }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShot(null)}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <View style={styles.reviewIcon}>
              <MaterialCommunityIcons name="camera-retake-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deliver(shot)}
            accessibilityRole="button"
            accessibilityLabel="Use photo"
          >
            <View style={[styles.reviewIcon, styles.useIcon]}>
              <MaterialCommunityIcons name="check" size={32} color="#000" />
            </View>
            <Text style={styles.actionLabel}>Use photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={styles.fill}
        facing={facing}
        onCameraReady={() => setReady(true)}
        onMountError={({ message }) => {
          reportError('js_error', new Error(message), { location: 'In-app camera' });
          notifyToast.error("Couldn't open the camera. Please try again.");
          onClose();
        }}
      />
      {closeButton}
      <View style={[styles.bottomBar, { bottom }]}>
        {allowGallery ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={pickFromGallery}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
          >
            <MaterialCommunityIcons name="image-multiple" size={24} color="#fff" />
            <Text style={styles.actionLabel}>Gallery</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButton} />
        )}

        <TouchableOpacity
          style={[styles.captureButton, !ready && styles.captureButtonWaiting]}
          onPress={takePhoto}
          disabled={!ready || busy}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          // `ready` stays: iOS fires onCameraReady once per preview, not per lens.
          onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
        >
          <MaterialCommunityIcons name="camera-flip" size={24} color="#fff" />
          <Text style={styles.actionLabel}>Flip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  fill: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewBar: {
    justifyContent: 'space-around',
  },
  actionButton: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#fff',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  captureButtonWaiting: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  reviewIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  useIcon: {
    backgroundColor: '#fff',
  },
});
