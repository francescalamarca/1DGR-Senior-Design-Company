/*
This is camera functionality and will be more complex, we will have to
figure out how to get access to device camera, approve it, and save it to the
database/profile once it is taken and saved

features: 
- record button
- save button
- retake/delete button
- ability to replay it over again to watch it back
- next step should be able to choose the cover for the video, maybe this is in profile settings?

*/


import { Text, View, StyleSheet } from "react-native";

import { useThemeColor } from '@/hooks/use-theme-color';

export default function Camera() {

  //need to call these in the function
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text'); 

    return (
        <View style = {[styles.container, {backgroundColor}]}>
            <Text style = {[styles.text, {color: textColor}]}>
              Camera Shooting Studio
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