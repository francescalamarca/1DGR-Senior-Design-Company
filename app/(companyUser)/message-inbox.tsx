/**
 * Networks Screen (Company User)
 * Placeholder template
 */

import { View, Text } from "react-native";
import KeyboardScreen from "@/src/components/KeyboardScreen";

const COLORS = {
  bg: "#fbfbfb",
  text: "#202020",
  subtext: "#464646",
} as const;

const FONTS = {
  LEXEND_REGULAR: "Lexend-Regular",
  DMMONO_LIGHT: "DMMono-Light",
} as const;

export default function MessagingScreen() {
  return (
    <KeyboardScreen
      scroll={false}
      backgroundColor={COLORS.bg}
      contentContainerStyle={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontFamily: FONTS.LEXEND_REGULAR,
          fontSize: 24,
          color: COLORS.text,
          marginBottom: 8,
        }}
      >
        Messaging
      </Text>

      <Text
        style={{
          fontFamily: FONTS.DMMONO_LIGHT,
          fontSize: 13,
          color: COLORS.subtext,
        }}
      >
        Messaging Screen Placeholder
      </Text>
    </KeyboardScreen>
  );
}