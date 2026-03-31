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
  text: "#FFFFFF",
  subtext: "#E0E3E8",
  subtle: "#C8CDD5",
  border: "#5A5F6B",
  accent: "#9bb4c0",
  isDark: true,
} as const;

export type DynColors = {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  subtle: string;
  border: string;
  accent: string;
  isDark: boolean;
};

/** Returns the correct color palette for the current theme preference. */
export function useDynColors(): DynColors {
  const { colorScheme } = useThemePreference();
  return colorScheme === "dark" ? DARK : LIGHT;
}