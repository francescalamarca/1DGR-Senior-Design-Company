/*

For this page I want to implement infinite scrolling which is basically
where the user can continue to scroll through all information
until they have reached the end of the page.

*/

import { Text, View, StyleSheet } from 'react-native';
import { FlatList } from 'react-native-reanimated/lib/typescript/Animated';
import { Link } from 'expo-router';

import { useThemeColor } from '@/hooks/use-theme-color'; //gets theme from the set theme for the app

export default function ProfileScreen() {

  //need to call these in the function
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text'); 

  return (

    <View style={[styles.container, {backgroundColor}]}>
      <Text style={[styles.text, {color: textColor}]}>Company Profile</Text>
      <Link href="/tabs/settings" style={styles.button}>
          Go to Settings
        </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d0d6de',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'black',
  },
  button: {
    color: '#b8a3a3',
    fontSize: 20,
    textDecorationLine: 'underline',
  },
});