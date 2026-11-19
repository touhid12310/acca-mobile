import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, X } from "lucide-react-native";

import { Sensitive } from "../common/Sensitive";

/** A receipt link that is a PDF (the in-app viewer only shows images). */
export const isPdfReceipt = (uri?: string | null, type?: string | null): boolean => {
  if (type && type.toLowerCase() === "pdf") return true;
  if (!uri) return false;
  const path = uri.split(/[?#]/)[0].toLowerCase();
  return path.endsWith(".pdf");
};

/** PDFs (and other non-images) still open in the browser. */
export const openReceiptInBrowser = async (uri: string) => {
  try {
    await WebBrowser.openBrowserAsync(uri);
  } catch {
    // The user can try again; nothing to clean up.
  }
};

type Props = {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
};

/**
 * Full-screen, in-app view of a receipt photo (QA AE-37) — the receipt no
 * longer opens in the browser. Pinch to zoom on iPhone (Android's ScrollView
 * can't zoom; the picture fits the screen there). "Open in browser" stays as
 * a fallback if the picture can't load here.
 */
export function ReceiptViewer({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const isRemote = !!uri && /^https?:\/\//i.test(uri);

  return (
    <Modal
      visible={visible && !!uri}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <ScrollView
          style={StyleSheet.absoluteFill}
          contentContainerStyle={styles.zoomContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bouncesZoom
        >
          {uri && !failed ? (
            <Sensitive>
              <Image
                source={{ uri }}
                style={{ width, height: height - insets.top - insets.bottom - 96 }}
                resizeMode="contain"
                onLoadStart={() => {
                  setLoading(true);
                  setFailed(false);
                }}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setFailed(true);
                }}
                accessibilityLabel="Receipt image"
              />
            </Sensitive>
          ) : null}
        </ScrollView>

        {loading && !failed ? (
          <View style={styles.center} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        ) : null}

        {failed ? (
          <View style={styles.center}>
            <Text style={styles.failedText}>Couldn&apos;t show this receipt here.</Text>
            {isRemote ? (
              <Pressable onPress={() => uri && openReceiptInBrowser(uri)} hitSlop={8}>
                <View style={styles.browserButton}>
                  <ExternalLink size={16} color="#ffffff" />
                  <Text style={styles.browserLabel}>Open in browser</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Receipt</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close receipt"
          >
            <View style={styles.closeButton}>
              <X size={22} color="#ffffff" strokeWidth={2.4} />
            </View>
          </Pressable>
        </View>

        {isRemote && !failed ? (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable onPress={() => uri && openReceiptInBrowser(uri)} hitSlop={8}>
              <View style={styles.browserButton}>
                <ExternalLink size={16} color="#ffffff" />
                <Text style={styles.browserLabel}>Open in browser</Text>
              </View>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000000",
  },
  zoomContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  failedText: {
    color: "#ffffff",
    fontSize: 15,
    textAlign: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingTop: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  browserButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  browserLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ReceiptViewer;
