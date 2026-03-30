/**
 * HomeUserLayout (Brand Accurate)
 *
 * Bottom tabs:
 * Candiates / Networks / Explore / Camera / Profile
 *
 * Hidden routes:
 * index, settings, profile-edit, video, recording-studio, camera-ui, video-library, video-recovery
 *
 * IMPORTANT:
 * - Networks tab requires: app/(homeUser)/networks.tsx
 * - Camera tab requires: app/(homeUser)/record.tsx
 * - camera-ui stays hidden (utility route)
 */

import { RequireUserType } from "@/src/components/RequireUserType";
import { useProfile } from "@/src/features/profile/profile.store";
import { getCurrentSessionToken } from "@/src/utils/auth";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

const COLORS = {
  bg: "#fbfbfb",        // App background
  card: "#ffffff",      // Tab surface
  text: "#202020",      // Primary text
  subtext: "#464646",   // Secondary text
  inactive: "#a4a4a4",  // Placeholder/disabled
  border: "#d9d9d9",    // Dividers/borders
  accent: "#9bb4c0",    // Primary
} as const;

// ✅ MUST match EXACT keys from your useFonts(...)
const FONTS = {
  LEXEND_REGULAR: "Lexend-Regular",
  DMMONO_LIGHT: "DMMono-Light",
} as const;

export default function HomeUserLayout() {
  const { refreshProfile } = useProfile();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const loadUserData = async () => {
      try {
        const token = await getCurrentSessionToken();
        if (token) await refreshProfile(token);
      } catch (error) {
        console.error("Failed to init profile:", error);
      }
    };

    loadUserData();
  }, [refreshProfile]);

  return (
    <>
      <RequireUserType type="home" />

      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <Tabs
          initialRouteName="explore"
          screenOptions={({ route }) => ({
            headerShown: false,

            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.inactive,

            tabBarStyle: {
              backgroundColor: COLORS.card,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              elevation: 0,
              shadowOpacity: 0,
              height: 68,
            },

            tabBarItemStyle: {
              paddingBottom: 0,
              paddingTop: 0,
            },

            tabBarLabelStyle: {
              fontFamily: FONTS.LEXEND_REGULAR,
              fontSize: 11,
              letterSpacing: 0.2,
              marginBottom: 0,
              paddingBottom: 0,
            },

            tabBarIcon: ({ color, size }) => {
              const iconSize = Math.max(18, size);
              switch (route.name) {
                case "users":
                  return <Feather name="briefcase" size={iconSize} color={color} />;
                case "networks":
                  return <Feather name="users" size={iconSize} color={color} />;
                case "explore":
                  return <MaterialCommunityIcons name="earth" size={iconSize} color={color} />;
                case "record":
                  return <Feather name="video" size={iconSize} color={color} />;
                case "profile":
                  return <Feather name="user" size={iconSize} color={color} />;
                default:
                  return <Feather name="circle" size={iconSize - 2} color={color} />;
              }
            },
          })}
        >
          {/* ───────────── Hidden utility routes ───────────── */}
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="profile-edit" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="video" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="recording-studio" options={{ href: null, tabBarStyle: { display: "none" } }} />

          {/* ✅ Hidden camera utility route (NOT the bottom tab camera) */}
          <Tabs.Screen name="camera-ui" options={{ href: null, tabBarStyle: { display: "none" } }} />

          {/* Video system (hidden from bottom tabs) */}
          <Tabs.Screen name="video-library" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="video-recovery" options={{ href: null, tabBarStyle: { display: "none" } }} />

          {/* ───────────── Visible bottom tabs ───────────── */}
          <Tabs.Screen name="candidates" options={{ title: "Candidates" }} />
          <Tabs.Screen name="networks" options={{ title: "Networks" }} />
          <Tabs.Screen name="explore" options={{ title: "Explore" }} />
          <Tabs.Screen name="record" options={{ title: "Record" }} />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarStyle: Platform.OS === "web" ? { display: "none" } : undefined,
            }}
          />
        </Tabs>
      </View>
    </>
  );
}
