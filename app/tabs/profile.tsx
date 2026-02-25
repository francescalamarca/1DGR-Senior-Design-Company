/*

For this page I want to implement infinite scrolling which is basically
where the user can continue to scroll through all information
until they have reached the end of the page.

*/

import { Text, View, StyleSheet } from 'react-native';
import { FlatList } from 'react-native-reanimated/lib/typescript/Animated';

export default function ProfileScreen() {
  return (

    <View style={styles.container}>
      <Text style={styles.text}>Company Profile</Text>
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
});