/*

- there is only one user on our end so I will not have session information
- also will not have login functionality - merged changes with 1DGR will be functional, visual, and flow for COMPANY SIDE
- that block of code is blocked out here

*/

import { View, Text, Pressable } from "react-native"; //will use this on login functionality and possibly on flow
import { router } from "expo-router";
import { useSession } from "@/src/state/session";
import { RequireUserType } from "@/src/components/RequireUserType";
import { useDynColors } from "@/src/state/theme-colors";

export default function ExploreScreen() {
  const C = useDynColors();
  // const { logout } = useSession(); //no requirement for type will need this back

  return (
    <>
      <RequireUserType type="home" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: C.bg }}>
        <Text style={{ fontSize: 24, marginBottom: 12, color: C.text, fontFamily: "Lexend-Regular" }}>Explore</Text>

        {/* <Pressable
          onPress={() => {
            logout();
            router.replace("/(auth)/login");
          }}
        >
          <Text>Logout</Text>
        </Pressable> */}
      </View>
    </>
  );
}