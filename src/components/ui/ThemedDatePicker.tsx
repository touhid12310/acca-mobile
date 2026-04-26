import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { gradients, radius, shadow, spacing } from "../../constants/theme";
import { Button } from "./Button";

interface ThemedDatePickerProps {
  visible: boolean;
  value: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  title?: string;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function ThemedDatePicker({
  visible,
  value,
  onCancel,
  onConfirm,
  minDate,
  maxDate,
  title = "Select date",
}: ThemedDatePickerProps) {
  const { colors, isDark } = useTheme();
  const [draft, setDraft] = useState<Date>(value);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const headerGradient = (isDark
    ? gradients.primaryNight
    : gradients.primary) as any;

  React.useEffect(() => {
    if (visible) {
      setDraft(value);
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [visible, value]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const list: { date: Date; inMonth: boolean }[] = [];

    // Leading days from previous month
    const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthLast - i);
      list.push({ date: d, inMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      list.push({ date: new Date(viewYear, viewMonth, i), inMonth: true });
    }
    // Trailing days to fill 6 rows of 7
    while (list.length < 42) {
      const d = new Date(viewYear, viewMonth + 1, list.length - daysInMonth - startWeekday + 1);
      list.push({ date: d, inMonth: false });
    }
    return list;
  }, [viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isDisabled = (d: Date) => {
    if (minDate && startOfDay(d) < startOfDay(minDate)) return true;
    if (maxDate && startOfDay(d) > startOfDay(maxDate)) return true;
    return false;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface },
            shadow.lg,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <LinearGradient
            colors={headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerCaption}>{title}</Text>
            <Text style={styles.headerYear}>{draft.getFullYear()}</Text>
            <Text style={styles.headerDate}>
              {draft.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </LinearGradient>

          {/* Month nav */}
          <View style={styles.monthNav}>
            <Pressable
              onPress={goPrev}
              hitSlop={10}
              style={[
                styles.navBtn,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <ChevronLeft
                size={18}
                color={colors.onSurface}
                strokeWidth={2.4}
              />
            </Pressable>
            <Text style={[styles.monthTitle, { color: colors.onSurface }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable
              onPress={goNext}
              hitSlop={10}
              style={[
                styles.navBtn,
                { backgroundColor: colors.surfaceVariant },
              ]}
            >
              <ChevronRight
                size={18}
                color={colors.onSurface}
                strokeWidth={2.4}
              />
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, i) => (
              <Text
                key={i}
                style={[
                  styles.weekday,
                  { color: colors.onSurfaceVariant },
                ]}
              >
                {w}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map(({ date, inMonth }, idx) => {
              const isSelected = sameDay(date, draft);
              const isToday = sameDay(date, today);
              const disabled = isDisabled(date);
              const dayColor = isSelected
                ? colors.onPrimary
                : !inMonth
                  ? colors.onSurfaceVariant + "70"
                  : disabled
                    ? colors.onSurfaceVariant + "70"
                    : colors.onSurface;
              return (
                <Pressable
                  key={idx}
                  disabled={disabled}
                  onPress={() => setDraft(startOfDay(date))}
                  style={styles.cell}
                  hitSlop={2}
                >
                  <View
                    style={[
                      styles.dayWrap,
                      isSelected && {
                        backgroundColor: colors.primary,
                      },
                      !isSelected &&
                        isToday && {
                          borderColor: colors.primary,
                          borderWidth: 1.5,
                        },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: dayColor,
                          fontWeight: isSelected || isToday ? "800" : "600",
                        },
                      ]}
                      allowFontScaling={false}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Footer buttons */}
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={onCancel}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Select"
                variant="primary"
                onPress={() => onConfirm(draft)}
                fullWidth
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    borderRadius: radius.xxl,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerCaption: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerYear: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  headerDate: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 2,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  weekdayRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingTop: 4,
    paddingBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
