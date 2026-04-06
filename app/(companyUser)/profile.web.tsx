/*
THIS IS THE WEB BASED PROFILE APPEARANCE, WILL LOOK SLIGHTLY DIFFERENT THAN MOBILE
company name section
- mission
- headquarters location with the pin emoji
- maybe industry would be good to include here?
About Us
- have the about below the mission section
- this will have all information in the about except for current employees which will be in the side bar
- may try both views with and without the side bar to see what looks cleanest
*/


import { ProfileBrandWordmark } from "@/src/components/ProfileBrandWordmark";
import { WebFooter } from "@/src/components/WebFooter";
import { RequireUserType } from "@/src/components/RequireUserType";
import {
  softWrapLongTokens,
  useCompanyProfileScreenData,
  type QualRow,
  type QualRowValue,
} from "@/src/features/profile/edit/profileScreen.shared";
import { useSession } from "@/src/state/session";
import { useDynColors } from "@/src/state/theme-colors";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { styles } from "@/src/features/profile/edit/profileEdit.styles";

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
const ACCENT = "#9bb4c0";

const TOP_NAV_ITEMS = [
  { key: "candidates", label: "Candidates", route: "/(companyUser)/candidates", icon: "briefcase", iconSet: "feather" },
  { key: "networks", label: "Networks", route: "/(companyUser)/networks", icon: "users", iconSet: "feather" },
  { key: "explore", label: "Explore", route: "/(companyUser)/explore", icon: "earth", iconSet: "material" },
  { key: "record", label: "Record", route: "/(companyUser)/record", icon: "video", iconSet: "feather" },
  { key: "profile", label: "Profile", route: "/(companyUser)/profile", icon: "user", iconSet: "feather" },
] as const;


/*
Array (string[]): renders each item as its own Text line with spacing between them (e.g. a list of skills or education entries)
Single value (line 70): renders it as a single Text element

renders a profile field's value
- If the value is an array (e.g. a list of core values or locations), it renders each item as its own Text line with a small gap between them. Empty array shows —.
- If the value is a single string, it just renders one Text element.
- Both cases run the value through softWrapLongTokens to prevent layout breakage from long unbroken strings.

*/
function QualValue({ value, textStyle }: { value: QualRowValue; textStyle: any }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={textStyle}>—</Text>;

    return (
      <View>
        {value.map((item, idx) => (
          <Text
            key={`${idx}_${item}`}
            style={[textStyle, idx === value.length - 1 ? null : { marginBottom: 1 }]}
          >
            {softWrapLongTokens(item)}
          </Text>
        ))}
      </View>
    );
  }

  return <Text style={textStyle}>{softWrapLongTokens(value)}</Text>;
}

/*
renders one labeled fielf in the sidebar
- Shows the field's label (e.g. "Mission Statement", "Industry") in small muted text above.
- Then renders the value below it using QualValue.
- Accepts optional textColor/mutedColor so it can adapt to dark mode via the dynamic colors from C.
*/
function DetailRow({ row, textColor = TEXT, mutedColor = MUTED }: { row: QualRow; textColor?: string; mutedColor?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: mutedColor }}>
        {row.label}
      </Text>
      <QualValue
        value={row.value}
        textStyle={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, lineHeight: 21, color: textColor }}
      />
    </View>
  );
}

/*
the two functions above builds an array of {label, value} objects, and each one is 
rendered as a <DetailRow> inside the "ABOUT US" expandable panel
*/
function SidebarLink({
  label,
  value,
  onPress,
  disabled,
  textColor = TEXT,
  mutedColor = MUTED,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  textColor?: string;
  mutedColor?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: mutedColor }}>{label}</Text>
      <Pressable onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
        <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, lineHeight: 21, color: textColor }}>
          {value || "—"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ProfileWebScreen() {
  const C = useDynColors();
  const { logout } = useSession();
  const { width, height: windowHeight } = useWindowDimensions();
  const railRef = useRef<FlatList<any> | null>(null);
  const railScrollOffsetRef = useRef(0);
  const scrollViewRef = useRef<any>(null);
  const {
    profile,
    copyEmail,
    copyPhone,
    copyUrl,
    refreshing,
    fetchLatestProfile,
    displayName,
    missionStatement,
    headquarters,
    benefitsSummary,
    coreValues,
    industry,
    locations,
    videos,
    companyEmail,
    companyPhone,
    contactUrl1,
    contactUrl2,
    contactUrl1Label,
    contactUrl2Label,
    showUrl1,
    showUrl2,
    openVideo,
    openRoles,
  } = useCompanyProfileScreenData();

  // Company-specific derived values (replacing individual-user fields)
  const canToggleName = false;
  const toggleDisplayName = () => {};

  // Sidebar rows shown in the expanded ABOUT US panel
  // const [liveQrModalOpen, setLiveQrModalOpen] = useState(false);
  // const [liveQrCopyToken, setLiveQrCopyToken] = useState<number | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [sidebarColumnHeight, setSidebarColumnHeight] = useState(760);
  const sidebarAnimation = useRef(new Animated.Value(0)).current;

  const isCompact = width < 1280;
  const pagePad = Math.max(20, Math.min(64, Math.round(width * 0.035)));
  const heroAvatarSize = width < 1180 ? 128 : 164;
  const railCardWidth = Math.min(360, Math.round(width * 0.22));
  const railStep = railCardWidth + 20;
  const sidebarRows = useMemo(() => { //changed this so that they only change when a dep is changed, not every render
    const qualCol1: any[] = [];
    const qualCol2: any[] = [
      { label: "Mission Statement", value: missionStatement || "—" },
      { label: "Core Values", value: coreValues.length ? coreValues.join(", ") : "—" },
      { label: "Industry", value: industry || "—" },
      { label: "Benefits", value: benefitsSummary || "—" },
      { label: "Locations", value: locations.length ? locations.join(", ") : "—" },
    ];
    return [...qualCol1, ...qualCol2];
  }, [missionStatement, coreValues, industry, benefitsSummary, locations]);
  const collapsedPanelHeight = 64; // just the header row (ABOUT US + chevron)
  const sidebarPanelHeight = isCompact ? 540 : Math.max(sidebarColumnHeight, collapsedPanelHeight + 200);
  const sidebarWidth = isCompact ? 0 : Math.round(width * 0.32);
  const navReturnTo = "/(companyUser)/profile";

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
  return (
    <>
      <RequireUserType type="company" />

      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLatestProfile} />}
        >
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
                const color = active ? C.accent : C.subtle;

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
              flex: 1,
              backgroundColor: C.bg,
              paddingHorizontal: 0,
              paddingTop: 0,
              paddingBottom: 0,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "column",
                alignItems: "stretch",
                gap: 0,
                backgroundColor: C.card,
                borderTopWidth: 1,
                borderTopColor: C.border,
                position: "relative",
              }}
            > {/* side bar start of formatting */}
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
                    paddingRight: isCompact ? 0 : sidebarWidth + 20,
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
                          color: C.text,
                        }}
                      >
                        {displayName}
                      </Text>
                    </Pressable>

                    {(!!missionStatement || !!headquarters) && (
                      <Text
                        style={{
                          fontFamily: FONTS.LEXEND_LIGHT,
                          fontSize: 15,
                          lineHeight: 22,
                          color: C.subtle,
                          marginTop: 6,
                        }}
                      >
                        {missionStatement} - 📍 {headquarters}
                      </Text>
                    )}

                  </View>
                  {/* This is where the side window in the web view is to get settings, edit, library, etc*/}
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
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>
                        LIBRARY
                      </Text>
                      <Feather name="layers" size={18} color={C.text} />
                    </Pressable>

                    <Pressable
                      onPress={() => router.push("/(companyUser)/profile-edit")}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>
                        EDIT
                      </Text>
                      <Feather name="edit-2" size={18} color={C.text} />
                    </Pressable>

                    <Pressable
                      onPress={() => router.push("/(companyUser)/settings")}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>
                        SETTINGS
                      </Text>
                      <Feather name="settings" size={18} color={C.text} />
                    </Pressable>

                    <View style={{ height: 1, backgroundColor: C.border, marginVertical: 2 }} />

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
                      <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, letterSpacing: 1.6, color: C.subtle }}>
                        REFRESH
                      </Text>
                      <Feather name="refresh-cw" size={18} color={C.text} />
                    </Pressable>

                  </View> {/* close view of the controls on the right */}
                </View>
              </View>

              {/* moving the about page here with all information shown*/}
              <View style={[styles.floatingCard, { marginTop: 20, marginHorizontal: pagePad, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderRadius: 14 }]}>
                <Text
                  style={{
                    fontFamily: FONTS.LEXEND_LIGHT,
                    fontSize: 13,
                    letterSpacing: 2,
                    color: C.text,
                    marginBottom: 14,
                  }}
                >
                  ABOUT US
                </Text>

                <Text style={styles.header}>
                  Company Culture
                </Text>
              </View>

              <View style={[styles.floatingCard, { marginTop: 16, marginHorizontal: pagePad, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderRadius: 14 }]}>
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
                    style={{ flex: 1, marginTop: -12, marginHorizontal: -pagePad, paddingTop: 20, paddingBottom: 18, paddingHorizontal: pagePad, backgroundColor: profile.customBackgroundColor || "rgba(255,255,255,0.72)" }}
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
                              backgroundColor: C.card,
                              overflow: "hidden",
                            }}
                          >
                            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
                              <Text
                                style={{
                                  fontFamily: FONTS.CRIMSON_REGULAR,
                                  fontSize: 18,
                                  lineHeight: 25,
                                  color: C.text,
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
                            borderColor: C.border,
                            borderRadius: 18,
                            backgroundColor: C.bg,
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
                              color: C.subtle,
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
                            backgroundColor: C.card,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather name="arrow-left" size={14} color={C.subtle} />
                        </Pressable>

                        <Pressable
                          onPress={() => scrollRail(1)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: "#9eb2bf",
                            backgroundColor: C.card,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather name="arrow-right" size={14} color={C.subtle} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View> {/* closes inner column View */}
              </View> {/* closes floatingCard (FIRST CONNECT) */}

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
                  borderColor: C.border,
                  backgroundColor: "transparent",
                  overflow: "visible",
                }}
              >
                <Animated.View
                  style={{
                    height: animatedPanelHeight,
                    backgroundColor: C.isDark ? "rgba(71,75,84,0.97)" : "rgba(251,251,251,0.95)",
                    borderLeftWidth: !sidebarOpen && !isCompact ? 1 : 0,
                    borderRightWidth: !sidebarOpen && !isCompact ? 1 : 0,
                    borderBottomWidth: 0,
                    borderColor: !sidebarOpen && !isCompact ? "rgba(214, 221, 226, 0.95)" : "transparent",
                    overflow: "hidden",
                  }}
                >
                  <Pressable
                    onPress={toggleSidebar}
                    style={{
                      paddingLeft: 35,
                      paddingRight: 22,
                      paddingVertical: 20,
                      borderBottomWidth: sidebarOpen ? 1 : 1, //cheating the system here because the whole side bar functionality is already set, the only option is to be open
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
                          color: C.text,
                        }}
                      >
                        CONTACT US
                      </Text>

                      <View style={{ paddingLeft: 1, paddingRight: 22, paddingTop: 20, paddingBottom: 28, gap: 20 }}>

                      <View style={{ gap: 20 }}>
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
                      </View>

                    </View>

                    </View>

                    {/* <Feather
                      name={sidebarOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={C.text}
                    /> */}
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
                        <DetailRow key={row.label} row={row} textColor={C.text} mutedColor={C.subtle} />
                      ))}
                      <View style={{ gap: 8 }}>
                        <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 13, color: MUTED }}>Open Roles</Text>
                        <Pressable onPress={() => setRolesModalOpen(true)}>
                          <Text style={{ fontFamily: FONTS.LEXEND_LIGHT, fontSize: 14, lineHeight: 21, color: TEXT }}>
                            {openRoles.length > 0
                              ? `${openRoles.length} open ${openRoles.length === 1 ? "role" : "roles"}`
                              : "—"}
                          </Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  </Animated.View>
                </Animated.View>

                {/* Contact links and action buttons — always visible regardless of collapse state */}

              </View>
            </View>
          </View> {/* close view of the main page formatting, overall container*/}
        </ScrollView>
        {/* this had to be placed outside of the scrollview or else it will move with it, placed it in a reusable component for easy find and edit*/}
        <WebFooter
          onLogout={() => {
            logout();
            router.replace("/(auth)/login" as any);
          }}
        />

      </SafeAreaView>
      {/*Now the "Open Roles" row in the About Us panel will show e.g. "X open roles" as a tappable link. Tapping it opens a modal with a card per role showing title, work type, salary, skills, relocation, and post URL. 
      Tapping the backdrop or the X closes it.*/}
      <Modal visible={rolesModalOpen} transparent animationType="fade" onRequestClose={() => setRolesModalOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" }}
          onPress={() => setRolesModalOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: WHITE,
              borderRadius: 18,
              width: Math.min(560, width - 48),
              maxHeight: "80%",
              overflow: "hidden",
            }}
            onPress={() => {}}
          >
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
              <Pressable onPress={() => setRolesModalOpen(false)} hitSlop={12}>
                <Feather name="x" size={20} color={MUTED} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 28, gap: 20 }}>
              {openRoles.map((role: any) => (
                <View
                  key={role.id}
                  style={{
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 14,
                    padding: 20,
                    gap: 12,
                    backgroundColor: BG,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.LEXEND_REGULAR, fontSize: 15, color: TEXT }}>{role.title || "—"}</Text>

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
    </>
  );
}
