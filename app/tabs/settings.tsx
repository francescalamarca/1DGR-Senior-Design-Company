/*
This page will be dropdown heavy and look like the settings figma that we have set up
for the companies to be able to edit their profile theme and details

*/


import { Text, View, StyleSheet } from "react-native";

import { useThemeColor } from '@/hooks/use-theme-color';

export default function SettingsScreen() {

  //need to call these in the function
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text'); 

    return (
        <View style = {[styles.container, {backgroundColor}]}>
            <Text style = {[styles.text, {color: textColor}]}>
              Company Profile Settings
            </Text>
        </View>

    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d0d6de',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#1b1616',
    fontSize: 30,
  },
});