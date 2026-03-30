import { View, Text } from "react-native";
import { RequireUserType } from "@/src/components/RequireUserType";
import { useDynColors } from "@/src/state/theme-colors";

export default function CandidatesScreen() {
  const C = useDynColors();
  return (
    <>
      <RequireUserType type="home" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg }}>
        <Text style={{ color: C.text, fontSize: 24, fontFamily: "Lexend-Regular" }}>Candidates</Text>
      </View>
    </>
  );
}