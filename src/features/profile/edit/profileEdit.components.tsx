// src/features/profile/edit/profileEdit.components.tsx
import React from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS, UI, styles } from "./profileEdit.styles";

export function LLightText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.LEXEND_LIGHT, color: UI.text }, style]} />;
}

export function BtnText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, color: UI.text }, style]} />;
}

export function KeyboardScreen(props: {
  header?: React.ReactNode;
  scroll?: boolean;
  scrollRef?: React.RefObject<ScrollView> | React.MutableRefObject<ScrollView | null>;
  backgroundColor?: string;
  contentContainerStyle?: any;
  children: React.ReactNode;
  keyboardVerticalOffset?: number;
}) {
  const {
    header,
    scroll = false,
    scrollRef,
    backgroundColor = UI.bg,
    contentContainerStyle,
    children,
    keyboardVerticalOffset = 0,
  } = props;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: header ? UI.card : backgroundColor }}>
      <View style={{ flex: 1, backgroundColor }}>
        {header ? <View>{header}</View> : null}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {scroll ? (
            <ScrollView
              ref={scrollRef as any}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1, backgroundColor }}
              contentContainerStyle={[{ flexGrow: 1, paddingBottom: 160 }, contentContainerStyle]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[{ flex: 1, backgroundColor, paddingBottom: 160 }, contentContainerStyle]}>{children}</View>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

export function GroupCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PickerRow({
  title,
  subtitle,
  onPress,
  disabled,
  showDivider,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.rowPressable, { opacity: disabled ? 0.5 : 1 }]}
      hitSlop={8}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <LLightText style={styles.rowTitle}>{title}</LLightText>
          {subtitle ? (
            <LLightText style={styles.rowSub} numberOfLines={2}>
              {subtitle}
            </LLightText>
          ) : null}
        </View>
        <LLightText style={styles.chevron}>›</LLightText>
      </View>

      {showDivider ? <View style={styles.rowDivider} /> : null}
    </Pressable>
  );
}
