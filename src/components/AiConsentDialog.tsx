import React, { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ExternalLink,
  LucideIcon,
  MessageSquareText,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";

import { useTheme } from "../contexts/ThemeContext";
import { gradients, radius, shadow, spacing } from "../constants/theme";
import {
  AI_PRIVACY_URL,
  answerAiConsent,
  subscribeAiConsent,
} from "../services/aiConsent";

/* What is sent and to whom (App Review 5.1.2(i)). Keep it in line with the
   Privacy Policy and the guide's ai-entry / scan-receipt pages. */
const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: MessageSquareText,
    title: "What is sent",
    text: "What you type, say or attach, plus the transactions, accounts and budgets needed for the answer.",
  },
  {
    icon: Server,
    title: "Where it goes",
    text: "To AccountE AI (run on a third-party AI provider) through our servers.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    text: "Nothing is saved to your books until you confirm it.",
  },
];

/**
 * The "Use AI features?" question, asked once per user before anything goes
 * to the AI. Opened by ensureAiConsent(); mounted once in app/_layout.
 */
export function AiConsentDialog() {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeAiConsent(setOpen), []);

  const notNow = () => answerAiConsent(false);

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={notNow}
    >
      <Pressable style={styles.backdrop} onPress={notNow}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.surface, maxHeight: height * 0.9 },
            shadow.lg,
          ]}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <LinearGradient
              colors={gradients.primary as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Sparkles size={30} color="#ffffff" strokeWidth={2.2} />
            </LinearGradient>

            <Text
              style={[styles.title, { color: colors.onSurface }]}
              accessibilityRole="header"
            >
              Use AI features?
            </Text>
            <Text style={[styles.lead, { color: colors.onSurfaceVariant }]}>
              AccountE AI answers your questions and reads receipts, SMS and
              bank statements for you.
            </Text>

            <View
              style={[
                styles.points,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: isDark ? "rgba(148,163,184,0.18)" : colors.outline,
                },
              ]}
            >
              {POINTS.map(({ icon: Icon, title, text }, index) => (
                <View
                  key={title}
                  style={[styles.point, index > 0 && styles.pointGap]}
                >
                  <View
                    style={[
                      styles.pointIcon,
                      {
                        backgroundColor: isDark ? colors.primaryContainer : "#ffffff",
                      },
                    ]}
                  >
                    <Icon size={18} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <View style={styles.pointBody}>
                    <Text
                      style={[styles.pointTitle, { color: colors.onSurface }]}
                    >
                      {title}
                    </Text>
                    <Text
                      style={[
                        styles.pointText,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* A static Pressable style: a function style collapses the
                button to its label on Android. */}
            <Pressable
              onPress={() => answerAiConsent(true)}
              accessibilityRole="button"
              style={styles.fullWidth}
            >
              {({ pressed }) => (
                <LinearGradient
                  colors={gradients.primary as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryLabel}>Agree and continue</Text>
                </LinearGradient>
              )}
            </Pressable>

            <Pressable
              onPress={notNow}
              accessibilityRole="button"
              style={styles.fullWidth}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.secondaryButton,
                    {
                      borderColor: isDark ? "rgba(148,163,184,0.35)" : "#cbd5e1",
                      backgroundColor: isDark ? "transparent" : "#f8fafc",
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.secondaryLabel, { color: colors.onSurface }]}
                  >
                    Not now
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Opens the policy without closing the question, so the user can
                come back and decide. */}
            <Pressable
              onPress={() => void Linking.openURL(AI_PRIVACY_URL)}
              accessibilityRole="link"
              hitSlop={8}
              style={styles.policyLink}
            >
              <Text style={[styles.policyText, { color: colors.primary }]}>
                Read our Privacy Policy
              </Text>
              <ExternalLink size={14} color={colors.primary} strokeWidth={2.2} />
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.xxl,
    overflow: "hidden",
  },
  content: {
    padding: spacing.xxl,
    alignItems: "center",
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  points: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  point: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  pointGap: {
    marginTop: spacing.md,
  },
  pointIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pointBody: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  pointText: {
    fontSize: 13,
    lineHeight: 18,
  },
  fullWidth: {
    width: "100%",
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  primaryButton: {
    height: 50,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  primaryLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    includeFontPadding: false,
  },
  secondaryButton: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "700",
    includeFontPadding: false,
  },
  policyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.lg,
  },
  policyText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
