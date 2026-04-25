import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { useTheme } from "../../contexts/ThemeContext";
import { radius, shadow, spacing } from "../../constants/theme";

export type PeriodPreset =
  | "this_month"
  | "last_month"
  | "3m"
  | "6m"
  | "1y"
  | "5y"
  | "all"
  | "custom_month"
  | "custom_range";

export type PeriodRange = {
  preset: PeriodPreset;
  label: string;
  start: Date;
  end: Date;
};

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
  { key: "all", label: "All time" },
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const fmtDate = (d: Date) =>
  `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

export function computePeriodRange(
  preset: PeriodPreset,
  opts?: { anchorMonth?: { year: number; month: number }; start?: Date; end?: Date },
): PeriodRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const startOfMonth = (year: number, month: number) => new Date(year, month, 1);
  const endOfMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0, 23, 59, 59, 999);
  const monthLabel = (d: Date) =>
    `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;

  switch (preset) {
    case "this_month":
      return {
        preset,
        label: "This month",
        start: startOfMonth(y, m),
        end: endOfMonth(y, m),
      };
    case "last_month":
      return {
        preset,
        label: "Last month",
        start: startOfMonth(y, m - 1),
        end: endOfMonth(y, m - 1),
      };
    case "3m":
      return {
        preset,
        label: "Last 3 months",
        start: startOfMonth(y, m - 2),
        end: endOfMonth(y, m),
      };
    case "6m":
      return {
        preset,
        label: "Last 6 months",
        start: startOfMonth(y, m - 5),
        end: endOfMonth(y, m),
      };
    case "1y":
      return {
        preset,
        label: "Last 12 months",
        start: startOfMonth(y, m - 11),
        end: endOfMonth(y, m),
      };
    case "5y":
      return {
        preset,
        label: "Last 5 years",
        start: startOfMonth(y - 5, m + 1),
        end: endOfMonth(y, m),
      };
    case "all":
      return {
        preset,
        label: "All time",
        start: new Date(2000, 0, 1),
        end: endOfMonth(y, m),
      };
    case "custom_month": {
      const am = opts?.anchorMonth;
      if (!am) return computePeriodRange("this_month");
      const start = startOfMonth(am.year, am.month);
      const end = endOfMonth(am.year, am.month);
      return { preset, label: monthLabel(start), start, end };
    }
    case "custom_range": {
      const start = opts?.start ?? startOfMonth(y, m);
      const end = opts?.end ?? endOfMonth(y, m);
      return {
        preset,
        label: `${fmtDate(start)} – ${fmtDate(end)}`,
        start,
        end,
      };
    }
  }
}

const formatRangeText = (range: PeriodRange) =>
  `${fmtDate(range.start)} – ${fmtDate(range.end)}`;

interface PeriodModalProps {
  visible: boolean;
  onClose: () => void;
  current: PeriodRange;
  onSelect: (range: PeriodRange) => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function PeriodModal({
  visible,
  onClose,
  current,
  onSelect,
}: PeriodModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pickerMode, setPickerMode] = useState<"none" | "start" | "end">("none");

  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 420,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 280,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.6, 0],
  });
  const backdropOpacity = progress;

  const recentMonths = useMemo(() => {
    const now = new Date();
    const arr: { year: number; month: number; label: string }[] = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return arr;
  }, []);

  const isActiveMonth = (year: number, month: number) => {
    if (current.preset !== "custom_month") return false;
    return (
      current.start.getFullYear() === year &&
      current.start.getMonth() === month
    );
  };

  const handlePreset = (key: PeriodPreset) =>
    onSelect(computePeriodRange(key));

  const handleMonth = (year: number, month: number) =>
    onSelect(
      computePeriodRange("custom_month", { anchorMonth: { year, month } }),
    );

  const handleDateChange = (which: "start" | "end") => (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (Platform.OS === "android") setPickerMode("none");
    if (event.type === "dismissed" || !selected) return;

    const start = which === "start" ? selected : current.start;
    let end = which === "end" ? selected : current.end;
    if (end < start) end = start;
    onSelect(computePeriodRange("custom_range", { start, end }));
  };

  const isCustomRange = current.preset === "custom_range";

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + spacing.xl,
              transform: [{ translateY }],
            },
            shadow.lg,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.outline }]} />
          <Text style={[styles.title, { color: colors.onSurface }]}>
            Select period
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Quick preset chips */}
            <View style={styles.chipWrap}>
              {PRESETS.map((p) => {
                const active = current.preset === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => handlePreset(p.key)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active ? colors.primary : colors.onSurface,
                          fontWeight: active ? "700" : "600",
                        },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Recent months */}
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
            >
              By month
            </Text>
            <View style={styles.chipWrap}>
              {recentMonths.map((rm) => {
                const active = isActiveMonth(rm.year, rm.month);
                return (
                  <Pressable
                    key={`${rm.year}-${rm.month}`}
                    onPress={() => handleMonth(rm.year, rm.month)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primaryContainer
                          : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active ? colors.primary : colors.onSurface,
                          fontWeight: active ? "700" : "600",
                        },
                      ]}
                    >
                      {rm.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom range */}
            <Text
              style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
            >
              Custom date range
            </Text>
            <View style={styles.rangeRow}>
              <Pressable
                onPress={() => setPickerMode("start")}
                style={[
                  styles.dateField,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: isCustomRange ? colors.primary : "transparent",
                  },
                ]}
              >
                <Text
                  style={[styles.dateLabel, { color: colors.onSurfaceVariant }]}
                >
                  From
                </Text>
                <Text
                  style={[styles.dateValue, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {fmtDate(current.start)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPickerMode("end")}
                style={[
                  styles.dateField,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: isCustomRange ? colors.primary : "transparent",
                  },
                ]}
              >
                <Text
                  style={[styles.dateLabel, { color: colors.onSurfaceVariant }]}
                >
                  To
                </Text>
                <Text
                  style={[styles.dateValue, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {fmtDate(current.end)}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.applyBar}>
            <Pressable onPress={onClose}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.applyBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.applyBtnText}>Apply</Text>
                </View>
              )}
            </Pressable>
          </View>

          {pickerMode !== "none" && (
            <DateTimePicker
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              value={pickerMode === "start" ? current.start : current.end}
              onChange={handleDateChange(pickerMode)}
              maximumDate={pickerMode === "start" ? current.end : undefined}
              minimumDate={pickerMode === "end" ? current.start : undefined}
            />
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: "85%",
    gap: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    alignSelf: "center",
    marginBottom: 6,
    opacity: 0.5,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: {
    fontSize: 12.5,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  rangeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: 1,
  },
  dateLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dateValue: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  applyBar: {
    paddingTop: spacing.md,
  },
  applyBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
