import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import regions from "../../constants/currencyRegions.json";
import { useTheme } from "../../contexts/ThemeContext";
import { detectTimeZone, normalizeTimeZone } from "../../utils/timezone";
import { NativeTextInput as TextInput } from "../ui/SafeTextInput";

/**
 * Searchable time-zone list (QA AE-66) — used by Profile and onboarding
 * instead of a free-text box. The list is the API's own (PHP's
 * timezone_identifiers_list): every zone in the bundled tz → country map minus
 * the old alias names the API refuses, plus UTC.
 */

const zoneCountries = (regions as { zones: Record<string, string> }).zones;

let cachedZones: string[] | null = null;
export const timeZoneList = (): string[] => {
  if (cachedZones) return cachedZones;
  const zones = new Set<string>(["UTC"]);
  Object.keys(zoneCountries).forEach((zone) => {
    if (normalizeTimeZone(zone) === zone) zones.add(zone);
  });
  cachedZones = Array.from(zones).sort();
  return cachedZones;
};

const offsetCache = new Map<string, string>();

/** "GMT+6", "GMT+5:30", "GMT−3", "GMT" — the zone's offset right now. */
export const timeZoneOffset = (timeZone: string): string => {
  const cached = offsetCache.get(timeZone);
  if (cached !== undefined) return cached;
  let label = "";
  try {
    const now = new Date();
    now.setSeconds(0, 0);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now);
    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
    );
    const minutes = Math.round((asUtc - now.getTime()) / 60000);
    if (Number.isFinite(minutes)) {
      if (minutes === 0) label = "GMT";
      else {
        const sign = minutes > 0 ? "+" : "−";
        const abs = Math.abs(minutes);
        const hours = Math.floor(abs / 60);
        const rest = abs % 60;
        label = `GMT${sign}${hours}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
      }
    }
  } catch {
    label = "";
  }
  offsetCache.set(timeZone, label);
  return label;
};

/** "Asia/Dhaka (GMT+6)" for a field showing the picked zone. */
export const timeZoneLabel = (timeZone?: string | null): string => {
  if (!timeZone) return "";
  const offset = timeZoneOffset(timeZone);
  return offset ? `${timeZone} (${offset})` : timeZone;
};

const cityOf = (zone: string) =>
  (zone.split("/").pop() || zone).replace(/_/g, " ");

const regionOf = (zone: string) => {
  const parts = zone.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join(" / ").replace(/_/g, " ") : "";
};

type Props = {
  visible: boolean;
  value?: string | null;
  onSelect: (timeZone: string) => void;
  onClose: () => void;
  title?: string;
};

export function TimeZonePicker({
  visible,
  value,
  onSelect,
  onClose,
  title = "Time zone",
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const zones = useMemo(() => timeZoneList(), []);
  const deviceZone = useMemo(() => normalizeTimeZone(detectTimeZone()), []);
  const selected = value ? normalizeTimeZone(value) : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/[\s_]+/g, " ");
    if (!q) return zones;
    // Offsets cost an Intl call per zone, so they are only searched when the
    // query looks like one ("gmt+6", "+5:30").
    const offsetQuery = /^(gmt|utc)|^[+\-−]?\d/.test(q);
    const offsetNeedle = q.replace(/^utc/, "gmt").replace(/-/g, "−");
    return zones.filter((zone) => {
      const name = `${zone.replace(/_/g, " ")} ${zoneCountries[zone] || ""}`.toLowerCase();
      if (name.includes(q)) return true;
      return offsetQuery && timeZoneOffset(zone).toLowerCase().includes(offsetNeedle);
    });
  }, [query, zones]);

  const close = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  const pick = useCallback(
    (zone: string) => {
      setQuery("");
      onSelect(zone);
    },
    [onSelect],
  );

  const renderRow = ({ item }: { item: string }) => {
    const isSelected = item === selected;
    const region = regionOf(item);
    return (
      <Pressable
        onPress={() => pick(item)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        {/* Row layout on an inner View (Android drops a Pressable's own
            flex-row style in some builds). */}
        <View
          style={[
            styles.row,
            isSelected && { backgroundColor: colors.primaryContainer },
          ]}
        >
          <View style={styles.rowText}>
            <Text
              style={[styles.city, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {cityOf(item)}
            </Text>
            <Text
              style={[styles.region, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {region ? `${region} · ${item}` : item}
            </Text>
          </View>
          <Text style={[styles.offset, { color: colors.onSurfaceVariant }]}>
            {timeZoneOffset(item)}
          </Text>
          {isSelected ? (
            <MaterialCommunityIcons name="check" size={18} color={colors.primary} />
          ) : (
            <View style={styles.checkSpacer} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* A Modal is its own window, so the app's keyboard handling doesn't
          reach it: pad for the keyboard here on both platforms. */}
      <KeyboardAvoidingView behavior="padding" style={styles.avoider}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.outlineVariant,
                paddingBottom: 12 + insets.bottom,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.onSurface }]}>
                {title}
              </Text>
              <Pressable
                onPress={close}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search a city, region or GMT offset"
              placeholderTextColor={colors.onSurfaceVariant}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[
                styles.search,
                {
                  color: colors.onSurface,
                  borderColor: colors.outlineVariant,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            />

            {!query.trim() && zones.includes(deviceZone) ? (
              <Pressable onPress={() => pick(deviceZone)} accessibilityRole="button">
                <View
                  style={[styles.deviceRow, { borderColor: colors.outlineVariant }]}
                >
                  <MaterialCommunityIcons
                    name="cellphone-marker"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.deviceText, { color: colors.primary }]}
                    numberOfLines={2}
                  >
                    Use this phone's time zone · {timeZoneLabel(deviceZone)}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              renderItem={renderRow}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={20}
              windowSize={8}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>
                  No time zone matches "{query.trim()}"
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avoider: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
    height: "75%",
    flexShrink: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontWeight: "700" },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  deviceText: { flex: 1, fontSize: 13.5, fontWeight: "600" },
  list: { flexGrow: 1, flexShrink: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rowText: { flex: 1, minWidth: 0 },
  city: { fontSize: 14.5, fontWeight: "600" },
  region: { fontSize: 12, marginTop: 1 },
  offset: { fontSize: 12.5, fontWeight: "600" },
  checkSpacer: { width: 18 },
  empty: { fontSize: 13, textAlign: "center", paddingVertical: 18 },
});

export default TimeZonePicker;
