import { Text, View, StyleSheet } from 'react-native';
import { FlatList } from 'react-native-reanimated/lib/typescript/Animated';
import { Link } from 'expo-router';

export default function StudioScreen() {
  return (

    <View style={styles.container}>
      <Text style={styles.text}>Company Profile</Text>
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