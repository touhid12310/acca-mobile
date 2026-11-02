import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import smartlook from "../../services/smartlook";

// Fixed for the app run: null when Smartlook isn't recording.
const NativeSensitive = smartlook.sensitiveView();

/**
 * Hides its content from Smartlook session recordings (balances, amounts,
 * personal details). Renders the children unchanged when Smartlook isn't
 * recording (dev builds, Expo Go, no project key), so layout only differs by
 * the wrapper view in recorded builds — pass `style` to make the wrapper the
 * container itself.
 */
export function Sensitive({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  if (NativeSensitive) {
    return (
      <NativeSensitive isSensitive style={style}>
        {children}
      </NativeSensitive>
    );
  }
  if (style) return <View style={style}>{children}</View>;
  return <>{children}</>;
}

export default Sensitive;
