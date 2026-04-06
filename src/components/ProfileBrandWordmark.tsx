import { Text, View } from "react-native";
import { useDynColors } from "@/src/state/theme-colors";

type Props = {
  fontFamily: string;
  size: number;
  markSize: number;
  letterSpacing?: number;
  markOffsetTop?: number;
  markOffsetLeft?: number;
  containerOffsetTop?: number;
  containerOffsetLeft?: number;
};

export function ProfileBrandWordmark({
  fontFamily,
  size,
  markSize,
  letterSpacing = -0.3,
  markOffsetTop = 0,
  markOffsetLeft = 2,
  containerOffsetTop = 0,
  containerOffsetLeft = 0,
}: Props) {
  const C = useDynColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "center",
        marginTop: containerOffsetTop,
        marginLeft: containerOffsetLeft,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: size,
          color: C.text,
          letterSpacing,
        }}
      >
        1DGR
      </Text>
      <Text
        style={{
          fontFamily,
          fontSize: markSize,
          lineHeight: markSize + 2,
          color: C.text,
          marginLeft: markOffsetLeft,
          marginTop: markOffsetTop,
        }}
      >
        °
      </Text>
    </View>
  );
}
