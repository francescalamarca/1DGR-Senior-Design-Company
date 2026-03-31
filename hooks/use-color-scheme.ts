import { useThemePreference } from "@/src/state/theme-preference";

/**
 * Returns the active color scheme, respecting the user's stored preference
 * (light/dark/system). Uses the system scheme when preference is 'system'.
 */
export function useColorScheme() {
  const { colorScheme } = useThemePreference();
  return colorScheme;
}
