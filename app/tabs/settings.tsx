import { Text, View, StyleSheet } from "react-native";

export default function SettingsScreen() {
    return (
        <View>
            <text style = {styles.text}>
              Company Profile Settings
              </text>
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
    color: '#1b1616',
    fontSize: 30,
  },
});