/*

Root layout: The app/_layout.tsx file. 
It defines shared UI elements such as headers and tab bars so they are 
consistent between different routes.

This is the automatic definer of flow for the app and how the app 
will route when a company logs in

A stack navigator is the foundation for navigating between 
different screens in an app. On Android, a stacked route animates on top of the current screen. On iOS, a stacked route animates from the right. Expo Router provides a Stack 
component to create a navigation stack to add new routes.

only need the backslash before a route on Redirect href = "" or router.replace
*/


import { Stack } from "expo-router";
import { ProfileProvider } from "@/src/features/profile/profile.store";
import { SessionProvider } from "@/src/state/session";

export default function RootLayout() {
  //should go auto to the index screen
  return (
    <SessionProvider>
      <ProfileProvider> 
        <Stack>
          <Stack.Screen name="(companyUser)" options={{headerShown: false}}/>
        </Stack>
      </ProfileProvider>
    </SessionProvider>
  );
}
