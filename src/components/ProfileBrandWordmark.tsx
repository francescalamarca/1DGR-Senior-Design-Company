import { Text, View } from "react-native";

const TEXT = "#202020";

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
          color: TEXT,
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
          color: TEXT,
          marginLeft: markOffsetLeft,
          marginTop: markOffsetTop,
        }}
      >
        °
      </Text>
    </View>
  );
}
