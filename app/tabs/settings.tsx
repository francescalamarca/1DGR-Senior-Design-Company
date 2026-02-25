import { Text, View, StyleSheet } from "react-native";

export default function SettingsScreen() {
    return (
        <View>
            <h1 style = {styles.text}>Company Profile Settings</h1>
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
    color: '#fff',
  },
});