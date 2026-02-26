/*

THIS FOLDER acts as a grouping for all the tabs that will be displayed
in the bottom tab bar

this file particularly will be used to define the bottom tab bar,
sep. from root layout folder (by path)

*/

import { Tabs } from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';

//getting the ionicons from the website: https://ionic.io/ionicons 
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#efefed',
        headerStyle: {
            backgroundColor: '#25292e', //applies to the header label
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        tabBarStyle: {
            backgroundColor: '#25292e', //applies to the tab bar style
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={24}/>
          ),
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
            title: 'Studio',
            tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} color={color} size={24}/>
          ),
        }}
      />
        <Tabs.Screen
        name = "candidates"
        options = {{
          title: "Candidate Page",
          tabBarIcon: ({color, focused}) =>(
            <Ionicons name={focused ? 'people':'people-outline'} color = {color} size = {24} />
          )
        }}
        />
        <Tabs.Screen
        name = "message-inbox"
        options = {{
          title: "Message Page",
          tabBarIcon: ({color, focused}) =>(
            <Ionicons name={focused ? 'people':'people-outline'} color = {color} size = {24} />
          )
        }}
        />
        <Tabs.Screen
        name = "settings"
        options = {{
          title: "Settings",
          href: null, //this makes it so that you can't see the settings page
          tabBarIcon: ({color, focused}) =>(
            <Ionicons name={focused ? 'cog':'cog-outline'} color = {color} size = {24} />
          )
        }}
        />
        <Tabs.Screen
        name = "camera"
        options = {{
          title: "Camera",
          href: null, //this makes it so that you can't see the settings page
          tabBarIcon: ({color, focused}) =>(
            <Ionicons name={focused ? 'camera':'camera-outline'} color = {color} size = {24} />
          )
        }}
        />
    </Tabs>
  );
};