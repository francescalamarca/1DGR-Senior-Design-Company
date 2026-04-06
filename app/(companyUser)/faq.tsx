import { BrandFonts } from "@/src/theme/brand";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const FONTS = {
  LEXEND_REGULAR: BrandFonts.lexendRegular,
  LEXEND_LIGHT: BrandFonts.lexendLight,
  CRIMSON_REGULAR: "CrimsonText-Regular",
} as const;

function LText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.LEXEND_REGULAR }, style]} />;
}
function LLText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.LEXEND_LIGHT }, style]} />;
}

const FAQ_ITEMS = [
  {
    id: "1",
    question: "How do I update my profile information?",
    answer:
      "Go to Settings & Privacy and open the Account section. Tap Edit next to Account Information to update your email, phone number, and URLs. Once done, tap Save at the top right to apply your changes.",
  },
  {
    id: "2",
    question: "How do I switch between light and dark mode?",
    answer:
      "Open Settings & Privacy and expand the Profile Display section. You'll see a Light and Dark toggle — tap whichever you prefer and it will apply immediately.",
  },
  {
    id: "3",
    question: "Who can see my contact information?",
    answer:
      "Only the information you choose to make public is visible to others. You can control which fields are shown — such as email, phone number, and URLs — from the Account section in Settings & Privacy.",
  },
  {
    id: "4",
    question: "How do I report a bug or technical issue?",
    answer:
      "Head to Settings & Privacy, open the Support section, and tap Report an Issue. Fill out the category, subject, and description, then tap Submit Report. Our team will review it as soon as possible.",
  },
  {
    id: "5",
    question: "How do I contact an admin directly?",
    answer:
      "You can reach an admin by going to Settings & Privacy, opening the Support section, and tapping Chat with Admin. Type your message and an admin will respond within a few hours.",
  },
  {
    id: "6",
    question: "How do I delete my account?",
    answer:
      "Go to Settings & Privacy, open the Support section, and tap Delete Account. You'll be asked to confirm before anything is deleted. Please note this action is permanent and cannot be undone.",
  },
  {
    id: "7",
    question: "Is my data secure?",
    answer:
      "Yes. We take data security seriously. Your information is encrypted in transit and at rest. We never sell your personal data to third parties.",
  },
  {
    id: "9",
    question: "What happens if I forget my password?",
    answer:
      "On the login screen, tap Forgot Password and enter your email address. You'll receive a reset link shortly. If you don't see it, check your spam folder.",
  },
  {
    id: "10",
    question: "How do I sign out of my account?",
    answer:
      "You can sign out from your profile page. Look for the sign out option in the menu. You'll be returned to the login screen and your session will be ended on this device.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);

  const height = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight || 0] }),
    [progress, contentHeight]
  );
  const opacity = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    [progress]
  );
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [open]);

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.questionRow}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <LText style={styles.questionText}>{question}</LText>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={16} color="#555" />
        </Animated.View>
      </TouchableOpacity>

      {/* Hidden measurer */}
      <View
        style={styles.measurer}
        pointerEvents="none"
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h !== contentHeight) setContentHeight(h);
        }}
      >
        <LLText style={styles.answerText}>{answer}</LLText>
      </View>

      {/* Animated answer */}
      <Animated.View style={{ height, overflow: "hidden", opacity }}>
        <LLText style={styles.answerText}>{answer}</LLText>
      </Animated.View>
    </View>
  );
}

export default function FAQScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(companyUser)/settings")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} />
        </TouchableOpacity>
        <LText style={styles.headerTitle}>FAQ</LText>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <LLText style={styles.subtitle}>
          Frequently asked questions. Tap a question to expand the answer.
        </LLText>
        {FAQ_ITEMS.map((item, index) => (
          <View key={item.id}>
            <FAQItem question={item.question} answer={item.answer} />
            {index < FAQ_ITEMS.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
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
  headerTitle: { fontSize: 18 },
  body: {
    padding: 20,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 20,
    lineHeight: 18,
  },
  faqItem: {
    paddingVertical: 4,
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  questionText: {
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
    lineHeight: 20,
  },
  answerText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    paddingBottom: 12,
  },
  measurer: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e0e0e0",
  },
});