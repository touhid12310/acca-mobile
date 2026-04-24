import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

/**
 * Full-screen dark backdrop matching web CSS:
 * radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 32%),
 * radial-gradient(circle at top right, rgba(99, 102, 241, 0.12), transparent 28%),
 * linear-gradient(180deg, #0f213d 0%, #0b1830 100%)
 */
export function AppDarkBackground() {
  const { width, height } = useWindowDimensions();
  const rMax = Math.max(width, height);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#0f213d", "#0b1830"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="appBgTopLeft"
            cx={0}
            cy={0}
            r={rMax * 0.55}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="rgb(59, 130, 246)" stopOpacity={0.12} />
            <Stop offset="0.32" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id="appBgTopRight"
            cx={width}
            cy={0}
            r={rMax * 0.5}
            gradientUnits="userSpaceOnUse"
          >
            <Stop
              offset="0"
              stopColor="rgb(99, 102, 241)"
              stopOpacity={0.12}
            />
            <Stop
              offset="0.28"
              stopColor="rgb(99, 102, 241)"
              stopOpacity={0}
            />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#appBgTopLeft)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#appBgTopRight)" />
      </Svg>
    </View>
  );
}
