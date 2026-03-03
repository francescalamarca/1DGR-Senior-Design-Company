import { View, Text } from "react-native";
import { RequireUserType } from "@/src/components/RequireUserType";

export default function CandidatesScreen() {
  return (
    <>
      <RequireUserType type="home" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Candidates</Text>
      </View>
    </>
  );
}