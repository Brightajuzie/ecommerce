/**
 * Semantic color tokens for light/dark mode. Every screen's StyleSheet
 * should pull colors from here (via useThemedStyles) instead of hardcoding
 * hex literals, so the whole app repaints consistently when the user
 * switches modes. Brand colors (primary/secondary — the green accents from
 * admin-configurable AppSettings) live in ThemeContext, not here, since they
 * stay constant across both modes; these tokens are the neutral UI palette
 * that actually differs between light and dark.
 */
export interface ThemeColors {
  /** Page/screen background. */
  background: string;
  /** Card/sheet background, one step "up" from background. */
  surface: string;
  /** Secondary surface — chips, input fills, stepper backgrounds. */
  surfaceAlt: string;
  /** Default hairline border. */
  border: string;
  /** Slightly more visible border (dashed upload boxes, dividers). */
  borderStrong: string;
  /** Primary heading/body text. */
  text: string;
  /** Slightly softer than `text` — secondary emphasis. */
  textSecondary: string;
  /** Muted meta text/icons (labels, timestamps, captions). */
  textMuted: string;
  /** Faintest text/icons (placeholders, disabled). */
  textFaint: string;
  /** Destructive actions/errors. */
  danger: string;
  /** Success/confirmation. */
  success: string;
  /** Warning/pending. */
  warning: string;
  /** Modal/sheet backdrop. */
  overlay: string;
  /** Image placeholder fill (behind product photos before they load). */
  placeholderBg: string;
  /** Card drop-shadow opacity — shadows read as near-invisible on dark
   *  backgrounds, so dark mode leans on `border` for definition instead. */
  shadowOpacity: number;
}

export const lightColors: ThemeColors = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F6",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  text: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  danger: "#DC2626",
  success: "#059669",
  warning: "#D97706",
  overlay: "rgba(17, 24, 39, 0.5)",
  placeholderBg: "#F0FDF4",
  shadowOpacity: 0.05,
};

export const darkColors: ThemeColors = {
  background: "#0C0F0D",
  surface: "#171C19",
  surfaceAlt: "#212823",
  border: "#2B332D",
  borderStrong: "#3C463E",
  text: "#F3F4F6",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",
  textFaint: "#6B7280",
  danger: "#F87171",
  success: "#34D399",
  warning: "#FBBF24",
  overlay: "rgba(0, 0, 0, 0.7)",
  placeholderBg: "#132218",
  shadowOpacity: 0.4,
};
