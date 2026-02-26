/*
app directory: A special directory containing only routes and their layouts. 
Any files added to this directory become a screen inside our native app and a page on the web.

this file name does not add a route it points to the parent, /
a route file exports a React component as its default value. 
(It can use either .js, .jsx, .ts, or .tsx extension.)

We'll use Expo Router's Link component to navigate from the /index route to the /about route. 
It is a React component that renders a <Text> with a given href prop.

*/


import { Text, View, StyleSheet } from "react-native";
import { Link } from 'expo-router';

import { useThemeColor } from '@/hooks/use-theme-color';

export default function Index() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={[styles.container, {backgroundColor}]}>
      <Text style={[styles.text, { color:textColor }]}>Home Screen</Text>
      <Link href="/tabs/profile" style={styles.button}>
        Go to Company Profile
      </Link>
    </View>
  );
}

//this creates the style of the background that can be used for all screens if i want it via the style = in <view>
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#1a0e0e',
    fontSize: 20,
  },
  button: {
    color: '#b8a3a3',
    fontSize: 20,
    textDecorationLine: 'underline',
  },
});
