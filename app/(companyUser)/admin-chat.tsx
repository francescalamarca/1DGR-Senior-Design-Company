import { BrandFonts } from "@/src/theme/brand";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const FONTS = {
  LEXEND_REGULAR: BrandFonts.lexendRegular,
  LEXEND_LIGHT: BrandFonts.lexendLight,
  CRIMSON_REGULAR: "CrimsonText-Regular",
} as const;

type Message = { id: string; text: string; from: "user" | "admin"; time: string };

const getTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function AdminChatScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      text: "Hi! How can we help you today?",
      from: "admin",
      time: getTime(),
    },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: input.trim(), from: "user", time: getTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const adminMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for reaching out! An admin will respond shortly.",
        from: "admin",
        time: getTime(),
      };
      setMessages((prev) => [...prev, adminMsg]);
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 1000);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(companyUser)/settings")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Admin Chat</Text>
          <Text style={styles.headerSub}>We typically reply within a few hours</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubbleWrap, msg.from === "user" ? styles.bubbleWrapUser : styles.bubbleWrapAdmin]}
          >
            <View style={[styles.bubble, msg.from === "user" ? styles.bubbleUser : styles.bubbleAdmin]}>
              <Text style={[styles.bubbleText, msg.from === "user" && styles.bubbleTextUser]}>{msg.text}</Text>
            </View>
            <Text style={styles.bubbleTime}>{msg.time}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#aaa"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerSub: { fontSize: 11, color: "#999", marginTop: 1, fontFamily: FONTS.LEXEND_REGULAR },
  messageList: { padding: 16, gap: 12 },
  bubbleWrap: { maxWidth: "75%" },
  bubbleWrapUser: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubbleWrapAdmin: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { backgroundColor: "#1a1a1a", borderBottomRightRadius: 4 },
  bubbleAdmin: { backgroundColor: "#f0f0f0", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: "#1a1a1a", fontFamily: FONTS.LEXEND_REGULAR },
  bubbleTextUser: { color: "#fff", fontFamily: FONTS.LEXEND_REGULAR },
  bubbleTime: { fontSize: 10, color: "#aaa", marginTop: 3, fontFamily: FONTS.LEXEND_REGULAR },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: "#fafafa",
    fontFamily: FONTS.LEXEND_REGULAR,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
});