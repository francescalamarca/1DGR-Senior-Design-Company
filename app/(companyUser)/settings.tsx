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

import { aws_config } from "@/constants/aws-config";
import KeyboardScreen from "@/src/components/KeyboardScreen";
import { RequireUserType } from "@/src/components/RequireUserType";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import { useThemePreference, type ThemePreference } from "@/src/state/theme-preference";
import { BrandColors, BrandFonts } from "@/src/theme/brand";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity, UIManager,
  View
} from "react-native";

const FONTS = {
  LEXEND_REGULAR: BrandFonts.lexendRegular,
  LEXEND_LIGHT: BrandFonts.lexendLight,
  CRIMSON_REGULAR: "CrimsonText-Regular",
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
  return <Text {...rest} style={[{ fontFamily: FONTS.LEXEND_LIGHT }, style]} />;
}

const ENABLE_SUPPORT_SECTION = false; // set true to bring back Share Profile section

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
  bg: BrandColors.surfaceSubtle,

  text: BrandColors.textPrimary, // primary text
  subtle: BrandColors.textSecondary, // secondary text (readable)
  divider: BrandColors.gray300, // lines/borders (NOT text)

  pressed: BrandColors.gray100,
  inputBorder: BrandColors.gray300,

  dangerText: "#8a2a2a",
  dangerPressed: "rgba(220,0,0,0.10)",
  sectionOpenBg: BrandColors.gray100,
  sectionHeaderBg: BrandColors.gray100,
  sectionHeaderPressed: BrandColors.gray200,
  primaryCtaBg: BrandColors.ctaPrimaryBg,
  primaryCtaText: BrandColors.ctaPrimaryText,
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
  iconName,
  onPress,
  disabled,
  danger,
  label,
}: {
  iconName: React.ComponentProps<typeof Feather>["name"];
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
      <Feather
        name={iconName}
        size={18}
        color={danger ? SHARE_CARD.dangerText : SHARE_CARD.text}
      />
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
  openBgColor,
}: {
  open: boolean;
  children: React.ReactNode;
  duration?: number;
  openBg?: boolean;
  openBgColor?: string;
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
    <View style={[styles.collapsibleWrap, openBg && (openBgColor ? { backgroundColor: openBgColor } : styles.sectionOpenBg)]}>
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
  bgColor,
  textColor,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  isFirst?: boolean;
  bgColor?: string;
  textColor?: string;
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
          bgColor && { backgroundColor: bgColor },
          open && styles.accordionHeaderRowOpen,
          open && bgColor && { backgroundColor: bgColor },
          pressed && styles.accordionHeaderPressed,
        ]}
      >
        <LLText style={[styles.accordionTitle, textColor && { color: textColor }]}>{title}</LLText>

        <Animated.View style={[styles.rightGutter, { transform: [{ rotate }], opacity: 0.9 }]}>
          <LText style={[styles.accordionChevron, textColor && { color: textColor }]}>›</LText>
        </Animated.View>
      </Pressable>
    </View>
  );
}
// =========================
// settings.tsx (PART 3/4)
// =========================
export default function SettingsScreen() {
  const { showActionSheetWithOptions } = useActionSheet();
  const { accessToken } = useSession();
  const scrollRef = useRef<ScrollView>(null);
  const { profile, setProfile } = useProfile();
  const { preference: themePreference, setPreference: setThemePreference, colorScheme } = useThemePreference();
  const isDark = colorScheme === "dark";
  const dynColors = isDark
    ? {
        bg: "#3E424B",
        text: "#ECEDEE",
        subtle: "#9BA1A6",
        sectionBg: "#474B54",
        sectionOpenBg: "#383C45",
        headerBg: "#3E424B",
        cardBg: "#3E424B",
        btnBorder: "#5A5F6B",
      }
    : {
        bg: COLORS.bg,
        text: COLORS.text,
        subtle: COLORS.subtle,
        sectionBg: COLORS.sectionHeaderBg,
        sectionOpenBg: COLORS.sectionOpenBg,
        headerBg: COLORS.bg,
        cardBg: COLORS.bg,
        btnBorder: COLORS.divider,
      };


  type SectionKey = "account" | "profile settings" | "support";
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
      showcompanyEmail: false,
      showcompanyPhone: false,
      showUrl1: false,
      showUrl2: false,
    },
  }));

  const [editingAccountInfo, setEditingAccountInfo] = useState(false);
  const [draftcompanyEmail, setDraftcompanyEmail] = useState(profile.companyEmail ?? "");
  const [draftPhone, setDraftPhone] = useState(() => formatPhone(profile.companyPhone ?? ""));
  const profileContactUrl1 = String((profile as any).contactUrl1 ?? "");
  const profileContactUrl2 = String((profile as any).contactUrl2 ?? "");
  const [draftContactUrl1, setDraftContactUrl1] = useState(profileContactUrl1);
  const [draftContactUrl2, setDraftContactUrl2] = useState(profileContactUrl2);
  const profileContactUrl1Label = String((profile as any).contactUrl1Label ?? "URL 1").trim() || "URL 1";
  const profileContactUrl2Label = String((profile as any).contactUrl2Label ?? "URL 2").trim() || "URL 2";
  const [draftContactUrl1Label, setDraftContactUrl1Label] = useState(profileContactUrl1Label);
  const [draftContactUrl2Label, setDraftContactUrl2Label] = useState(profileContactUrl2Label);

  useFocusEffect(
    useCallback(() => {
      setDraftSettings({
        nameDisplaySettings: profile.nameDisplaySettings,
        contactDisplaySettings: profile.contactDisplaySettings ?? {
          showcompanyEmail: false,
          showcompanyPhone: false,
          showUrl1: false,
          showUrl2: false,
        },
      });

      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [profile.nameDisplaySettings, profile.contactDisplaySettings])
  );

  useFocusEffect(
    useCallback(() => {
      setDraftcompanyEmail(profile.companyEmail ?? "");
      setDraftPhone(formatPhone(profile.companyPhone ?? ""));
      setDraftContactUrl1(profileContactUrl1);
      setDraftContactUrl2(profileContactUrl2);
      setDraftContactUrl1Label(profileContactUrl1Label);
      setDraftContactUrl2Label(profileContactUrl2Label);
    }, [
      profile.companyEmail,
      profile.companyPhone,
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
      showcompanyEmail: false,
      showcompanyPhone: false,
      showUrl1: false,
      showUrl2: false,
    };

    const companyEmailChanged =
      (draftcompanyEmail.trim().toLowerCase() || "") !== ((profile.companyEmail ?? "").trim().toLowerCase() || "");
    const phoneChanged = (draftPhone.trim() || "") !== (formatPhone(profile.companyPhone ?? "").trim() || "");
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
      companyEmailChanged ||
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
    profile.companyEmail,
    profile.companyPhone,
    draftcompanyEmail,
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
    setDraftcompanyEmail(profile.companyEmail ?? "");
    setDraftPhone(formatPhone(profile.companyPhone ?? ""));
    setDraftContactUrl1(profileContactUrl1);
    setDraftContactUrl2(profileContactUrl2);
    setDraftContactUrl1Label(profileContactUrl1Label);
    setDraftContactUrl2Label(profileContactUrl2Label);
    setEditingAccountInfo(false);
  }

  function handleDeleteAccount() {

  }

  const showcompanyEmailPublic = !!draftSettings.contactDisplaySettings.showcompanyEmail;
  const showPhonePublic = !!draftSettings.contactDisplaySettings.showcompanyPhone;
  const showUrl1Public = !!draftSettings.contactDisplaySettings.showUrl1;
  const showUrl2Public = !!draftSettings.contactDisplaySettings.showUrl2;

  function setContactToggles(nextShowcompanyEmail: boolean, nextShowPhone: boolean, nextShowUrl1: boolean, nextShowUrl2: boolean) {
    setDraftSettings((d) => ({
      ...d,
      contactDisplaySettings: {
        ...d.contactDisplaySettings,
        showcompanyEmail: nextShowcompanyEmail,
        showcompanyPhone: nextShowPhone,
        showUrl1: nextShowUrl1,
        showUrl2: nextShowUrl2,
      },
    }));
  }

  const Header = (
    <View style={[styles.header, { backgroundColor: dynColors.headerBg }]}>
      <Pressable
        onPress={() => {
          setDraftSettings({
            nameDisplaySettings: profile.nameDisplaySettings,
            contactDisplaySettings:
              profile.contactDisplaySettings ?? {
                showcompanyEmail: false,
                showcompanyPhone: false,
                showUrl1: false,
                showUrl2: false,
              },
          });

          setDraftcompanyEmail(profile.companyEmail ?? "");
          setDraftPhone(formatPhone(profile.companyPhone ?? ""));
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
        <LText style={[styles.headerActionText, { color: dynColors.text }]}>Cancel</LText>
      </Pressable>

      <LLText pointerEvents="none" style={[styles.headerTitle, { color: dynColors.text }]}>
        Settings & Privacy
      </LLText>

      <Pressable
        onPress={async () => {
          if (!canSaveTop) {
            router.replace("/(companyUser)/profile");
            return;
          }

          if (!accessToken) return;

          try {
            const res = await fetch(`${aws_config.apiBaseUrl}/update-profile`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: accessToken,
              },
              body: JSON.stringify({
                companyEmail: draftcompanyEmail.trim().toLowerCase(),
                companyPhone: draftPhone.trim(),
                urls: [
                  { title: draftContactUrl1Label, url: draftContactUrl1 },
                  { title: draftContactUrl2Label, url: draftContactUrl2 }
                ].filter(u => u.url),
                contactDisplaySettings: draftSettings.contactDisplaySettings,
              }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            setProfile((p) => ({
              ...p,
              nameDisplaySettings: draftSettings.nameDisplaySettings,
              contactDisplaySettings: draftSettings.contactDisplaySettings,
              companyEmail: draftcompanyEmail.trim().toLowerCase(),
              companyPhone: draftPhone.trim(),
              contactUrl1: draftContactUrl1.trim(),
              contactUrl2: draftContactUrl2.trim(),
              contactUrl1Label: draftContactUrl1Label.trim() || "URL 1",
              contactUrl2Label: draftContactUrl2Label.trim() || "URL 2",
            }));

            router.replace("/(companyUser)/profile");

          } catch {
            Alert.alert("Error", "Failed to save settings.");
          }
        }}
        style={styles.headerRight}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Save settings"
        accessibilityHint={canSaveTop ? "Saves your changes" : "No changes to save"}
      >
        <LText style={[styles.headerActionText, { color: dynColors.text }]}>Save</LText>
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
        backgroundColor={dynColors.bg}
        keyboardVerticalOffset={76}
        contentContainerStyle={{ ...styles.screenContent, backgroundColor: dynColors.bg }}
      >
        <View style={[styles.groupCard, { backgroundColor: dynColors.cardBg }]}>
          <>
              <AccordionHeader
                title="Account"
                open={openSection === "account"}
                onToggle={() => toggleSection("account")}
                isFirst
                bgColor={dynColors.sectionBg}
                textColor={dynColors.text}
              />

              <Collapsible open={openSection === "account"} openBg openBgColor={dynColors.sectionOpenBg}>
            <FullWidthStack>
              {/* 0) Title row */}
              <View style={styles.linkItemWrap}>
                <View style={styles.rowStatic}>
                  <LLText style={styles.blockTitle}>Contact info (public)</LLText>
                </View>
              </View>

              {/* 1) Account information header row */}
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

              {/* 4) companyEmail input row */}
              <View style={[styles.linkItemWrap, styles.linkItemDivider]}>
                <InputRowLL
                  label="companyEmail"
                  value={draftcompanyEmail}
                  placeholder="you@companyEmail.com"
                  onChangeText={setDraftcompanyEmail}
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
              
          <AccordionHeader
            title="Profile Display"
            open={openSection === "profile settings"}
            onToggle={() => toggleSection("profile settings")}
            bgColor={dynColors.sectionBg}
            textColor={dynColors.text}
          />

          {/* PROFILE DISPLAY — light / dark selector */}
          <Collapsible open={openSection === "profile settings"} openBg openBgColor={dynColors.sectionOpenBg}>
            <View style={styles.accordionBodyPad}>
              <LLText style={[styles.bodyDescription, { marginBottom: 14, color: dynColors.subtle }]}>
                Choose your preferred display
              </LLText>
              <View style={themeSwitchStyles.row}>
                {(["light", "dark"] as ThemePreference[]).map((opt) => {
                  const selected = themePreference === opt;
                  const label = opt.charAt(0).toUpperCase() + opt.slice(1);
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setThemePreference(opt)}
                      style={({ pressed }) => [
                        themeSwitchStyles.btn,
                        { borderColor: dynColors.btnBorder, backgroundColor: "transparent" },
                        selected && { backgroundColor: "#9BB4C0", borderColor: "#9BB4C0" },
                        pressed && !selected && { backgroundColor: dynColors.sectionBg },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${label} mode`}
                    >
                      <LLText
                        style={[
                          themeSwitchStyles.btnLabel,
                          { color: dynColors.text, opacity: selected ? 1 : 0.55 },
                          selected && { color: "#fff", opacity: 1 },
                        ]}
                      >
                        {label}
                      </LLText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Collapsible>

          <AccordionHeader
          title="Support"
          open={openSection === "support"}
          onToggle={() => toggleSection("support")}
          bgColor={dynColors.sectionBg}
          textColor={dynColors.text}
        />

        {/* support settings: FAQ, chat with admin, report an issue, delete account */}
        <Collapsible open={openSection === "support"} openBg openBgColor={dynColors.sectionOpenBg}>
          <View style={styles.accordionBodyPad}>

            {/* FAQ */}
            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => router.push("/(companyUser)/faq")}
            >
              <LLText style={styles.supportRowText}>FAQ</LLText>
              <LText style={[styles.accordionChevron, { color: dynColors.text }]}>›</LText>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Chat with Admin */}
            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => router.push("/(companyUser)/admin-chat")}
            >
              <LLText style={styles.supportRowText}>Chat with Admin</LLText>
              <LText style={[styles.accordionChevron, { color: dynColors.text }]}>›</LText>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Report an Issue */}
            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => router.push("/(companyUser)/report-issue")}
            >
              <LLText style={styles.supportRowText}>Report an Issue</LLText>
              <LText style={[styles.accordionChevron, { color: dynColors.text }]}>›</LText>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Delete Account */}
            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => {
                Alert.alert(
                  "Delete Account",
                  "Are you sure you want to delete your account? This action cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => handleDeleteAccount(),
                    },
                  ]
                );
              }}
            >
              <LLText style={[styles.supportRowText, styles.deleteText]}>Delete Account</LLText>
              
            </TouchableOpacity>

          </View>
        </Collapsible>

        </>
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
    backgroundColor: COLORS.sectionHeaderBg,
  },

  /** ✅ stays highlighted while open */
  accordionHeaderRowOpen: {
    backgroundColor: COLORS.sectionHeaderBg,
  },

  /** ✅ press feedback */
  accordionHeaderPressed: {
    backgroundColor: COLORS.sectionHeaderPressed,
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
    fontFamily: FONTS.LEXEND_LIGHT,
    backgroundColor: COLORS.bg,
  },

  /** Primary button */
  primaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.primaryCtaBg,
    borderColor: COLORS.primaryCtaBg,
  },
  primaryButtonPressed: { opacity: 0.88 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    fontFamily: FONTS.LEXEND_REGULAR,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primaryCtaText,
  },
  emptyState: {
    color: COLORS.subtle,
    marginTop: 14,
  },

  /** Share rows */
  shareRow: {
    width: "100%",
    backgroundColor: "transparent",
    paddingHorizontal: SPACING.rowPadX,
    paddingVertical: 14,
  },
  shareTitle: { fontSize: 16, fontWeight: "300", color: COLORS.text },
  renameInput: {
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.bg,
    borderRadius: RADII.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: FONTS.LEXEND_LIGHT,
    fontWeight: "600",
  },
  shareActionsRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  renameFooter: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  textBtn: { marginLeft: 14 },
  textBtnLabel: { opacity: 0.8, fontWeight: "600" },

  /** Icon buttons */
  iconBtn: { width: 40, height: 40, borderRadius: RADII.pill, alignItems: "center", justifyContent: "center" },
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
  supportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  supportRowText: {
    fontSize: 15,
  },
  deleteText: {
    color: "red",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider, // swap for your divider color token if different
    opacity: 0.3,
  },
});

/** Segmented control for Light / Dark / System selection */
const themeSwitchStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.bg,
    alignItems: "center",
  },
  btnSelected: {
    backgroundColor: COLORS.primaryCtaBg,
    borderColor: COLORS.primaryCtaBg,
  },
  btnPressed: {
    backgroundColor: COLORS.pressed,
  },
  btnLabel: {
    fontFamily: FONTS.LEXEND_LIGHT,
    fontSize: 13,
    letterSpacing: 0.5,
    color: COLORS.text,
  },
  btnLabelSelected: {
    color: COLORS.primaryCtaText,
  }, 
});