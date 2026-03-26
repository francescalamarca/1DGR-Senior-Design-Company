import { ProfileBrandWordmark } from "@/src/components/ProfileBrandWordmark";
import { RequireUserType } from "@/src/components/RequireUserType";
import {
  HIGHER_ED_ITEM_GAP,
  softWrapLongTokens,
  useCompanyProfileScreenData,
  type QualRow,
  type QualRowValue,
} from "@/src/features/profile/edit/profileScreen.shared";
import { useSession } from "@/src/state/session";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FONTS = {
  LEXEND_LIGHT: "Lexend-Light",
  LEXEND_REGULAR: "Lexend-Regular",
  LEXEND_BOLD: "Lexend-Bold",
  CRIMSON_REGULAR: "CrimsonText-Regular",
} as const;

const BG = "#eef2f4";
const PAPER = "#fbfbfb";
const WHITE = "#ffffff";
const TEXT = "#202020";
const MUTED = "#718896";
const BORDER = "#d6dde2";
const DARK = "#1a1b1d";
const ACCENT = "#9bb4c0";

const TOP_NAV_ITEMS = [
  { key: "companies", label: "Companies", route: "/(companyUser)/companies", icon: "briefcase", iconSet: "feather" },
  { key: "networks", label: "Networks", route: "/(companyUser)/networks", icon: "users", iconSet: "feather" },
  { key: "explore", label: "Explore", route: "/(companyUser)/explore", icon: "earth", iconSet: "material" },
  { key: "record", label: "Record", route: "/(companyUser)/record", icon: "video", iconSet: "feather" },
  { key: "profile", label: "Profile", route: "/(companyUser)/profile", icon: "user", iconSet: "feather" },
] as const;

function QualValue({ value, textStyle }: { value: QualRowValue; textStyle: any }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={textStyle}>—</Text>;

    return (
      <View>
        {value.map((item, idx) => (
          <Text
            key={`${idx}_${item}`}
            style={[textStyle, idx === value.length - 1 ? null : { marginBottom: HIGHER_ED_ITEM_GAP }]}
          >
            {softWrapLongTokens(item)}
          </Text>
        ))}
      </View>
    );
  }

  return <Text style={textStyle}>{softWrapLongTokens(value)}</Text>;
}

function DetailRow({ row }: { row: QualRow }) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily: FONTS.LEXEND_LIGHT,
          fontSize: 13,
          color: MUTED,
        }}
      >
        {row.label}
      </Text>
      <QualValue
        value={row.value}
        textStyle={{
          fontFamily: FONTS.LEXEND_LIGHT,
          fontSize: 14,
          lineHeight: 21,
          color: TEXT,
        }}
      />
    </View>
  );
}

function SidebarLink({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED }}>{label}</Text>
      <Pressable onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
        <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, lineHeight: 21, color: TEXT }}>
          {value || "—"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ProfileWebScreen() {
  const { logout } = useSession();
  const { width } = useWindowDimensions();
  const railRef = useRef<FlatList<any> | null>(null);
  const railScrollOffsetRef = useRef(0);
  const {
    profile,
    liveProfileUrl,
    copyLiveAsUrl,
    copyEmail,
    copyPhone,
    copyUrl,
    refreshing,
    fetchLatestProfile,
    displayName,
    missionStatement,
    industry,
    locations,
    videos,
    contactEmail,
    contactPhone,
    contactUrl1,
    contactUrl2,
    contactUrl1Label,
    contactUrl2Label,
    showUrl1,
    showUrl2,
    openVideo,
  } = useCompanyProfileScreenData();

  // Company-specific derived values (replacing individual-user fields)
  const canToggleName = false;
  const toggleDisplayName = () => {};
  const headlineText = industry || "";
  const hookText = missionStatement || "";
  const qualCol1: any[] = [];
  const qualCol2: any[] = locations.map((loc) => ({ label: "Location", value: loc }));
  const workTypeDisplay = String((profile as any).workType ?? "").trim();

  const [liveQrModalOpen, setLiveQrModalOpen] = useState(false);
  const [liveQrCopyToken, setLiveQrCopyToken] = useState<number | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarColumnHeight, setSidebarColumnHeight] = useState(760);
  const sidebarAnimation = useRef(new Animated.Value(0)).current;

  const isCompact = width < 1180;
  const pagePad = width < 1440 ? 32 : 48;
  const heroAvatarSize = width < 1180 ? 128 : 164;
  const railCardWidth = Math.min(360, Math.max(268, Math.round(width * 0.2)));
  const railStep = railCardWidth + 20;
  const sidebarRows = useMemo(() => [...qualCol1, ...qualCol2], [qualCol1, qualCol2]);
  const sidebarPanelHeight = isCompact ? 540 : Math.max(sidebarColumnHeight, 760);
  const collapsedPanelHeight = 250;
  const sidebarWidth = isCompact ? 0 : 450;
  const locationRow = useMemo(
    () => sidebarRows.find((row) => row.label.toLowerCase().includes("location")),
    [sidebarRows]
  );
  const educationRow = useMemo(
    () => sidebarRows.find((row) => row.label.toLowerCase().includes("education")),
    [sidebarRows]
  );
  const collapsedEducationPreview = useMemo(() => {
    if (!educationRow) return "—";
    if (Array.isArray(educationRow.value)) return educationRow.value[0] ?? "—";
    return educationRow.value;
  }, [educationRow]);
  const collapsedLocationPreview = useMemo(() => {
    if (!locationRow) return "—";
    if (Array.isArray(locationRow.value)) return locationRow.value[0] ?? "—";
    return locationRow.value;
  }, [locationRow]);
  const collapsedSeekingPreview = useMemo(() => {
    const trimmed = workTypeDisplay.replace(/^Seeking\s+/i, "").replace(/\s+Work$/i, "").trim();
    return trimmed || "—";
  }, [workTypeDisplay]);
  const navReturnTo = "/(homeUser)/profile";

  function scrollRail(direction: -1 | 1) {
    const nextOffset = Math.max(0, railScrollOffsetRef.current + direction * railStep);
    railRef.current?.scrollToOffset({ offset: nextOffset, animated: true });
    railScrollOffsetRef.current = nextOffset;
  }

  function toggleSidebar() {
    const nextOpen = !sidebarOpen;
    setSidebarOpen(nextOpen);
    Animated.timing(sidebarAnimation, {
      toValue: nextOpen ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }

  const animatedPanelHeight = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedPanelHeight, sidebarPanelHeight],
  });
  const animatedExpandedOpacity = sidebarAnimation.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0.15, 1],
  });
  const animatedExpandedHeight = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, sidebarPanelHeight - collapsedPanelHeight)],
  });
  const animatedSummaryOpacity = sidebarAnimation.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 0.25, 0],
  });
  return (
    <>
      <RequireUserType type="home" />

      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: PAPER }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: PAPER }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLatestProfile} />}
        >
          <View
            style={{
              height: 64,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: WHITE,
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
                const color = active ? ACCENT : MUTED;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      if (active) return;
                      router.replace(item.route as any);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      opacity: active ? 1 : 0.92,
                    }}
                  >
                    {item.iconSet === "material" ? (
                      <MaterialCommunityIcons name={item.icon as any} size={16} color={color} />
                    ) : (
                      <Feather name={item.icon as any} size={16} color={color} />
                    )}
                    <Text
                      style={{
                        fontFamily: FONTS.LEXEND_REGULAR,
                        fontSize: 12,
                        color,
                      }}
                    >
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

          <View
            style={{
              backgroundColor: PAPER,
              paddingHorizontal: 0,
              paddingTop: 0,
              paddingBottom: 0,
            }}
          >
            <View
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                gap: 0,
                backgroundColor: WHITE,
                borderTopWidth: 1,
                borderTopColor: BORDER,
                position: "relative",
              }}
            >
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: pagePad,
                  paddingTop: 22,
                  paddingBottom: 22,
                  minWidth: 0,
                }}
              >
                <View
                  style={{
                    flexDirection: isCompact ? "column" : "row",
                    alignItems: isCompact ? "flex-start" : "center",
                    gap: 28,
                    paddingRight: isCompact ? 0 : sidebarWidth + -5,
                  }}
                >
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

                  <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
                    <Pressable disabled={!canToggleName} onPress={toggleDisplayName} hitSlop={10}>
                      <Text
                        style={{
                          fontFamily: FONTS.LEXEND_LIGHT,
                          fontSize: isCompact ? 38 : 50,
                          lineHeight: isCompact ? 44 : 56,
                          color: TEXT,
                        }}
                      >
                        {displayName}
                      </Text>
                    </Pressable>

                    <Text
                      style={{
                        fontFamily: FONTS.CRIMSON_REGULAR,
                        fontSize: isCompact ? 22 : 27,
                        lineHeight: isCompact ? 31 : 37,
                        color: TEXT,
                        maxWidth: 700,
                      }}
                    >
                      {hookText || "—"}
                    </Text>
                  </View>

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
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: MUTED }}>
                        LIBRARY
                      </Text>
                      <Feather name="layers" size={18} color={TEXT} />
                    </Pressable>

                    <Pressable
                      onPress={() => router.push("/(companyUser)/profile-edit")}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: MUTED }}>
                        EDIT
                      </Text>
                      <Feather name="edit-2" size={18} color={TEXT} />
                    </Pressable>

                    <Pressable
                      onPress={() => router.push("/(companyUser)/settings")}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: MUTED }}>
                        SETTINGS
                      </Text>
                      <Feather name="settings" size={18} color={TEXT} />
                    </Pressable>

                    <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 2 }} />

                    <Pressable
                      onPress={fetchLatestProfile}
                      disabled={refreshing}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        opacity: refreshing ? 0.45 : 1,
                      }}
                    >
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: MUTED }}>
                        REFRESH
                      </Text>
                      <Feather name="refresh-cw" size={18} color={TEXT} />
                    </Pressable>

                    <Pressable
                      onPress={() => setLiveQrModalOpen(true)}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: MUTED }}>
                        SHARE
                      </Text>
                      <Feather name="share" size={18} color={TEXT} />
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 40, paddingHorizontal: pagePad }}>
                <Text
                  style={{
                    fontFamily: FONTS.LEXEND_LIGHT,
                    fontSize: 13,
                    letterSpacing: 2,
                    color: TEXT,
                    marginBottom: 14,
                  }}
                >
                  FIRST CONNECT
                </Text>

                <LinearGradient
                  colors={["#ffffff", "#eef4f7", "#dfe9ee"]}
                  locations={[0, 0.08, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ marginTop: -12, marginHorizontal: -pagePad, paddingTop: 20, paddingBottom: 18, paddingHorizontal: pagePad }}
                >
                  <FlatList
                    ref={railRef}
                    data={videos}
                    horizontal
                    keyExtractor={(item: any) => String(item.id ?? `${item.slot ?? "x"}_${item.videoUri ?? ""}`)}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 4 }}
                    ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
                    onScroll={(event) => {
                      railScrollOffsetRef.current = event.nativeEvent.contentOffset.x;
                    }}
                    scrollEventThrottle={16}
                    renderItem={({ item }: { item: any }) => {
                      const uri = String(item.videoUri ?? "").trim();
                      const thumb = String(item.imageUri ?? "").trim();
                      const caption = String(item.caption ?? "Untitled");

                      return (
                        <Pressable
                          onPress={() => openVideo(uri)}
                          style={{
                            width: railCardWidth,
                            borderWidth: 1,
                            borderColor: "#9eb2bf",
                            borderRadius: 18,
                            backgroundColor: WHITE,
                            overflow: "hidden",
                          }}
                        >
                          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
                            <Text
                              style={{
                                fontFamily: FONTS.CRIMSON_REGULAR,
                                fontSize: 18,
                                lineHeight: 25,
                                color: TEXT,
                              }}
                            >
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
                          borderColor: BORDER,
                          borderRadius: 18,
                          backgroundColor: PAPER,
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 24,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONTS.LEXEND_LIGHT,
                            fontSize: 14,
                            lineHeight: 21,
                            color: MUTED,
                            textAlign: "center",
                          }}
                        >
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
                        onPress={() => scrollRail(-1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: "#9eb2bf",
                          backgroundColor: WHITE,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="arrow-left" size={14} color={MUTED} />
                      </Pressable>

                      <Pressable
                        onPress={() => scrollRail(1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: "#9eb2bf",
                          backgroundColor: WHITE,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="arrow-right" size={14} color={MUTED} />
                      </Pressable>
                    </View>
                  ) : null}
                </LinearGradient>
              </View>

              <View
                onLayout={(event) => {
                  if (!isCompact) {
                    setSidebarColumnHeight(event.nativeEvent.layout.height);
                  }
                }}
                style={{
                  position: isCompact ? "relative" : "absolute",
                  right: isCompact ? undefined : 0,
                  top: isCompact ? undefined : 0,
                  bottom: isCompact ? undefined : 0,
                  width: isCompact ? "100%" : sidebarWidth,
                  borderLeftWidth: isCompact || !sidebarOpen ? 0 : 1,
                  borderTopWidth: isCompact ? 1 : 0,
                  borderColor: BORDER,
                  backgroundColor: "transparent",
                  overflow: "visible",
                }}
              >
                <Animated.View
                  style={{
                    height: isCompact ? undefined : animatedPanelHeight,
                    backgroundColor: "rgba(251,251,251,0.95)",
                    borderLeftWidth: !sidebarOpen && !isCompact ? 1 : 0,
                    borderRightWidth: !sidebarOpen && !isCompact ? 1 : 0,
                    borderBottomWidth: 0,
                    borderColor: !sidebarOpen && !isCompact ? "rgba(214, 221, 226, 0.95)" : "transparent",
                    overflow: sidebarOpen ? "hidden" : "visible",
                  }}
                >
                  <Pressable
                    onPress={toggleSidebar}
                    style={{
                      paddingLeft: 35,
                      paddingRight: 22,
                      paddingVertical: 20,
                      borderBottomWidth: sidebarOpen ? 1 : 0,
                      borderBottomColor: "rgba(214, 221, 226, 0.9)",
                      backgroundColor: "rgba(255,255,255,0.72)",
                      flexDirection: "row",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, gap: 12, paddingRight: 18, paddingTop: 4 }}>
                      <Text
                        style={{
                          fontFamily: FONTS.LEXEND_LIGHT,
                          fontSize: 13,
                          letterSpacing: 2,
                          color: TEXT,
                        }}
                      >
                        ABOUT US
                      </Text>

                      <Animated.View
                        pointerEvents={sidebarOpen ? "none" : "auto"}
                        style={{
                          paddingTop: 8,
                          opacity: animatedSummaryOpacity,
                          display: sidebarOpen ? "none" : "flex",
                        }}
                      >
                        <LinearGradient
                          colors={["rgba(251,251,251,1)", "rgba(251,251,251,0.98)", "rgba(251,251,251,0)"]}
                          locations={[0, 0.72, 1]}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={{
                            height: 205,
                            marginLeft: -4,
                            marginRight: -6,
                            paddingLeft: 4,
                            paddingRight: 6,
                            paddingBottom: 2,
                          }}
                        >
                          <View
                            style={{
                              height: 220,
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            <View style={{ gap: 14 }}>
                              <View style={{ gap: 6 }}>
                                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED }}>
                                  Mission
                                </Text>
                                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 15, lineHeight: 22, color: TEXT }}>
                                  {softWrapLongTokens(collapsedLocationPreview)}
                                </Text>
                              </View>

                              <View style={{ gap: 6 }}>
                                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED }}>
                                  Core Values
                                </Text>
                                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 15, lineHeight: 22, color: TEXT }}>
                                  {softWrapLongTokens(collapsedSeekingPreview)}
                                </Text>
                              </View>

                              <View style={{ gap: 6 }}>
                                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED }}>
                                  Locations
                                </Text>
                                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 15, lineHeight: 22, color: TEXT }}>
                                  {softWrapLongTokens(collapsedEducationPreview)}
                                </Text>
                              </View>
                            </View>

                            <LinearGradient
                              pointerEvents="none"
                              colors={["rgba(251,251,251,0)", "rgba(251,251,251,0.72)", "rgba(251,251,251,1)"]}
                              locations={[0, 0.28, 1]}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={{
                                position: "absolute",
                                left: -24,
                                right: -20,
                                bottom: 0,
                                height: 84,
                              }}
                            />
                          </View>
                        </LinearGradient>
                      </Animated.View>
                    </View>

                    <Feather
                      name={sidebarOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={TEXT}
                    />
                  </Pressable>

                  <Animated.View
                    style={{
                      height: animatedExpandedHeight,
                      opacity: animatedExpandedOpacity,
                    }}
                    pointerEvents={sidebarOpen ? "auto" : "none"}
                  >
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingLeft: 35, paddingRight: 22, paddingTop: 22, paddingBottom: 36, gap: 28 }}
                      showsVerticalScrollIndicator
                    >
                      {sidebarRows.map((row) => (
                        <DetailRow key={row.label} row={row} />
                      ))}

                      <View style={{ height: 1, backgroundColor: BORDER }} />

                      <View style={{ gap: 20 }}>
                        <SidebarLink label="Live profile" value={liveProfileUrl} onPress={copyLiveAsUrl} />
                        <SidebarLink label="Email" value={contactEmail} onPress={copyEmail} disabled={!contactEmail} />
                        <SidebarLink label="Phone" value={contactPhone} onPress={copyPhone} disabled={!contactPhone} />
                        {showUrl1 ? (
                          <SidebarLink
                            label={contactUrl1Label}
                            value={contactUrl1}
                            onPress={() => copyUrl(contactUrl1)}
                            disabled={!contactUrl1}
                          />
                        ) : null}
                        {showUrl2 ? (
                          <SidebarLink
                            label={contactUrl2Label}
                            value={contactUrl2}
                            onPress={() => copyUrl(contactUrl2)}
                            disabled={!contactUrl2}
                          />
                        ) : null}
                      </View>

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 8 }}>
                        <Pressable
                          onPress={() => router.push("/(companyUser)/profile-edit")}
                          style={{
                            paddingHorizontal: 18,
                            paddingVertical: 11,
                            borderRadius: 12,
                            backgroundColor: "#8ca1ae",
                          }}
                        >
                          <Text style={{ fontFamily: FONTS.LEXEND_REGULAR, color: WHITE }}>Edit Profile</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            router.push({ pathname: "/(companyUser)/video-library", params: { returnTo: navReturnTo } })
                          }
                          style={{
                            paddingHorizontal: 18,
                            paddingVertical: 11,
                            borderRadius: 12,
                            backgroundColor: "#8ca1ae",
                          }}
                        >
                          <Text style={{ fontFamily: FONTS.LEXEND_REGULAR, color: WHITE }}>Video Library</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => router.push("/(companyUser)/settings")}
                          style={{
                            paddingHorizontal: 18,
                            paddingVertical: 11,
                            borderRadius: 12,
                            backgroundColor: "#8ca1ae",
                          }}
                        >
                          <Text style={{ fontFamily: FONTS.LEXEND_REGULAR, color: WHITE }}>Settings</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  </Animated.View>
                </Animated.View>

              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: DARK,
              paddingHorizontal: pagePad,
              paddingVertical: 40,
              flexDirection: isCompact ? "column" : "row",
              justifyContent: "space-between",
              gap: 28,
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.LEXEND_LIGHT,
                fontSize: isCompact ? 24 : 28,
                lineHeight: isCompact ? 34 : 40,
                color: WHITE,
                maxWidth: 360,
              }}
            >
              one degree,
              {"\n"}one conversation,
              {"\n"}one connection,
              {"\n"}can change everything.
            </Text>

            <View style={{ alignItems: isCompact ? "flex-start" : "flex-end", gap: 18 }}>
              <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 32, color: WHITE }}>1DGR°</Text>
              <Pressable onPress={() => router.push("/(companyUser)/settings")}>
                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, letterSpacing: 1.6, color: "#aab6be" }}>
                  SETTINGS
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  logout();
                  router.replace("/(auth)/login");
                }}
              >
                <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, letterSpacing: 1.6, color: "#aab6be" }}>
                  LOGOUT
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <Modal visible={liveQrModalOpen} transparent animationType="fade" onRequestClose={() => setLiveQrModalOpen(false)}>
          <Pressable
            onPress={() => setLiveQrModalOpen(false)}
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.38)", justifyContent: "center", alignItems: "center", padding: 24 }}
          >
            <Pressable
              onPress={() => {}}
              style={{ width: "100%", maxWidth: 460, borderRadius: 20, backgroundColor: WHITE, padding: 24 }}
            >
              <Text
                style={{
                  fontFamily: FONTS.LEXEND_REGULAR,
                  fontSize: 20,
                  color: TEXT,
                  textAlign: "center",
                }}
              >
                Live QR Code
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.LEXEND_LIGHT,
                  fontSize: 13,
                  color: MUTED,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Tap the QR code to copy.
              </Text>

              <View style={{ marginTop: 18, alignItems: "center", justifyContent: "center" }}>
                <shareLinkQR url={liveProfileUrl} size={280} copyOnToken={liveQrCopyToken} />
              </View>

              <View style={{ marginTop: 22, flexDirection: "row", gap: 12 }}>
                <Pressable
                  onPress={() => setLiveQrCopyToken((n) => (typeof n === "number" ? n + 1 : 1))}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: PAPER,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, color: TEXT }}>Copy QR code</Text>
                </Pressable>
                <Pressable
                  onPress={copyLiveAsUrl}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: PAPER,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, color: TEXT }}>Copy URL</Text>
                </Pressable>
                <Pressable
                  onPress={() => setLiveQrModalOpen(false)}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: WHITE,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, color: TEXT }}>Close</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}
