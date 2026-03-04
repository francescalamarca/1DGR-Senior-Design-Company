/**
 * HomeUserLayout (Brand Accurate)
 *
 * Bottom tabs:
 * Companies / Networks / Explore / Camera / Profile
 *
 * Hidden routes:
 * index, settings, profile-edit, video, recording-studio, camera-ui, video-library, video-recovery
 *
 * IMPORTANT:
 * - Networks tab requires: app/(homeUser)/networks.tsx
 * - Camera tab requires: app/(homeUser)/record.tsx
 * - camera-ui stays hidden (utility route)
 * 
 * 
 * The rule is: you can only call useProfile() inside a component that 
 * is a child of ProfileProvider, not in the same component that renders it.
 */
import { RequireUserType } from "@/src/components/RequireUserType";
import { useProfile } from "@/src/features/profile/profile.store";
import { getCurrentSessionToken } from "@/src/utils/auth";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";

const COLORS = {
  bg: "#fbfbfb",
  card: "#ffffff",
  text: "#202020",
  subtext: "#464646",
  inactive: "#a4a4a4",
  border: "#d9d9d9",
  accent: "#9bb4c0",
} as const;

const FONTS = {
  LEXEND_REGULAR: "Lexend-Regular",
  DMMONO_LIGHT: "DMMono-Light",
} as const;

// ✅ Moved OUTSIDE the component so it's a stable reference — prevents infinite re-render loop
const TAB_SCREEN_OPTIONS = ({ route }: { route: { name: string } }) => ({
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
  tabBarIcon: ({ color, size }: { color: string; size: number }) => {
    const iconSize = Math.max(18, size);
    switch (route.name) {
      case "candidates":
        return <Feather name="briefcase" size={iconSize} color={color} />;
      case "message-inbox":
        return <AntDesign name="message" size={iconSize} color={color} />;
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
});

export default function CompanyUserLayout() {
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
  }, []); // ✅ empty deps — didInit.current prevents double-runs

  return (
    <>
      <RequireUserType type="company" />

      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <Tabs
          initialRouteName="explore"
          screenOptions={TAB_SCREEN_OPTIONS}
        >
          {/* ───────────── Hidden utility routes ───────────── */}
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="settings" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="profile-edit" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="video" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="recording-studio" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="camera-ui" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="video-library" options={{ href: null, tabBarStyle: { display: "none" } }} />
          <Tabs.Screen name="video-recovery" options={{ href: null, tabBarStyle: { display: "none" } }} />

          {/* ───────────── Visible bottom tabs ───────────── */}
          <Tabs.Screen name="candidates" options={{ title: "Companies" }} />
          <Tabs.Screen name="message-inbox" options={{ title: "Networks" }} />
          <Tabs.Screen name="explore" options={{ title: "Explore" }} />
          <Tabs.Screen name="record" options={{ title: "Record" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
      </View>
    </>
  );
}