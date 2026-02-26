import { Text, View, StyleSheet } from 'react-native';
import { FlatList } from 'react-native-reanimated/lib/typescript/Animated';
import { Link } from 'expo-router';

import { useThemeColor } from '@/hooks/use-theme-color';


//this gets the theme colors from the constants folder so uniform throughout

export default function StudioScreen() {
  //need to call these in the function
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text'); 

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>Company Profile</Text>
      <Link href="/tabs/settings" style={styles.button}>
        Go to Settings
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
  },
  button: {
    color: '#b8a3a3',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});