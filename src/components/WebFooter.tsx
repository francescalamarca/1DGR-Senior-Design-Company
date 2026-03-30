import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

const FONTS = {
  LEXEND_LIGHT: "Lexend-Light",
} as const;

const DARK = "#1a1b1d";
const WHITE = "#ffffff";

export function WebFooter({
  onSettings,
  onLogout,
}: {
  onSettings?: () => void;
  onLogout?: () => void;
}) {
  const { width } = useWindowDimensions(); //uses window dimensions that you are actively on, will adjust
  const isCompact = width < 1180;
  const pagePad = width < 1440 ? 32 : 48;

  return (
    <View
      style={{
        backgroundColor: DARK,
        paddingHorizontal: pagePad,
        paddingVertical: 40,
        flexDirection: isCompact ? "column" : "row",
        justifyContent: "space-between",
        gap: 28,
        borderTopWidth: 1,
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.LEXEND_LIGHT,
          fontSize: isCompact ? 24 : 28,
          lineHeight: isCompact ? 34 : 40,
          color: WHITE,
          maxWidth: 360,
        }}
      >
        one degree,
        {"\n"}one conversation,
        {"\n"}one connection,
        {"\n"}can change everything.
      </Text>

      <View style={{ alignItems: isCompact ? "flex-start" : "flex-end", gap: 18 }}>
        <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 32, color: WHITE }}>1DGR°</Text>
        <Pressable onPress={onSettings ?? (() => router.push("/(companyUser)/settings"))}>
          <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, letterSpacing: 1.6, color: "#aab6be" }}>
            SETTINGS
          </Text>
        </Pressable>
        <Pressable onPress={onLogout} disabled={!onLogout}>
          <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, letterSpacing: 1.6, color: "#aab6be" }}>
            LOGOUT
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
