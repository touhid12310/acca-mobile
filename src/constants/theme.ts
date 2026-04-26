/**
 * Design tokens for the finance-app UI kit.
 * Use these with useTheme().colors for color values.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const shadow = {
  none: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sm: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
} as const;

/**
 * Brand gradient palette — used for hero balance cards, primary CTAs, onboarding.
 * Pairs are [from, to] for LinearGradient.
 */
export const gradients = {
  primary: ["#6366f1", "#8b5cf6"],
  primaryDark: ["#4f46e5", "#7c3aed"],
  // Hero card gradient for dark mode — same navy family as the AI insights
  // card, lifted a couple shades so it reads as an elevated card rather than
  // blending into the background.
  primaryNight: ["#1e3a64", "#16294a"],
  success: ["#10b981", "#059669"],
  danger: ["#ef4444", "#dc2626"],
  warning: ["#f59e0b", "#d97706"],
  info: ["#0ea5e9", "#0284c7"],
  // Align with app dark gradient (top → bottom of main bg)
  hero: ["#0f213d", "#122a48", "#0b1830"],
  heroAccent: ["#6366f1", "#8b5cf6", "#ec4899"],
  mint: ["#34d399", "#10b981"],
  sunset: ["#f472b6", "#fb923c"],
  ocean: ["#0ea5e9", "#6366f1"],
} as const;

export const typography = {
  displayLarge: { fontSize: 34, fontWeight: "800" as const, letterSpacing: -0.5 },
  display: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.3 },
  h1: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.2 },
  h2: { fontSize: 20, fontWeight: "700" as const },
  h3: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  captionStrong: { fontSize: 13, fontWeight: "600" as const },
  micro: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5 },
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type Shadow = keyof typeof shadow;
export type GradientKey = keyof typeof gradients;
