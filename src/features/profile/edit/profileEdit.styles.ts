// src/features/profile/edit/profileEdit.styles.ts
import { Platform, StyleSheet } from "react-native";
import { useProfileEditController } from "./useProfileEditController";


export const FONTS = {
  LEXEND_LIGHT: "Lexend-Light",
  LEXEND_REGULAR: "Lexend-Regular",
  CRIMSON_REGULAR: "CrimsonText-Regular",
  DM_MONO_LIGHT: "DMMono-Light",
  HOOK_REGULAR: "Hook-Regular",
} as const;

export const MODAL_KB_OFFSET_IOS = 12;
export const MODAL_LIST_BOTTOM_PADDING = Platform.OS === "ios" ? 280 : 320;

export const UI = {
  bg: "#FBFBFB",
  card: "#FFFFFF",
  text: "#111111",
  subtext: "rgba(17,17,17,0.62)",
  border: "#E7E7E7",
  borderStrong: "#D9D9D9",
  danger: "#B00020",
  radius: 14,
  radiusInput: 12,
  padX: 18,
  sectionTop: 32,
  inputHeight: 48,
  inputPadX: 14,
  inputPadY: 12,
  headerHeight: 72,
  hint: "#c5d4da",
} as const;

export const styles = StyleSheet.create({
  header: {
    height: UI.headerHeight,
    paddingHorizontal: UI.padX,
    justifyContent: "center",
    backgroundColor: UI.card,
    borderBottomWidth: 1,
    borderBottomColor: UI.border,
  },
  headerTitle: { fontSize: 20, textAlign: "center", color: UI.text },
  headerAction: { position: "absolute", zIndex: 2 },
  headerLeft: { left: UI.padX },
  headerRight: { right: UI.padX },

  content: { paddingHorizontal: UI.padX, paddingTop: 16, paddingBottom: 40 },

  sectionTitle: { marginTop: UI.sectionTop, fontSize: 15.5, color: UI.text, letterSpacing: 0.5 },
  sectionHelper: { marginTop: 7, fontSize: 12, color: UI.subtext, letterSpacing: 0.2 },

  label: { marginBottom: 8, fontSize: 13, color: UI.text },
  fieldStack: { marginTop: 12 },
  twoColRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  col: { flex: 1 },
  full: { marginTop: 12 },

  input: {
    height: UI.inputHeight,
    borderWidth: 1,
    borderColor: UI.borderStrong,
    borderRadius: UI.radiusInput,
    paddingHorizontal: UI.inputPadX,
    backgroundColor: UI.card,
    fontFamily: FONTS.LEXEND_LIGHT,
    fontSize: 16,
    color: UI.text,
    fontWeight: "300",
  },
  inputMultiline: {
    borderWidth: 1,
    borderColor: UI.borderStrong,
    borderRadius: UI.radiusInput,
    paddingHorizontal: UI.inputPadX,
    paddingVertical: UI.inputPadY,
    backgroundColor: UI.card,
    fontFamily: FONTS.LEXEND_LIGHT,
    fontSize: 16,
    color: UI.text,
    minHeight: 120,
    textAlignVertical: "top",
    fontWeight: "300",
  },

  card: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: UI.radius,
    overflow: "hidden",
    backgroundColor: UI.card,
  },

  rowPressable: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: UI.card,
  },
  rowDivider: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    height: 1,
    backgroundColor: UI.border,
  },
  rowTitle: { fontSize: 15, color: UI.text },
  rowSub: { marginTop: 6, fontSize: 12, color: UI.subtext },
  chevron: { fontSize: 18, opacity: 0.5 },

  pill: {
    borderWidth: 1,
    borderColor: UI.text,
    backgroundColor: UI.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  inlineCard: {
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: UI.radius,
    padding: 14,
    backgroundColor: UI.card,
    gap: 8,
  },
});