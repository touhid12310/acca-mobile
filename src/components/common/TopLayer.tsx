import React, { ReactNode } from 'react';
import { Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

/**
 * Lifts its children above native modal sheets on iOS. expo-router screens
 * with presentation: 'modal' (the transaction sheet) are presented by UIKit
 * above the root view, so root-level overlays such as toasts and the app lock
 * would otherwise be drawn underneath them.
 *
 * Mount it only while there is something to show: a sheet presented after it
 * mounts still covers it. Never put an RN <Modal> inside — it has no view
 * controller to present from there. Android keeps the plain view tree, where
 * native-stack modals share the root hierarchy.
 */
export function TopLayer({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'ios') return <>{children}</>;
  return <FullWindowOverlay>{children}</FullWindowOverlay>;
}
