import { Text, TextProps } from "react-native";
import { Fonts } from "./typography";
/** Large titles (names, screen headers) */
export function Title(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: Fonts.title }, props.style]}
    />
  );
}

/** Section headers / subheaders */
export function Subheader(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: Fonts.sub }, props.style]}
    />
  );
}

/** Bold subheaders */
export function SubheaderBold(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: Fonts.subBold }, props.style]}
    />
  );
}

/** Normal paragraph text */
export function Body(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: Fonts.body }, props.style]}
    />
  );
}

/** Small technical / detail text */
export function Detail(props: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: Fonts.mono }, props.style]}
    />
  );
}