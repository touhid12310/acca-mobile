import React from "react";
import {
  Image,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

type BrandedHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BrandedHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  style,
}: BrandedHeaderProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  };

  return (
    <LinearGradient
      colors={["#c1c957", "rgba(110, 157, 231, 0.66)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, style]}
    >
      <View style={styles.content}>
        <View style={styles.leftCluster}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={22}
                color="#102033"
              />
            </TouchableOpacity>
          )}

          <View style={styles.logoBadge}>
            <Image
              source={require("../../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.titleBlock}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text
                variant="bodySmall"
                style={styles.subtitle}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {right && <View style={styles.rightSlot}>{right}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(110, 157, 231, 0.35)",
    shadowColor: "#6e9de7",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 4,
    overflow: "hidden",
  },
  content: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  leftCluster: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.38)",
  },
  logoBadge: {
    width: 112,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.44)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    flexShrink: 0,
  },
  logo: {
    width: 96,
    height: 26,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#102033",
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(16, 32, 51, 0.72)",
    marginTop: 1,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
