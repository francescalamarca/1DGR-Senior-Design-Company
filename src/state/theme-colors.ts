import { useThemePreference } from "./theme-preference";

const LIGHT = {
  bg: "#FBFBFB",
  card: "#FFFFFF",
  text: "#202020",
  subtext: "#464646",
  subtle: "#9BA1A6",
  border: "#d9d9d9",
  accent: "#9bb4c0",
  isDark: false,
} as const;

const DARK = {
  bg: "#3E424B",
  card: "#474B54",
  text: "#ECEDEE",
  subtext: "#C5C8CE",
  subtle: "#9BA1A6",
  border: "#5A5F6B",
  accent: "#9bb4c0",
  isDark: true,
} as const;

export type DynColors = typeof LIGHT;

/** Returns the correct color palette for the current theme preference. */
export function useDynColors(): DynColors {
  const { colorScheme } = useThemePreference();
  return colorScheme === "dark" ? DARK : LIGHT;
}
