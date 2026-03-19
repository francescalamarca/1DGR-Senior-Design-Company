/*

For this page I want to implement infinite scrolling which is basically
where the user can continue to scroll through all information
until they have reached the end of the page.

*/

import { StyleSheet, Text, View } from 'react-native';

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