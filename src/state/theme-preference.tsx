import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@theme_preference";

export type ThemePreference = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

interface ThemePreferenceContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  colorScheme: ColorScheme;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  preference: "system",
  setPreference: () => {},
  colorScheme: "light",
});

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const systemScheme = useSystemColorScheme() ?? "light";

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  const colorScheme: ColorScheme = preference === "system" ? systemScheme : preference;

  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference, colorScheme }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}
