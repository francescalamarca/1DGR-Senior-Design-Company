/**
 * KeyboardScreen (src/components/KeyboardScreen.tsx)
 * - Shared screen wrapper that standardizes: SafeArea, optional sticky header, optional ScrollView,
 *   and an optional fixed bottomBar that can hide when the keyboard is visible.
 * - Uses a KeyboardAvoidingView by default (configurable) so forms/layouts behave consistently on iOS/Android.
 * - Exposes a `scrollRef` prop so parent screens can imperatively scroll (e.g., scrollTo top on focus).
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

type KeyboardScreenProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  scroll?: boolean;

  /** ✅ NEW: allow parent screens to control ScrollView (scrollTo, etc.) */
  scrollRef?: React.RefObject<ScrollView | null>;

  contentBottomPadding?: number;
  bottomBar?: React.ReactNode;
  hideBottomBarOnKeyboard?: boolean;
  backgroundColor?: string;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  keyboardVerticalOffset?: number;
  safeAreaEdges?: Edge[];

  /** ✅ allow disabling KAV when you position stuff manually */
  enableKeyboardAvoidingView?: boolean;
};

/**
 * - Cross-platform keyboard visibility hook.
 * - Listens to show/hide events and returns a boolean used to hide UI (e.g., bottom bars) while typing.
 */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
}

export default function KeyboardScreen({
  children,
  header,
  scroll = false,
  scrollRef, // ✅ NEW
  contentBottomPadding = 0,
  bottomBar,
  hideBottomBarOnKeyboard = true,
  backgroundColor = "#fff",
  contentContainerStyle,
  style,
  keyboardVerticalOffset,
  safeAreaEdges,
  enableKeyboardAvoidingView = true,
}: KeyboardScreenProps) {
    /** Tracks whether the keyboard is open to conditionally hide bottomBar. */
  const keyboardVisible = useKeyboardVisible();

  const kavBehavior = useMemo(() => {
    if (Platform.OS === "ios") return "padding" as const;
    return "height" as const;
  }, []);

    /** Allows screens with sticky headers to offset KAV so content doesn't jump under the header. */
  const kavOffset = useMemo(() => {
    if (typeof keyboardVerticalOffset === "number") return keyboardVerticalOffset;
    return 0;
  }, [keyboardVerticalOffset]);

    /** Decides whether the fixed bottomBar should render (and whether it hides during keyboard). */
  const shouldShowBottomBar = !!bottomBar && (!hideBottomBarOnKeyboard || !keyboardVisible);
    /** Adds extra bottom padding so scrollable content isn't hidden behind the bottomBar. */
  const autoBottomPad = shouldShowBottomBar ? 90 : 0;

  const Body = (
    <>
      {header ? <View>{header}</View> : null}

      {scroll ? (
        <ScrollView
          ref={scrollRef} // ✅ attach the parent's ref here
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            { paddingBottom: Math.max(contentBottomPadding, autoBottomPad) },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentContainerStyle]}>{children}</View>
      )}

      {shouldShowBottomBar ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>{bottomBar}</View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={[{ flex: 1, backgroundColor }, style]}>
      {enableKeyboardAvoidingView ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={kavBehavior}
          keyboardVerticalOffset={kavOffset}
        >
          {Body}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>{Body}</View>
      )}
    </SafeAreaView>
  );
}
