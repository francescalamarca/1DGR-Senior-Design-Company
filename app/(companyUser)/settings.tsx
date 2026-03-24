// =========================
// settings.tsx (PART 1/4)
// =========================
/**
 * Settings Screen — Accordion (Animated Collapsible)
 * - iOS-like dividers (full-bleed)
 * - One section open at a time
 * - Chevron rotates
 * - Body animates open/close (height + opacity, JS-driver safe)
 * - ✅ Header row highlights when OPEN (like your sample)
 * - ✅ Dividers appear on TOP of each header row
 * - ✅ Taller sticky header
 *
 * UPDATE:
 * - ✅ Replaced Switch toggles with "dot" toggles
 * - ✅ Inner dot: #9BB4C0
 * - ✅ Outer ring: #6E7E86
 *
 * UPDATE (this change):
 * - ✅ PROFILE DISPLAY + ACCOUNT INFORMATION text uses Lexend Light
 *   (replaces Crimson + DM Mono ONLY in those sections)
 */

import KeyboardScreen from "@/src/components/KeyboardScreen";
import { RequireUserType } from "@/src/components/RequireUserType";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import { signIn, signOut } from "@/src/utils/auth";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

const FONTS = {
  LEXEND_REGULAR: "Lexend-Regular",
  LEXEND_LIGHT: "Lexend-Light",
  CRIMSON_REGULAR: "CrimsonText-Regular",
  DM_MONO_LIGHT: "DMMono-Light",
} as const;

/** --- Typography helpers --- */
function CText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.CRIMSON_REGULAR }, style]} />;
}
function LText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.LEXEND_REGULAR }, style]} />;
}
function LLText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.LEXEND_LIGHT }, style]} />;
}
function MText(props: React.ComponentProps<typeof Text>) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[{ fontFamily: FONTS.DM_MONO_LIGHT }, style]} />;
}


function formatPhone(input: string) {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${a}`;
  if (digits.length <= 6) return `(${a})-${b}`;
  return `(${a})-${b}-${c}`;
}

/** ---- Design tokens ---- */
const COLORS = {
  bg: "#fbfbfb",

  text: "#202020", // primary text
  subtle: "#484848", // secondary text (readable)
  divider: "#d9d9d9", // lines/borders (NOT text)

  pressed: "#f2f2f2",
  inputBorder: "#d9d9d9",

  dangerText: "#8a2a2a",
  dangerPressed: "rgba(220,0,0,0.10)",
  sectionOpenBg: "#efefef",
} as const;

/** ✅ Dot-toggle colors (requested) */
const DOT_TOGGLE = {
  ring: "#6E7E86",
  dot: "#9BB4C0",
} as const;

const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

const SPACING = {
  screenPad: 16,
  footerPad: 12,
  headerPad: 12,
  rowPadX: 16,
  rowPadY: 16,
  tight: 6,
  md: 12,
  lg: 16,
  right_gutter: 20,
} as const;

const SHARE_CARD = {
  text: COLORS.text,
  dangerText: COLORS.dangerText,
} as const;

/** --- Reusable UI blocks --- */
function FullWidthStack({ children }: { children: React.ReactNode }) {
  return <View style={styles.fullWidthStack}>{children}</View>;
}

function RowDivider({ inset = false }: { inset?: boolean }) {
  return (
    <View
      style={[
        styles.fullDivider,
        inset && { marginLeft: SPACING.rowPadX, marginRight: SPACING.rowPadX },
      ]}
      pointerEvents="none"
    />
  );
}

/**
 * ✅ SwitchRow renders a DOT toggle:
 * - Outer ring: #6E7E86
 * - Inner dot:  #9BB4C0 (only visible when ON)
 *
 * (Default typography: Crimson title + DM Mono subtitle)
 */
function SwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to toggle"
      hitSlop={6}
    >
      <View style={styles.rowLeft}>
        <CText style={styles.rowTitle}>{title}</CText>
        {subtitle ? <MText style={styles.rowSub}>{subtitle}</MText> : null}
      </View>

      <View style={styles.rightGutter} accessibilityElementsHidden pointerEvents="none">
        <View style={styles.dotOuter}>{value ? <View style={styles.dotInner} /> : null}</View>
      </View>
    </Pressable>
  );
}

/**
 * ✅ Lexend Light variant for PROFILE DISPLAY + ACCOUNT INFORMATION
 * - Title + subtitle both Lexend Light (replaces Crimson + DM Mono in those sections)
 */
function SwitchRowLL({
  title,
  subtitle,
  value,
  onValueChange,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to toggle"
      hitSlop={6}
    >
      <View style={styles.rowLeft}>
        <LLText style={styles.rowTitle}>{title}</LLText>
        {subtitle ? <LLText style={styles.rowSub}>{subtitle}</LLText> : null}
      </View>

      <View style={styles.rightGutter} accessibilityElementsHidden pointerEvents="none">
        <View style={styles.dotOuter}>{value ? <View style={styles.dotInner} /> : null}</View>
      </View>
    </Pressable>
  );
}

/** ✅ PressRow: only right-side value is pressable (Default typography uses CText for title) */
function PressRow({
  title,
  subtitle,
  valueText,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  valueText?: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <CText style={styles.rowTitle}>{title}</CText>
        {subtitle ? <MText style={styles.rowSub}>{subtitle}</MText> : null}
      </View>

      {valueText ? (
        <Pressable
          disabled={disabled}
          onPress={onPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={disabled ? "Unavailable" : "Double tap to open"}
          style={({ pressed }) => [
            styles.rowValueBtn,
            pressed && !disabled && styles.rowValueBtnPressed,
            disabled && styles.rowValueBtnDisabled,
          ]}
        >
          <LText style={styles.rowPickerValue} numberOfLines={1}>
            {valueText}
          </LText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** ✅ Lexend Light variant for PROFILE DISPLAY + ACCOUNT INFORMATION */
function PressRowLL({
  title,
  subtitle,
  valueText,
  disabled,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  valueText?: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowLeft}>
        <LLText style={styles.rowTitle}>{title}</LLText>
        {subtitle ? <LLText style={styles.rowSub}>{subtitle}</LLText> : null}
      </View>

      {valueText ? (
        <Pressable
          disabled={disabled}
          onPress={onPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={disabled ? "Unavailable" : "Double tap to open"}
          style={({ pressed }) => [
            styles.rowValueBtn,
            pressed && !disabled && styles.rowValueBtnPressed,
            disabled && styles.rowValueBtnDisabled,
          ]}
        >
          <LLText style={styles.rowPickerValue} numberOfLines={1}>
            {valueText}
          </LLText>
        </Pressable>
      ) : null}
    </View>
  );
}
// =========================
// settings.tsx (PART 2/4)
// =========================
function InfoRow({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <View style={styles.rowStatic}>
      <MText style={styles.labelTiny}>{label}</MText>
      <CText style={styles.valueText}>{value}</CText>
      {helper ? <MText style={styles.helperTiny}>{helper}</MText> : null}
    </View>
  );
}

/** ✅ Lexend Light variant for ACCOUNT INFORMATION */
function InfoRowLL({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <View style={styles.rowStatic}>
      <LLText style={styles.labelTiny}>{label}</LLText>
      <LLText style={styles.valueText}>{value}</LLText>
      {helper ? <LLText style={styles.helperTiny}>{helper}</LLText> : null}
    </View>
  );
}

function InputRow({
  label,
  value,
  placeholder,
  onChangeText,
  visible,
  keyboardType,
  autoCapitalize,
  textContentType,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (t: string) => void;
  visible: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  textContentType?: React.ComponentProps<typeof TextInput>["textContentType"];
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  maxLength?: number;
}) {
  return (
    <View style={styles.rowStatic}>
      <MText style={styles.labelTiny}>{label}</MText>

      {!visible ? (
        <CText style={styles.valueText}>{value?.trim() ? value : "—"}</CText>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          autoComplete={autoComplete}
          style={styles.input}
          placeholderTextColor="#999"
          maxLength={maxLength}
        />
      )}
    </View>
  );
}

/** ✅ Lexend Light variant for ACCOUNT INFORMATION */
function InputRowLL({
  label,
  value,
  placeholder,
  onChangeText,
  visible,
  keyboardType,
  autoCapitalize,
  textContentType,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (t: string) => void;
  visible: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  textContentType?: React.ComponentProps<typeof TextInput>["textContentType"];
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  maxLength?: number;
}) {
  return (
    <View style={styles.rowStatic}>
      <LLText style={styles.labelTiny}>{label}</LLText>

      {!visible ? (
        <LLText style={styles.valueText}>{value?.trim() ? value : "—"}</LLText>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          textContentType={textContentType}
          autoComplete={autoComplete}
          style={[styles.input, { fontFamily: FONTS.LEXEND_LIGHT }]}
          placeholderTextColor="#999"
          maxLength={maxLength}
        />
      )}
    </View>
  );
}

function CircleIconButton({
  icon,
  onPress,
  disabled,
  danger,
  label,
}: {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && (danger ? styles.iconBtnDangerPressed : styles.iconBtnPressed),
        disabled && styles.iconBtnDisabled,
      ]}
    >
      <Text
        style={{
          fontFamily: FONTS.LEXEND_REGULAR,
          fontSize: 18,
          color: danger ? SHARE_CARD.dangerText : SHARE_CARD.text,
        }}
      >
        {icon}
      </Text>
    </Pressable>
  );
}

/**
 * ✅ Collapsible (NO native driver anywhere on this view)
 * - We animate height + opacity using JS driver (useNativeDriver: false)
 * - We measure content in a hidden offscreen container (so content always shows)
 */
function Collapsible({
  open,
  children,
  duration = 220,
  openBg = false,
}: {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
  openBg?: boolean;
}) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);

  const height = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, contentHeight || 0],
      }),
    [progress, contentHeight]
  );

  const opacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [progress]
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [open, duration, progress]);

  return (
    <View style={[styles.collapsibleWrap, openBg && styles.sectionOpenBg]}>
      {/* Hidden measurer */}
      <View
        style={styles.collapsibleMeasurer}
        pointerEvents="none"
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h !== contentHeight) setContentHeight(h);
        }}
      >
        {children}
      </View>

      {/* Animated visible container (NO bg here) */}
      <Animated.View style={{ height, overflow: "hidden", opacity }} pointerEvents={open ? "auto" : "none"}>
        {children}
      </Animated.View>
    </View>
  );
}

/**
 * ✅ Accordion header
 * - ✅ Divider on TOP (not bottom)
 * - ✅ "Open" style stays applied while expanded
 * - ✅ Optional isFirst to avoid double top line
 */
function AccordionHeader({
  title,
  open,
  onToggle,
  isFirst,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  isFirst?: boolean;
}) {
  const rot = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rot, {
      toValue: open ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open, rot]);

  const rotate = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  return (
    <View style={styles.accordionItem}>
      {!isFirst ? <RowDivider /> : null}

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${title} folder`}
        accessibilityHint={open ? "Collapses folder" : "Expands folder"}
        style={({ pressed }) => [
          styles.accordionHeaderRowPress,
          open && styles.accordionHeaderRowOpen,
          pressed && styles.accordionHeaderPressed,
        ]}
      >
        <LLText style={styles.accordionTitle}>{title}</LLText>

        <Animated.View style={[styles.rightGutter, { transform: [{ rotate }], opacity: 0.9 }]}>
          <LText style={styles.accordionChevron}>›</LText>
        </Animated.View>
      </Pressable>
    </View>
  );
}
// =========================
// settings.tsx (PART 3/4)
// =========================
export default function SettingsScreen() {
  const { accessToken, setAccessToken } = useSession();
  const scrollRef = useRef<ScrollView>(null);
  const { profile, setProfile } = useProfile();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  async function handleSignIn() {
    const email = loginEmail.trim();
    const password = loginPassword;
    if (!email || !password) {
      Alert.alert("Sign in", "Please enter your email and password.");
      return;
    }
    setLoginLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.success && result.idToken) {
        setAccessToken(result.idToken);
        setLoginPassword("");
        Alert.alert("Signed in", "You are now signed in.");
      } else {
        Alert.alert("Sign in failed", result.error ?? "Unknown error");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setAccessToken(null);
  }

  type SectionKey = "account" | "profile" | "support" | "about";
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  function toggleSection(key: SectionKey) {
    setOpenSection((prev) => (prev === key ? null : key));
  }

  /** ======================
   * Existing settings logic
   * ====================== */
  const [draftSettings, setDraftSettings] = useState(() => ({
    nameDisplaySettings: profile.nameDisplaySettings,
    contactDisplaySettings: profile.contactDisplaySettings ?? {
      showEmail: false,
      showPhoneNumber: false,
      showUrl1: false,
      showUrl2: false,
    },
  }));

  //these are all transferable to company, all components stay
  const [editingAccountInfo, setEditingAccountInfo] = useState(false);
  const [draftEmail, setDraftEmail] = useState(profile.email ?? "");
  const [draftPhone, setDraftPhone] = useState(() => formatPhone(profile.phoneNumber ?? ""));
  const profileContactUrl1 = String((profile as any).contactUrl1 ?? "");
  const profileContactUrl2 = String((profile as any).contactUrl2 ?? "");
  const [draftContactUrl1, setDraftContactUrl1] = useState(profileContactUrl1);
  const [draftContactUrl2, setDraftContactUrl2] = useState(profileContactUrl2);
  const profileContactUrl1Label = String((profile as any).contactUrl1Label ?? "URL 1").trim() || "URL 1";
  const profileContactUrl2Label = String((profile as any).contactUrl2Label ?? "URL 2").trim() || "URL 2";
  const [draftContactUrl1Label, setDraftContactUrl1Label] = useState(profileContactUrl1Label);
  const [draftContactUrl2Label, setDraftContactUrl2Label] = useState(profileContactUrl2Label);

  const profileNameSettingsRef = useRef(profile.nameDisplaySettings);
  const profileContactSettingsRef = useRef(profile.contactDisplaySettings);
  profileNameSettingsRef.current = profile.nameDisplaySettings;
  profileContactSettingsRef.current = profile.contactDisplaySettings;
  
  useFocusEffect(
    useCallback(() => {
      setDraftSettings({
        nameDisplaySettings: profileNameSettingsRef.current,
        contactDisplaySettings: profileContactSettingsRef.current ?? {
          showEmail: false,
          showPhoneNumber: false,
          showUrl1: false,
          showUrl2: false,
        },
      });
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, []) // ✅ empty deps - reads latest values via refs
  );
  
  const profileContactRef = useRef({
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    contactUrl1: profileContactUrl1,
    contactUrl2: profileContactUrl2,
    contactUrl1Label: profileContactUrl1Label,
    contactUrl2Label: profileContactUrl2Label,
  });
  profileContactRef.current = {
    email: profile.email,
    phoneNumber: profile.phoneNumber,
    contactUrl1: profileContactUrl1,
    contactUrl2: profileContactUrl2,
    contactUrl1Label: profileContactUrl1Label,
    contactUrl2Label: profileContactUrl2Label,
  };
  
  useFocusEffect(
    useCallback(() => {
      const c = profileContactRef.current;
      setDraftEmail(c.email ?? "");
      setDraftPhone(formatPhone(c.phoneNumber ?? ""));
      setDraftContactUrl1(c.contactUrl1);
      setDraftContactUrl2(c.contactUrl2);
      setDraftContactUrl1Label(c.contactUrl1Label);
      setDraftContactUrl2Label(c.contactUrl2Label);
    }, []) // ✅ empty deps - reads latest values via refs
  );

  useFocusEffect(
    useCallback(() => {
      setDraftEmail(profile.email ?? "");
      setDraftPhone(formatPhone(profile.phoneNumber ?? ""));
      setDraftContactUrl1(profileContactUrl1);
      setDraftContactUrl2(profileContactUrl2);
      setDraftContactUrl1Label(profileContactUrl1Label);
      setDraftContactUrl2Label(profileContactUrl2Label);
    }, [
      profile.email,
      profile.phoneNumber,
      profileContactUrl1,
      profileContactUrl2,
      profileContactUrl1Label,
      profileContactUrl2Label,
    ])
  );

  const canSaveTop = useMemo(() => {
    const a = draftSettings.nameDisplaySettings;
    const b = profile.nameDisplaySettings;

    const c = draftSettings.contactDisplaySettings;
    const d = profile.contactDisplaySettings ?? {
      showEmail: false,
      showPhoneNumber: false,
      showUrl1: false,
      showUrl2: false,
    };

    const emailChanged =
      (draftEmail.trim().toLowerCase() || "") !== ((profile.email ?? "").trim().toLowerCase() || "");
    const phoneChanged = (draftPhone.trim() || "") !== (formatPhone(profile.phoneNumber ?? "").trim() || "");
    const url1Changed =
      (draftContactUrl1.trim() || "") !== (profileContactUrl1.trim() || "");
    const url2Changed =
      (draftContactUrl2.trim() || "") !== (profileContactUrl2.trim() || "");
    const url1LabelChanged =
      (draftContactUrl1Label.trim() || "URL 1") !== profileContactUrl1Label;
    const url2LabelChanged =
      (draftContactUrl2Label.trim() || "URL 2") !== profileContactUrl2Label;

    return (
      JSON.stringify(a) !== JSON.stringify(b) ||
      JSON.stringify(c) !== JSON.stringify(d) ||
      emailChanged ||
      phoneChanged ||
      url1Changed ||
      url2Changed ||
      url1LabelChanged ||
      url2LabelChanged
    );
  }, [
    draftSettings,
    profile.nameDisplaySettings,
    profile.contactDisplaySettings,
    profile.email,
    profile.phoneNumber,
    draftEmail,
    draftPhone,
    draftContactUrl1,
    draftContactUrl2,
    draftContactUrl1Label,
    draftContactUrl2Label,
    profileContactUrl1,
    profileContactUrl2,
    profileContactUrl1Label,
    profileContactUrl2Label,
  ]);

  function doneAccountInfo() {
    setEditingAccountInfo(false);
  }

  function cancelAccountInfo() {
    setDraftEmail(profile.email ?? "");
    setDraftPhone(formatPhone(profile.phoneNumber ?? ""));
    setDraftContactUrl1(profileContactUrl1);
    setDraftContactUrl2(profileContactUrl2);
    setDraftContactUrl1Label(profileContactUrl1Label);
    setDraftContactUrl2Label(profileContactUrl2Label);
    setEditingAccountInfo(false);
  }

  const showCompanyName = draftSettings.nameDisplaySettings.showCompanyName;

  const showEmailPublic = !!draftSettings.contactDisplaySettings.showEmail;
  const showPhonePublic = !!draftSettings.contactDisplaySettings.showPhoneNumber;
  const showUrl1Public = !!draftSettings.contactDisplaySettings.showUrl1;
  const showUrl2Public = !!draftSettings.contactDisplaySettings.showUrl2;

  function setNameToggles(companyFull: boolean) {
    //this is the correct logic because company name MUST be shown - always up
    if (!companyFull) {
      Alert.alert("Name display", "Company name must be enabled.");
      return;
    }

    setDraftSettings((d) => ({
      ...d,
      nameDisplaySettings: {
        ...d.nameDisplaySettings,
        showCompanyName: companyFull,
      },
    }));
  }

  function setContactToggles(nextShowEmail: boolean, nextShowPhone: boolean, nextShowUrl1: boolean, nextShowUrl2: boolean) {
    setDraftSettings((d) => ({
      ...d,
      contactDisplaySettings: {
        ...d.contactDisplaySettings,
        showEmail: nextShowEmail,
        showPhoneNumber: nextShowPhone,
        showUrl1: nextShowUrl1,
        showUrl2: nextShowUrl2,
      },
    }));
  }

  const Header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => {
          setDraftSettings({
            nameDisplaySettings: profile.nameDisplaySettings,
            contactDisplaySettings:
              profile.contactDisplaySettings ?? {
                showEmail: false,
                showPhoneNumber: false,
                showUrl1: false,
                showUrl2: false,
              },
          });

          setDraftEmail(profile.email ?? "");
          setDraftPhone(formatPhone(profile.phoneNumber ?? ""));
          setDraftContactUrl1(profileContactUrl1);
          setDraftContactUrl2(profileContactUrl2);
          setDraftContactUrl1Label(profileContactUrl1Label);
          setDraftContactUrl2Label(profileContactUrl2Label);
          setEditingAccountInfo(false);

          router.replace("/(companyUser)/profile");
        }}
        style={styles.headerLeft}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Cancel settings"
      >
        <LText style={styles.headerActionText}>Cancel</LText>
      </Pressable>

      <LLText pointerEvents="none" style={styles.headerTitle}>
        Settings & Privacy
      </LLText>

      <Pressable
        onPress={() => {
          setProfile((p) => ({
            ...p,
            nameDisplaySettings: draftSettings.nameDisplaySettings,
            contactDisplaySettings: draftSettings.contactDisplaySettings,
            email: draftEmail.trim().toLowerCase(),
            phoneNumber: draftPhone.trim(),
            contactUrl1: draftContactUrl1.trim(),
            contactUrl2: draftContactUrl2.trim(),
            contactUrl1Label: draftContactUrl1Label.trim() || "URL 1",
            contactUrl2Label: draftContactUrl2Label.trim() || "URL 2",
          }));

          setEditingAccountInfo(false);
          router.replace("/(companyUser)/profile");
        }}
        disabled={!canSaveTop}
        style={[styles.headerRight, { opacity: canSaveTop ? 1 : 0.4 }]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Save settings"
        accessibilityHint={canSaveTop ? "Saves your changes" : "No changes to save"}
      >
        <LText style={styles.headerActionText}>Save</LText>
      </Pressable>
    </View>
  );

  /**
   * I am making this on my own because I need a footer that has the contact information at all times
   * want this to be clean format as is on Figma
   */
  const Footer = (
    <View style={styles.footer}>
      <Pressable
        onPress={() => {
          setDraftSettings({
            nameDisplaySettings: profile.nameDisplaySettings,
            contactDisplaySettings:
              profile.contactDisplaySettings ?? {
                showEmail: false,
                showPhoneNumber: false,
                showUrl1: false,
                showUrl2: false,
              },
          });

          setDraftEmail(profile.email ?? "");
          setDraftPhone(formatPhone(profile.phoneNumber ?? ""));
          setDraftContactUrl1(profileContactUrl1);
          setDraftContactUrl2(profileContactUrl2);
          setDraftContactUrl1Label(profileContactUrl1Label);
          setDraftContactUrl2Label(profileContactUrl2Label);
          setEditingAccountInfo(false);

          router.replace("/(companyUser)/profile");
        }}
        style={styles.headerLeft}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Cancel settings"
      >
        <LText style={styles.headerActionText}>Cancel</LText>
      </Pressable>

      <LLText pointerEvents="none" style={styles.headerTitle}>
        Settings & Privacy
      </LLText>

      <Pressable
        onPress={() => {
          setProfile((p) => ({
            ...p,
            nameDisplaySettings: draftSettings.nameDisplaySettings,
            contactDisplaySettings: draftSettings.contactDisplaySettings,
            email: draftEmail.trim().toLowerCase(),
            phoneNumber: draftPhone.trim(),
            contactUrl1: draftContactUrl1.trim(),
            contactUrl2: draftContactUrl2.trim(),
            contactUrl1Label: draftContactUrl1Label.trim() || "URL 1",
            contactUrl2Label: draftContactUrl2Label.trim() || "URL 2",
          }));

          setEditingAccountInfo(false);
          router.replace("/(companyUser)/profile");
        }}
        disabled={!canSaveTop}
        style={[styles.headerRight, { opacity: canSaveTop ? 1 : 0.4 }]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Save settings"
        accessibilityHint={canSaveTop ? "Saves your changes" : "No changes to save"}
      >
        <LText style={styles.headerActionText}>Save</LText>
      </Pressable>
    </View>
  );

  return (
    <>
      <RequireUserType type="company" />

      <KeyboardScreen
        header={Header}
        scroll
        scrollRef={scrollRef}
        backgroundColor={COLORS.bg}
        keyboardVerticalOffset={76}
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.groupCard}>
          <AccordionHeader
            title="ACCOUNT"
            open={openSection === "account"}
            onToggle={() => toggleSection("account")}
            isFirst
          />                 
                 

          <AccordionHeader title="PROFILE DISPLAY" open={openSection === "profile"} onToggle={() => toggleSection("profile")} />

          {/* ✅ PROFILE DISPLAY now uses Lexend Light components */}
          <Collapsible open={openSection === "profile"} openBg>
            <FullWidthStack>
              <SwitchRowLL
                title="Show company name"
                subtitle="Displays your company name."
                value={showCompanyName}
                onValueChange={(v) => setNameToggles(v)} //idk about that one
                accessibilityLabel="Show company name"
              />

              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <LLText style={styles.labelTiny}>Preview</LLText>
                <LLText style={[styles.previewName, { textAlign: "right" }]} numberOfLines={1}>
                  {profile.companyName}
                </LLText>
              </View>
            </FullWidthStack>
          </Collapsible>

          <AccordionHeader
            title="ACCOUNT INFORMATION"
            open={openSection === "account"}
            onToggle={() => toggleSection("account")}
          />

          {/* ✅ ACCOUNT INFORMATION now uses Lexend Light components */}
          <Collapsible open={openSection === "account"} openBg>
            <FullWidthStack>

              {/* ── Sign In / Signed In row ── */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                {accessToken ? (
                  <View style={[styles.row, { justifyContent: "space-between", alignItems: "center" }]}>
                    <LLText style={styles.rowTitle}>Signed in ✓</LLText>
                    <Pressable onPress={handleSignOut} hitSlop={10}>
                      <LLText style={{ opacity: 0.7 }}>Sign out</LLText>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 10, paddingVertical: 4 }}>
                    <LLText style={styles.blockTitle}>Sign in to your account</LLText>
                    <TextInput
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      placeholder="Email"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      style={{
                        borderWidth: 1,
                        borderColor: "#d9d9d9",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontFamily: FONTS.LEXEND_LIGHT,
                        fontSize: 14,
                        color: "#202020",
                      }}
                    />
                    <TextInput
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      placeholder="Password"
                      placeholderTextColor="#999"
                      secureTextEntry
                      style={{
                        borderWidth: 1,
                        borderColor: "#d9d9d9",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontFamily: FONTS.LEXEND_LIGHT,
                        fontSize: 14,
                        color: "#202020",
                      }}
                    />
                    <Pressable
                      onPress={handleSignIn}
                      disabled={loginLoading}
                      style={{
                        backgroundColor: "#202020",
                        borderRadius: 8,
                        paddingVertical: 10,
                        alignItems: "center",
                        opacity: loginLoading ? 0.6 : 1,
                      }}
                    >
                      {loginLoading
                        ? <ActivityIndicator color="#fff" />
                        : <LLText style={{ color: "#fff", fontSize: 14 }}>Sign In</LLText>
                      }
                    </Pressable>
                  </View>
                )}
              </View>

              {/* 0) Title row */}
              <View style={styles.linkItemWrap}>
                <View style={styles.rowStatic}>
                  <LLText style={styles.blockTitle}>Contact info (public)</LLText>
                </View>
              </View>

              {/* 1) Show email */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <SwitchRowLL
                  title="Show email"
                  subtitle={`Current: ${profile.email?.trim() ? profile.email : "—"}`}
                  value={showEmailPublic}
                  onValueChange={(v) => setContactToggles(v, showPhonePublic, showUrl1Public, showUrl2Public)}
                  accessibilityLabel="Show email publicly"
                />
              </View>

              {/* 2) Show phone */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <SwitchRowLL
                  title="Show phone number"
                  subtitle={`Current: ${profile.phoneNumber?.trim() ? profile.phoneNumber : ""}`}
                  value={showPhonePublic}
                  onValueChange={(v) => setContactToggles(showEmailPublic, v, showUrl1Public, showUrl2Public)}
                  accessibilityLabel="Show phone number publicly"
                />
              </View>

              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <SwitchRowLL
                  title={`Show ${draftContactUrl1Label || "URL 1"}`}
                  subtitle={`Current: ${draftContactUrl1.trim() ? draftContactUrl1 : "—"}`}
                  value={showUrl1Public}
                  onValueChange={(v) => setContactToggles(showEmailPublic, showPhonePublic, v, showUrl2Public)}
                  accessibilityLabel="Show first URL publicly"
                />
              </View>

              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <SwitchRowLL
                  title={`Show ${draftContactUrl2Label || "URL 2"}`}
                  subtitle={`Current: ${draftContactUrl2.trim() ? draftContactUrl2 : "—"}`}
                  value={showUrl2Public}
                  onValueChange={(v) => setContactToggles(showEmailPublic, showPhonePublic, showUrl1Public, v)}
                  accessibilityLabel="Show second URL publicly"
                />
              </View>

              {/* 3) Account information header row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <View style={[styles.row, { justifyContent: "space-between" }]}>
                  <LLText style={styles.rowTitle}>Account information</LLText>

                  {!editingAccountInfo ? (
                    <Pressable
                      onPress={() => setEditingAccountInfo(true)}
                      hitSlop={10}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 15 }]}
                      accessibilityRole="button"
                      accessibilityLabel="Edit account information"
                    >
                      <LLText style={{ opacity: 0.8 }}>Edit</LLText>
                    </Pressable>
                  ) : (
                    <View style={{ flexDirection: "row" }}>
                      <Pressable
                        onPress={cancelAccountInfo}
                        hitSlop={10}
                        style={({ pressed }) => [{ marginRight: 17, opacity: pressed ? 0.6 : 1 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel editing account information"
                      >
                        <LLText style={{ opacity: 0.8 }}>Cancel</LLText>
                      </Pressable>

                      <Pressable
                        onPress={doneAccountInfo}
                        hitSlop={10}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginRight: 12 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Done editing account information"
                      >
                        <LLText style={{ opacity: 0.8 }}>Done</LLText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              {/* 4) Email input row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <InputRowLL
                  label="Email"
                  value={draftEmail}
                  placeholder="you@email.com"
                  onChangeText={setDraftEmail}
                  visible={editingAccountInfo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </View>

              {/* 5) Phone input row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <InputRowLL
                  label="Phone number"
                  value={draftPhone}
                  placeholder="(555)-555-5555"
                  onChangeText={(t) => setDraftPhone(formatPhone(t))}
                  visible={editingAccountInfo}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  maxLength={14}
                />
              </View>

              {/* 6) URL 1 title row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <InputRowLL
                  label="URL 1 title"
                  value={draftContactUrl1Label}
                  placeholder="Portfolio"
                  onChangeText={setDraftContactUrl1Label}
                  visible={editingAccountInfo}
                  autoCapitalize="words"
                  maxLength={30}
                />
              </View>

              {/* 7) URL 1 input row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <InputRowLL
                  label="URL 1"
                  value={draftContactUrl1}
                  placeholder="https://example.com"
                  onChangeText={setDraftContactUrl1}
                  visible={editingAccountInfo}
                  keyboardType="url"
                  autoCapitalize="none"
                  textContentType="URL"
                  autoComplete="url"
                />
              </View>

              {/* 8) URL 2 title row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <InputRowLL
                  label="URL 2 title"
                  value={draftContactUrl2Label}
                  placeholder="LinkedIn"
                  onChangeText={setDraftContactUrl2Label}
                  visible={editingAccountInfo}
                  autoCapitalize="words"
                  maxLength={30}
                />
              </View>

              {/* 9) URL 2 input row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <InputRowLL
                  label="URL 2"
                  value={draftContactUrl2}
                  placeholder="https://example.com"
                  onChangeText={setDraftContactUrl2}
                  visible={editingAccountInfo}
                  keyboardType="url"
                  autoCapitalize="none"
                  textContentType="URL"
                  autoComplete="url"
                />
              </View>

            </FullWidthStack>
          </Collapsible>
        </View>
      </KeyboardScreen>
    </>
  );
}
// =========================
// settings.tsx (PART 4/4)
// =========================
const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 40,
    backgroundColor: COLORS.bg,
  },

  /** Header (✅ taller like the sample) */
  header: {
    height: 76,
    paddingHorizontal: SPACING.headerPad,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
    backgroundColor: COLORS.bg,
  },
  headerLeft: { position: "absolute", left: SPACING.headerPad, zIndex: 2 },
  headerRight: { position: "absolute", right: SPACING.headerPad, zIndex: 2 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "400",
    textAlign: "center",
    zIndex: 1,
  },
  headerActionText: {
    fontFamily: FONTS.LEXEND_LIGHT,
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.2,
    color: COLORS.text,
  },

  /** Footer (taller like the sample) */
  footer: {
    height: 76,
    paddingHorizontal: SPACING.footerPad,
    justifyContent: "center",
    borderTopWidth: 1, //change for footer
    borderTopColor: "rgba(0,0,0,0.06)", //changes for footer
    backgroundColor: COLORS.bg,
  },
  footerLeft: { position: "absolute", left: SPACING.headerPad, zIndex: 2 },
  footerRight: { position: "absolute", right: SPACING.headerPad, zIndex: 2 },
  footerTitle: {
    fontSize: 20,
    fontWeight: "400",
    textAlign: "center",
    zIndex: 1,
  },
  footerActionText: {
    fontFamily: FONTS.LEXEND_LIGHT,
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.2,
    color: COLORS.text,
  },

  /** Dividers */
  fullDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
  },

  /** Group card container (full-bleed) */
  groupCard: {
    marginTop: 0,
    marginHorizontal: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: COLORS.bg,
  },

  /** Accordion header */
  accordionItem: {
    marginTop: 0,
    marginHorizontal: 0,
    backgroundColor: COLORS.bg,
  },

  accordionHeaderRowPress: {
    paddingHorizontal: SPACING.screenPad,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
  },

  /** ✅ stays highlighted while open */
  accordionHeaderRowOpen: {
    backgroundColor: "rgba(0,0,0,0.045)",
  },

  /** ✅ press feedback */
  accordionHeaderPressed: {
    backgroundColor: "rgba(0,0,0,0.07)",
  },

  accordionTitle: {
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 1,
    color: COLORS.text,
    marginLeft: 7,
  },

  accordionChevron: {
    fontSize: 22,
    color: COLORS.text,
  },

  /** Collapsible */
  collapsibleWrap: {
    marginHorizontal: 0,
    backgroundColor: "transparent",
  },
  sectionOpenBg: {
    backgroundColor: COLORS.sectionOpenBg,
  },
  collapsibleMeasurer: {
    position: "absolute",
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
  },

  /** Accordion body padding */
  accordionBodyPad: {
    paddingHorizontal: SPACING.screenPad,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: "transparent",
  },
  bodyDescription: { color: COLORS.subtle, lineHeight: 16, },

  /** Full width stack */
  fullWidthStack: {
    marginHorizontal: 0,
    marginTop: 0,
  },

  linkItemWrap: {
    width: "100%",
  },

  // divider drawn as a BORDER (fixes the tiny cut-off issue on iOS)
  linkItemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },

  /** Rows */
  row: {
    backgroundColor: "transparent",
    paddingHorizontal: SPACING.rowPadX,
    paddingVertical: SPACING.rowPadY,
    flexDirection: "row",
    alignItems: "center",
  },
  rowPressed: { backgroundColor: COLORS.pressed },
  rowDisabled: { opacity: 0.6 },
  rowLeft: { paddingRight: 12, flex: 1 },
  rowTitle: {
    fontWeight: "500",
    color: COLORS.text,
  },
  rowSub: {
    color: COLORS.subtle,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },

  /** ✅ DOT toggle (requested colors) */
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: DOT_TOGGLE.ring, // ✅ #6E7E86
    alignItems: "center",
    justifyContent: "center",
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: DOT_TOGGLE.dot, // ✅ #9BB4C0
  },

  rightGutter: {
    marginRight: SPACING.right_gutter,
    width: 13,
    alignItems: "flex-end",
  },

  rowValueBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    maxWidth: "48%",
    alignItems: "flex-end",
  },
  rowValueBtnPressed: { backgroundColor: COLORS.pressed },
  rowValueBtnDisabled: { opacity: 0.5 },

  // NOTE: used by PressRow + PressRowLL; the Text component decides the font.
  rowPickerValue: {
    fontSize: 14,
    letterSpacing: 0.2,
    color: COLORS.text,
  },

  labelTiny: {
    color: COLORS.subtle,
    fontSize: 12,
  },

  // NOTE: used by LText/LLText in Preview; font comes from component.
  previewName: {
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.text,
  },

  /** Static rows */
  rowStatic: {
    backgroundColor: "transparent",
    paddingHorizontal: SPACING.rowPadX,
    paddingVertical: SPACING.rowPadY,
  },
  blockTitle: { fontWeight: "600" },

  valueText: {
    marginTop: 6,
    color: COLORS.text,
  },
  helperTiny: {
    color: COLORS.subtle,
    marginTop: 8,
    fontSize: 12,
  },

  /** Inputs */
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADII.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: FONTS.CRIMSON_REGULAR, // default input font (InputRowLL overrides this inline)
    backgroundColor: COLORS.bg,
  },

  /** Primary button */
  primaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderColor: "rgba(0,0,0,0.22)",
  },
  primaryButtonPressed: { backgroundColor: COLORS.pressed },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontWeight: "600" },
  emptyState: {
    color: COLORS.subtle,
    marginTop: 14,
  },

  /** Share rows */
  shareRow: {
    width: "100%",
    backgroundColor: "transparent",
    paddingHorizontal: SPACING.rowPadX,
    paddingVertical: SPACING.rowPadY,
  },
  shareTitle: { fontSize: 16, fontWeight: "300", color: COLORS.text },
  renameInput: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.bg,
    borderRadius: RADII.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: FONTS.CRIMSON_REGULAR,
    fontWeight: "600",
  },
  shareActionsRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  renameFooter: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end" },
  textBtn: { marginLeft: 14 },
  textBtnLabel: { opacity: 0.8, fontWeight: "600" },

  /** Icon buttons */
  iconBtn: { width: 42, height: 42, borderRadius: RADII.pill, alignItems: "center", justifyContent: "center" },
  iconBtnPressed: { backgroundColor: "rgba(0,0,0,0.06)" },
  iconBtnDangerPressed: { backgroundColor: COLORS.dangerPressed },
  iconBtnDisabled: { opacity: 0.35 },

  /** Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.bg,
    borderRadius: RADII.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: "#eee",
  },
  modalTitle: {
    fontWeight: "600",
    fontSize: 16,
    color: COLORS.text,
  },
  modalSub: {
    color: COLORS.subtle,
    marginTop: 6,
  },
  qrBox: { width: 320, height: 320, alignItems: "center", justifyContent: "center" },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  modalBtn: {
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bg,
  },
  modalBtnPressed: { backgroundColor: COLORS.pressed },
  modalBtnText: { fontWeight: "600" },
});
