import { BrandFonts } from "@/src/theme/brand";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const FONTS = {
  LEXEND_REGULAR: BrandFonts.lexendRegular,
  LEXEND_LIGHT: BrandFonts.lexendLight,
  CRIMSON_REGULAR: "CrimsonText-Regular",
} as const;

export default function ReportIssueScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = ["Bug", "Account", "Billing", "Performance", "Other"];

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim() || !category) {
      Alert.alert("Missing Fields", "Please fill out all fields before submitting.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert("Report Submitted", "Thank you! We'll look into this shortly.", [
        { text: "OK", onPress: () => router.push("/(companyUser)/settings") },
      ]);
    }, 1000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(companyUser)/settings")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report an Issue</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject */}
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief summary of the issue"
          placeholderTextColor="#aaa"
          value={subject}
          onChangeText={setSubject}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the issue in detail..."
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>{submitting ? "Submitting..." : "Submit Report"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.LEXEND_REGULAR },
  body: { padding: 24, gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 14, fontFamily: FONTS.LEXEND_REGULAR },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  categoryChipSelected: { backgroundColor: "#1a1a1a", borderColor: "#1a1a1a" },
  categoryChipText: { fontSize: 13, color: "#555", fontFamily: FONTS.LEXEND_REGULAR },
  categoryChipTextSelected: { color: "#fff", fontFamily: FONTS.LEXEND_REGULAR },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#fafafa",
    fontFamily: FONTS.LEXEND_REGULAR,
  },
  textArea: { height: 140, paddingTop: 10 },
  submitBtn: {
    marginTop: 24,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 15, fontFamily: FONTS.LEXEND_REGULAR },
});