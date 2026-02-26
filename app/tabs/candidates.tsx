import { Text, View, StyleSheet } from "react-native";

import { useThemeColor } from '@/hooks/use-theme-color';

export default function CandidateScreen() {
  //need to call these in the function
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text'); 

  return (
      <View style = {[styles.container, {backgroundColor}]}>
          <Text style = {[styles.text, {color: textColor}]}>Candidate Search</Text>
          
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
    color: 'black',
    fontSize: 30,
  },
});
