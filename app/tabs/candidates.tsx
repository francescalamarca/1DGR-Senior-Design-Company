import { Text, View, StyleSheet } from "react-native";

export default function CandidateScreen() {
    return (
        <View>
            <h1 style = {styles.text}>Candidate Search</h1>
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
  },
});
