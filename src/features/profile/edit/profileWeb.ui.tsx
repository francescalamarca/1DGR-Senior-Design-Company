// src/features/profile/edit/profileWeb.ui.tsx
//
// All display sections for ProfileWebScreen.
// Mirrors profileEdit.ui.tsx — the screen file stays thin, all JSX lives here.
//
// Layout intent:
//   - Right sidebar:  Contact Us + Employees — always visible, no accordion
//   - Main body:      About Us card always expanded below the hero (mission,
//                     core values, industry, benefits, locations, open roles)

import { ProfileBrandWordmark } from "@/src/components/ProfileBrandWordmark";
import { styles } from "@/src/features/profile/edit/profileEdit.styles";
import { useDynColors } from "@/src/state/theme-colors";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Local constants
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = {
  LEXEND_LIGHT:    "Lexend_300Light",
  LEXEND_REGULAR:  "Lexend_400Regular",
  CRIMSON_REGULAR: "CrimsonText_400Regular",
} as const;

const WHITE  = "#ffffff";
const BG     = "#f7f8f9";
const BORDER = "#dde3e8";
const TEXT   = "#1a1a1a";
const MUTED  = "#8a9baa";
const ACCENT = "#3b7dd8";

// ─────────────────────────────────────────────────────────────────────────────
// Navigation item definitions
// ─────────────────────────────────────────────────────────────────────────────

const TOP_NAV_ITEMS = [
  { key: "candidates", label: "Candidates", route: "/(companyUser)/candidates", icon: "briefcase", iconSet: "feather" },
  { key: "networks", label: "Networks", route: "/(companyUser)/networks", icon: "users", iconSet: "feather" },
  { key: "explore", label: "Explore", route: "/(companyUser)/explore", icon: "earth", iconSet: "material" },
  { key: "record", label: "Record", route: "/(companyUser)/record", icon: "video", iconSet: "feather" },
  { key: "profile", label: "Profile", route: "/(companyUser)/profile", icon: "user", iconSet: "feather" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Label above + value below — used in About Us card and sidebar. */
function DetailRow({
  label,
  value,
  textColor,
  mutedColor,
}: {
  label: string;
  value: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 12, color: mutedColor, letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, lineHeight: 21, color: textColor }}>
        {value || "—"}
      </Text>
    </View>
  );
}

/** Tappable link row — used in the Contact Us sidebar panel. */
function SidebarLink({
  label,
  value,
  onPress,
  disabled,
  textColor,
  mutedColor,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled: boolean;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ gap: 2 }}>
      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 12, color: mutedColor, letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: FONTS.LEXEND_LIGHT,
          fontSize: 14,
          color: disabled ? mutedColor : textColor,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {value || "—"}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopNav
// ─────────────────────────────────────────────────────────────────────────────

export function TopNav({ pagePad }: { pagePad: number }) {
  const C = useDynColors();

  return (
    <View
      style={{
        height: 64,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.card,
        position: "relative",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: Math.max(18, pagePad - 6),
          top: 0,
          bottom: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        {TOP_NAV_ITEMS.map((item) => {
          const active = item.key === "profile";
          const color  = active ? C.accent : C.subtle;
          return (
            <Pressable
              key={item.key}
              onPress={() => { if (active) return; router.replace(item.route as any); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, opacity: active ? 1 : 0.92 }}
            >
              {item.iconSet === "material" ? (
                <MaterialCommunityIcons name={item.icon as any} size={16} color={color} />
              ) : (
                <Feather name={item.icon as any} size={16} color={color} />
              )}
              <Text style={{ fontFamily: FONTS.LEXEND_REGULAR, fontSize: 12, color }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ProfileBrandWordmark
        fontFamily={FONTS.LEXEND_LIGHT}
        size={28}
        markSize={18}
        markOffsetTop={1}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroSection  (avatar + name + mission/HQ + LIBRARY/EDIT/SETTINGS/REFRESH)
// ─────────────────────────────────────────────────────────────────────────────

export function HeroSection({
  profile,
  displayName,
  missionStatement,
  headquarters,
  isCompact,
  heroAvatarSize,
  sidebarWidth,
  refreshing,
  navReturnTo,
  openVideo,
  onRefresh,
}: {
  profile: any;
  displayName: string;
  missionStatement: string;
  headquarters: string;
  isCompact: boolean;
  heroAvatarSize: number;
  sidebarWidth: number;
  refreshing: boolean;
  navReturnTo: string;
  openVideo: (uri?: string) => void;
  onRefresh: () => void;
}) {
  const C = useDynColors();

  return (
    <View
      style={{
        flexDirection: isCompact ? "column" : "row",
        alignItems: isCompact ? "flex-start" : "center",
        gap: 28,
        paddingRight: isCompact ? 0 : sidebarWidth + 20,
      }}
    >
      {/* Avatar */}
      <Pressable onPress={() => openVideo(profile.avatarVideoUri)} hitSlop={10}>
        {profile.avatarImageUri?.trim() ? (
          <Image
            source={{ uri: profile.avatarImageUri }}
            style={{
              width: heroAvatarSize,
              height: heroAvatarSize,
              borderRadius: heroAvatarSize / 2,
              backgroundColor: "#e8ecef",
            }}
          />
        ) : (
          <View
            style={{
              width: heroAvatarSize,
              height: heroAvatarSize,
              borderRadius: heroAvatarSize / 2,
              backgroundColor: "#e8ecef",
            }}
          />
        )}
      </Pressable>

      {/* Name + mission/HQ */}
      <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
        <Pressable disabled hitSlop={10}>
          <Text
            style={{
              fontFamily: FONTS.LEXEND_LIGHT,
              fontSize: isCompact ? 38 : 50,
              lineHeight: isCompact ? 44 : 56,
              color: C.text,
            }}
          >
            {displayName}
          </Text>
        </Pressable>

        {!!missionStatement && (
          <Text
            style={{
              fontFamily: FONTS.LEXEND_LIGHT,
              fontSize: 15,
              lineHeight: 22,
              color: C.subtle,
              marginTop: 6,
            }}
          >
            {missionStatement}
          </Text>
        )}
        {!!headquarters && (
          <Text
            style={{
              fontFamily: FONTS.LEXEND_LIGHT,
              fontSize: 15,
              lineHeight: 22,
              color: C.subtle,
              marginTop: !!missionStatement ? 2 : 6,
            }}
          >
            📍 {headquarters}
          </Text>
        )}
      </View>

      {/* Quick-action column */}
      <View
        style={{
          width: isCompact ? "100%" : 132,
          gap: 13,
          alignSelf: isCompact ? "stretch" : "flex-start",
          paddingTop: 0,
          marginLeft: isCompact ? 0 : 10,
        }}
      >
        <Pressable
          onPress={() => router.push({ pathname: "/(companyUser)/video-library", params: { returnTo: navReturnTo } })}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>LIBRARY</Text>
          <Feather name="layers" size={18} color={C.text} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(companyUser)/profile-edit")}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>EDIT</Text>
          <Feather name="edit-2" size={18} color={C.text} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(companyUser)/settings")}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>SETTINGS</Text>
          <Feather name="settings" size={18} color={C.text} />
        </Pressable>

        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 2 }} />

        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: refreshing ? 0.45 : 1,
          }}
        >
          <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>REFRESH</Text>
          <Feather name="refresh-cw" size={18} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AboutUsCard  — always visible, full-width below the hero
// Shows: mission, core values, industry, benefits, locations, open roles
// ─────────────────────────────────────────────────────────────────────────────

export function AboutUsCard({
  pagePad,
  isCompact,
  sidebarWidth,
  coreValues,
  businessAge,
  industry,
  benefitsSummary,
  locations,
  openRoles,
  onOpenRolesModal,
}: {
  pagePad: number;
  isCompact: boolean;
  sidebarWidth: number;
  businessAge: string;
  coreValues: string[];
  industry: string;
  benefitsSummary: string;
  locations: string[];
  openRoles: any[];
  onOpenRolesModal: () => void;
}) {
  const C = useDynColors();

  const rows = [
    { label: "Core Values",       value: coreValues.length ? coreValues.join(", ") : "" },
    { label: "Industry",          value: industry || "" },
    { label: "Business Age",      value: businessAge || ""},
    { label: "Benefits",          value: benefitsSummary || "" },
    { label: "Locations",         value: locations.length ? locations.join(", ") : "" },
  ];

  return (
    <View
      style={[
        styles.floatingCard,
        {
          marginTop: 20,
          marginLeft: pagePad,
          marginRight: isCompact ? pagePad : sidebarWidth + pagePad,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderRadius: 14,
          gap: 24,
        },
      ]}
    >
      {/* Section label */}
      <Text
        style={{
          fontFamily: FONTS.LEXEND_LIGHT,
          fontSize: 13,
          letterSpacing: 2,
          color: C.text,
        }}
      >
        ABOUT US
      </Text>

      {/* Detail rows */}
      {rows.map((row) => (
        <DetailRow
          key={row.label}
          label={row.label}
          value={row.value}
          textColor={C.text}
          mutedColor={C.subtle}
        />
      ))}
    </View>
  );
}

export function OpenRolesCard({
  pagePad,
  isCompact,
  sidebarWidth,
  openRoles,
  onOpenRolesModal,
}: {
  pagePad: number;
  isCompact: boolean;
  sidebarWidth: number;
  openRoles: any[];
  onOpenRolesModal: () => void;
}) {
  const C = useDynColors();
  return (
    <View
      style={[
        styles.floatingCard,
        {
          marginTop: 20,
          marginLeft: pagePad,
          marginRight: isCompact ? pagePad : sidebarWidth + pagePad,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderRadius: 14,
          gap: 24,
        },
      ]}
    >
      {/* Section label */}
      <Text
        style={{
          fontFamily: FONTS.LEXEND_LIGHT,
          fontSize: 13,
          letterSpacing: 2,
          color: C.text,
        }}
      >
        OPEN ROLES
      </Text>

      {/* Open Roles — tappable count */}
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 12, color: C.subtle, letterSpacing: 0.5 }}>
          Open Roles
        </Text>
        <Pressable onPress={onOpenRolesModal}>
          <Text
            style={{
              fontFamily: FONTS.LEXEND_LIGHT,
              fontSize: 14,
              lineHeight: 21,
              color: openRoles.length > 0 ? ACCENT : C.text,
            }}
          >
            {openRoles.length > 0
              ? `${openRoles.length} open ${openRoles.length === 1 ? "role" : "roles"}`
              : "—"}
          </Text>
        </Pressable>
      </View>

    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// FirstConnectCard  (horizontal video rail)
// ─────────────────────────────────────────────────────────────────────────────

export function FirstConnectCard({
  pagePad,
  isCompact,
  sidebarWidth,
  railCardWidth,
  profile,
  videos,
  railRef,
  railScrollOffsetRef,
  openVideo,
  onScrollRail,
}: {
  pagePad: number;
  isCompact: boolean;
  sidebarWidth: number;
  railCardWidth: number;
  profile: any;
  videos: any[];
  railRef: React.RefObject<FlatList<any>>;
  railScrollOffsetRef: React.MutableRefObject<number>;
  openVideo: (uri?: string) => void;
  onScrollRail: (direction: -1 | 1) => void;
}) {
  const C = useDynColors();

  return (
    <View
      style={[
        styles.floatingCard,
        {
          marginTop: 16,
          marginLeft: pagePad,
          marginRight: isCompact ? pagePad : sidebarWidth + pagePad,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderRadius: 14,
        },
      ]}
    >
      <View style={{ flex: 1, flexDirection: "column" }}>
        <Text
          style={{
            fontFamily: FONTS.LEXEND_LIGHT,
            fontSize: 13,
            letterSpacing: 2,
            color: C.text,
            marginBottom: 14,
          }}
        >
          FIRST CONNECT
        </Text>

        <View
          style={{
            flex: 1,
            marginTop: -12,
            marginHorizontal: -pagePad,
            paddingTop: 20,
            paddingBottom: 18,
            paddingHorizontal: pagePad,
          }}
        >
          <FlatList
            ref={railRef}
            data={videos}
            horizontal
            keyExtractor={(item: any) =>
              String(item.id ?? `${item.slot ?? "x"}_${item.videoUri ?? ""}`)
            }
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 4 }}
            ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
            onScroll={(event) => {
              railScrollOffsetRef.current = event.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
            renderItem={({ item }: { item: any }) => {
              const uri     = String(item.videoUri ?? "").trim();
              const thumb   = String(item.imageUri ?? "").trim();
              const caption = String(item.caption ?? "Untitled");

              return (
                <Pressable
                  onPress={() => openVideo(uri)}
                  style={{
                    width: railCardWidth,
                    borderWidth: 1,
                    borderColor: "#9eb2bf",
                    borderRadius: 18,
                    backgroundColor: C.card,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
                    <Text style={{ fontFamily: FONTS.CRIMSON_REGULAR, fontSize: 18, lineHeight: 25, color: C.text }}>
                      {caption}
                    </Text>
                  </View>
                  <View style={{ aspectRatio: 0.98, backgroundColor: "#e8ecef" }}>
                    {!!thumb ? <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} /> : null}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View
                style={{
                  width: 320,
                  minHeight: 260,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 18,
                  backgroundColor: C.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 24,
                }}
              >
                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, lineHeight: 21, color: C.subtle, textAlign: "center" }}>
                  No response videos yet.
                </Text>
              </View>
            }
          />

          {videos.length > 0 ? (
            <View
              style={{
                marginTop: 9,
                flexDirection: "row",
                justifyContent: "center",
                gap: 12,
                marginLeft: isCompact ? 0 : 340,
              }}
            >
              <Pressable
                onPress={() => onScrollRail(-1)}
                style={{
                  width: 34, height: 34, borderRadius: 999, borderWidth: 1,
                  borderColor: "#9eb2bf", backgroundColor: C.card,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Feather name="arrow-left" size={14} color={C.subtle} />
              </Pressable>
              <Pressable
                onPress={() => onScrollRail(1)}
                style={{
                  width: 34, height: 34, borderRadius: 999, borderWidth: 1,
                  borderColor: "#9eb2bf", backgroundColor: C.card,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Feather name="arrow-right" size={14} color={C.subtle} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactSidebar  — right panel, always visible, no accordion
// Shows: Contact Us (email, phone, url1, url2) + Employees placeholder
// ─────────────────────────────────────────────────────────────────────────────

export function ContactSidebar({
  isCompact,
  sidebarWidth,
  companyEmail,
  companyPhone,
  profile,
  contactUrl1,
  contactUrl2,
  contactUrl1Label,
  contactUrl2Label,
  showUrl1,
  showUrl2,
  copyEmail,
  copyPhone,
  copyUrl,
  onLayout,
}: {
  isCompact: boolean;
  sidebarWidth: number;
  profile: any;
  companyEmail: string;
  companyPhone: string;
  contactUrl1: string;
  contactUrl2: string;
  contactUrl1Label: string;
  contactUrl2Label: string;
  showUrl1: boolean;
  showUrl2: boolean;
  copyEmail: () => void;
  copyPhone: () => void;
  copyUrl: (url: string) => void;
  onLayout: (event: any) => void;
}) {
  const C = useDynColors();

  return (
    <View
      onLayout={onLayout}
      style={{
        position: isCompact ? "relative" : "absolute",
        right: isCompact ? undefined : 0,
        top: isCompact ? undefined : 0,
        bottom: isCompact ? undefined : 0,
        width: isCompact ? "100%" : sidebarWidth,
        borderLeftWidth: isCompact ? 0 : 1,
        borderTopWidth: isCompact ? 1 : 0,
        borderColor: C.border,
        // backgroundColor: C.isDark ? "rgba(71,75,84,0.97)" : "rgba(251,251,251,0.95)",
        backgroundColor: profile.customBackgroundColor || "rgba(255,255,255,0.72)",
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingLeft: 35,
          paddingRight: 22,
          paddingTop: 28,
          paddingBottom: 36,
          gap: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── CONTACT US ── */}
        <Text
          style={{
            fontFamily: FONTS.LEXEND_LIGHT,
            fontSize: 13,
            letterSpacing: 2,
            color: C.text,
            marginBottom: 4,
          }}
        >
          CONTACT US
        </Text>

        <SidebarLink label="Email" value={companyEmail} onPress={copyEmail} disabled={!companyEmail} textColor={C.text} mutedColor={C.subtle} />
        <SidebarLink label="Phone" value={companyPhone} onPress={copyPhone} disabled={!companyPhone} textColor={C.text} mutedColor={C.subtle} />

        {showUrl1 ? (
          <SidebarLink
            label={contactUrl1Label}
            value={contactUrl1}
            onPress={() => copyUrl(contactUrl1)}
            disabled={!contactUrl1}
            textColor={C.text}
            mutedColor={C.subtle}
          />
        ) : null}

        {showUrl2 ? (
          <SidebarLink
            label={contactUrl2Label}
            value={contactUrl2}
            onPress={() => copyUrl(contactUrl2)}
            disabled={!contactUrl2}
            textColor={C.text}
            mutedColor={C.subtle}
          />
        ) : null}

        {/* ── Divider ── */}
        <View style={{ height: 1, backgroundColor: C.border }} />

        {/* ── EMPLOYEES — placeholder for future data ── */}
        <Text
          style={{
            fontFamily: FONTS.LEXEND_LIGHT,
            fontSize: 13,
            letterSpacing: 2,
            color: C.text,
            marginBottom: 4,
          }}
        >
          EMPLOYEES
        </Text>

        <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, color: C.subtle }}>
          —
        </Text>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RolesModal - this modal is used to show the open roles available, in group card view with all the information that was provided on the profile
// ─────────────────────────────────────────────────────────────────────────────

export function RolesModal({
  visible,
  openRoles,
  screenWidth,
  onClose,
}: {
  visible: boolean;
  openRoles: any[];
  screenWidth: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: WHITE,
            borderRadius: 18,
            width: Math.min(560, screenWidth - 48),
            maxHeight: "80%",
            overflow: "hidden",
          }}
          onPress={() => {}}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 28,
              paddingTop: 24,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
            }}
          >
            <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 16, color: TEXT }}>Open Roles</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color={MUTED} />
            </Pressable>
          </View>

          {/* Role cards */}
          <ScrollView contentContainerStyle={{ padding: 28, gap: 20 }}>
            {openRoles.map((role: any) => (
              <View
                key={role.id}
                style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 20, gap: 12, backgroundColor: BG }}
              >
                <Text style={{ fontFamily: FONTS.LEXEND_REGULAR, fontSize: 15, color: TEXT }}>
                  {role.title || "—"}
                </Text>

                <View style={{ gap: 8 }}>
                  {!!role.workType && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED, width: 100 }}>Work Type</Text>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: TEXT, flex: 1 }}>{role.workType}</Text>
                    </View>
                  )}
                  {!!role.location && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED, width: 100 }}>Location</Text>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: TEXT, flex: 1 }}>📍{role.location}</Text>
                    </View>
                  )}
                  {!!role.salary && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED, width: 100 }}>Salary</Text>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: TEXT, flex: 1 }}>{role.salary}</Text>
                    </View>
                  )}
                  {role.skills?.length > 0 && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED, width: 100 }}>Skills</Text>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: TEXT, flex: 1 }}>{role.skills.join(", ")}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED, width: 100 }}>Relocation</Text>
                    <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: TEXT, flex: 1 }}>
                      {role.isRelocationCovered ? "Covered" : "Not covered"}
                    </Text>
                  </View>
                  {!!role.postUrl && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED, width: 100 }}>Post URL</Text>
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: ACCENT, flex: 1 }}>{role.postUrl}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}