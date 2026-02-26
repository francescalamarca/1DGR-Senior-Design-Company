import { Text, View, StyleSheet } from 'react-native';
import { FlatList } from 'react-native-reanimated/lib/typescript/Animated';

import { useThemeColor } from '@/hooks/use-theme-color';

export default function MessageInbox() {
  //need to call these in the function
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text'); 

  return (

    <View style={[styles.container, {backgroundColor}]}>
      <Text style={[styles.text, {color: textColor}]}>Messaging</Text>
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
    color: 'white',
    fontSize: 30,
  },
});