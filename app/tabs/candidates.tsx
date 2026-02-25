import { Text, View, StyleSheet } from "react-native";

export default function CandidateScreen() {
    return (
        <View>
            <text style = {styles.text}>Candidate Search</text>
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
