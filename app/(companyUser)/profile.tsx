/**
 * 
 * THIS IS MOBILE VIEW DO NOT TOUCH THIS JUST CHANGE IT BASED ON WHAT THE APP VERSION IS LOOKING LIKE
 * 
 * Profile Screen (V2 Visual Redesign)
 * - Preserves: avatar press-to-play, slot-based videos, name toggle logic, live share sheet, fetch/refresh.
 * - Visual changes only unless explicitly noted.
 *
 * New layout:
 * Block A (bg): ShareLive + edit(pencil) + settings, avatar, name, headline, Values list
 * Block B (white): Hook
 * Block C (bg): Qualifications dropdown (2-page pull-in) + premium open/close animation
 * Block D (white): Horizontal snap videos w/ caption inside card
 */

import { ProfileBrandWordmark } from "@/src/components/ProfileBrandWordmark";
import { RequireUserType } from "@/src/components/RequireUserType";
import {
  softWrapLongTokens,
  useCompanyProfileScreenData,
  type QualRowValue,
} from "@/src/features/profile/edit/profileScreen.shared";
import { useSession } from "@/src/state/session";
import { useDynColors } from "@/src/state/theme-colors";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  UIManager,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ MUST match EXACT keys from your useFonts(...)
const FONTS = {
  LEXEND_LIGHT: "Lexend-Light",
  LEXEND_REGULAR: "Lexend-Regular",
  LEXEND_BOLD: "Lexend-Bold",

  DMMONO_LIGHT: "DMMono-Light",

  CRIMSON_REGULAR: "CrimsonText-Regular",
  CRIMSON_SEMIBOLD: "CrimsonText-SemiBold",
} as const;

// ✅ Backgrounds
const BG = "#FFFFFF";
const WHITE = "#FFFFFF";

// ✅ Brand neutrals
const TEXT = "#202020";
const HINT = "#9bb4c0";
const BORDER = "#d9d9d9";

// Right-side page-toggle button takes space; keep text readable without shrinking the whole column.
const QUAL_PAGE_BUTTON_W = 38;
const QUAL_PAGE_BUTTON_GAP = 8; // breathing room so text never touches the divider
const QUAL_RIGHT_GUTTER = QUAL_PAGE_BUTTON_W + QUAL_PAGE_BUTTON_GAP;

/** Render a qual row's value. If it's a list (universities), add spacing between items. */
function QualValue({
  value,
  textStyle,
}: {
  value: QualRowValue;
  textStyle: any;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={textStyle}>—</Text>;

    return (
      <View>
        {value.map((item, idx) => (
          <Text
            key={`${idx}_${item}`}
            style={[
              textStyle,
              idx === value.length - 1 ? null : { marginBottom: 10 },
            ]}
          >
            {softWrapLongTokens(item)}
          </Text>
        ))}
      </View>
    );
  }

  return <Text style={textStyle}>{softWrapLongTokens(value)}</Text>;
}

export default function ProfileScreen() {
  // On web, the dedicated web-profile page is used instead
  useEffect(() => {
    if (Platform.OS === "web") {
      router.replace("/(companyUser)/web-profile" as any);
    }
  }, []);

  const C = useDynColors();
  const { showActionSheetWithOptions } = useActionSheet();
  const { logout } = useSession();
  const {
    profile,
    copyEmail,
    copyPhone,
    copyUrl,
    refreshing,
    fetchLatestProfile,
    displayName,
    missionStatement,
    companyCulture,
    benefitsSummary,
    coreValues,
    openRoles,
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
    showIndustry,
    showLocations,
    showCoreValues,
    showCulture,
    showOpenRoles,
    showBenefitsSummary,
    openVideo,
  } = useCompanyProfileScreenData();

  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const scrollViewRef = useRef<any>(null);

  // ===== Styles =====
  const s = useMemo(() => {
    const lexLight = { fontFamily: FONTS.LEXEND_LIGHT } as const;
    const lexReg = { fontFamily: FONTS.LEXEND_REGULAR } as const;
    const crimson = { fontFamily: FONTS.CRIMSON_REGULAR } as const;

    return {
      displayName: {
        ...lexLight,
        fontSize: 28,
        textAlign: "center" as const,
        color: C.text,
      } as const,

      headline: {
        ...lexLight,
        fontSize: 13.5,
        textAlign: "center" as const,
        color: C.text,
        marginTop: 10,
      } as const,

      mission: {
        ...crimson,
        textAlign: "center" as const,
        opacity: 1,
        fontSize: 21,
        lineHeight: 31,
        paddingHorizontal: 4,
        color: C.text,
      } as const,

      sectionHeader: {
        ...lexLight,
        fontSize: 13,
        letterSpacing: 2.2,
        color: C.text,
      } as const,
      contactLabel: {
        ...lexLight,
        fontSize: 12.5,
        color: "#5E5E5E",
        opacity: 1,
      } as const,
      contactLinkLabel: {
        ...lexLight,
        fontSize: 12.5,
        color: "#5E5E5E",
        opacity: 1,
      } as const,
      contactValue: {
        ...lexLight,
        fontSize: 14,
        color: C.text,
        opacity: 1,
      } as const,

      qualHeader: {
        ...lexLight,
        fontSize: 13,
        letterSpacing: 2.1,
        color: C.text,
        opacity: 1,
      } as const,

      // Iteration 2: use Sky-2 for qualification tagline labels.
      qualLabel: {
        ...lexLight,
        fontSize: 13.5,
        color: "#202020",
        opacity: 1,
        marginLeft: 5,
      } as const,
      qualValue: {
        ...lexLight,
        fontSize: 13,
        marginLeft: 10,
        color: C.text,
        opacity: 1,
        lineHeight: 18,
        flexShrink: 1,
        flexWrap: "wrap",
        width: "90%", // ✅ keep as requested
      } as const,

      videoCaption: {
        ...lexReg,
        fontSize: 16.5,
        lineHeight: 22,
        color: C.text,
      } as const,
      logout: { ...lexLight, color: C.text } as const,
      blockABg: (profile.customBackgroundColor ?? "").trim() || BG, //if custom available, use that, else default, where applied
    };
  }, [C.text, profile.customBackgroundColor]);

  // ===== Layout constants =====
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;
  const BLOCK_PAD = 16;
  const scrollY = useRef(new Animated.Value(0)).current;
  const avatarSize = scrollY.interpolate({
    inputRange: [-120, 0, 120],
    outputRange: [170, 140, 128],
    extrapolate: "clamp",
  });
  const avatarRadius = scrollY.interpolate({
    inputRange: [-120, 0, 120],
    outputRange: [85, 70, 64],
    extrapolate: "clamp",
  });

  // ===== Qualifications dropdown (2-page pull-in) =====
  const [qualOpen, setQualOpen] = useState(false);
  const [qualPage, setQualPage] = useState<0 | 1>(0);
  const [qualSectionY, setQualSectionY] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);

  const qualHeight = useRef(new Animated.Value(0)).current; // non-native
  const qualOpacity = useRef(new Animated.Value(0)).current; // native
  const qualTranslateY = useRef(new Animated.Value(-6)).current; // native
  const [qualContentH, setQualContentH] = useState(0);

  const openingQualRef = useRef(false);
  const closingQualRef = useRef(false);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const qualChevron = useRef(new Animated.Value(0)).current;
  const qualChevronRotate = qualChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Page slide (0 -> 1 pulls second column into view)
  const pageX = useRef(new Animated.Value(0)).current;

  // translate pageX in pixels (one full panel width)
  const panelW = screenW - BLOCK_PAD * 2;
  const pageTranslateX = pageX.interpolate({
    inputRange: [-1, 0],
    outputRange: [-panelW, 0],
  });

  // Keep container height synced if content height changes while open (ex: fetch updates)
  useEffect(() => {
    if (!qualOpen) return;
    if (!qualContentH) return;

    Animated.timing(qualHeight, {
      toValue: qualContentH,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [qualOpen, qualContentH, qualHeight]);

  const runOpenAnimation = useCallback(
    (triesLeft: number) => {
      // If still no measurement yet, wait a frame (prevents “opens to height=1” bug)
      if (!qualContentH && triesLeft > 0) {
        requestAnimationFrame(() => runOpenAnimation(triesLeft - 1));
        return;
      }

      const targetH = Math.max(qualContentH, 1);

      // Make sure values start from closed state (prevents half-open weirdness)
      qualOpacity.setValue(0);
      qualTranslateY.setValue(-6);
      qualHeight.setValue(0);

      Animated.parallel([
        Animated.timing(qualChevron, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(qualOpacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(qualTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(qualHeight, {
          toValue: targetH,
          damping: 26,
          stiffness: 220,
          mass: 1,
          overshootClamping: true,
          useNativeDriver: false,
        }),
      ]).start(() => {
        openingQualRef.current = false;
      });
    },
    [qualChevron, qualContentH, qualHeight, qualOpacity, qualTranslateY],
  );

  const openQual = useCallback(() => {
    if (qualOpen) return;
    if (openingQualRef.current || closingQualRef.current) return;

    openingQualRef.current = true;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQualOpen(true);

    // Wait up to ~8 frames for the measurer to report a real height.
    requestAnimationFrame(() => runOpenAnimation(8));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node =
          scrollViewRef.current?.getNode?.() ?? scrollViewRef.current;
        const expandedBottomY = qualSectionY + 44 + Math.max(qualContentH, 0);
        const targetY = Math.max(0, expandedBottomY - (screenH - 150));
        node?.scrollTo?.({ y: targetY, animated: true });
      });
    });
  }, [qualContentH, qualOpen, qualSectionY, runOpenAnimation, screenH]);

  const closeQual = useCallback(() => {
    if (!qualOpen) return;
    if (closingQualRef.current || openingQualRef.current) return;

    closingQualRef.current = true;

    Animated.parallel([
      Animated.timing(qualChevron, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(qualOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(qualTranslateY, {
        toValue: -6,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(qualHeight, {
        toValue: 0,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      // Reset slider back to page 0 while collapsing
      Animated.timing(pageX, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setQualPage(0);
      setQualOpen(false);
      closingQualRef.current = false;
    });
  }, [qualOpen, pageX, qualChevron, qualHeight, qualOpacity, qualTranslateY]);

  const toggleQual = useCallback(() => {
    if (!qualOpen) return openQual();
    return closeQual();
  }, [qualOpen, openQual, closeQual]);

  const toggleQualPage = useCallback(() => {
    if (!qualOpen) return;
    if (closingQualRef.current || openingQualRef.current) return;

    const next: 0 | 1 = qualPage === 0 ? 1 : 0;
    setQualPage(next);

    Animated.spring(pageX, {
      toValue: next === 1 ? -1 : 0,
      damping: 26,
      stiffness: 240,
      mass: 1,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
  }, [pageX, qualPage, qualOpen]);

  const qualSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!qualOpen || closingQualRef.current || openingQualRef.current)
            return false;
          const dx = Math.abs(gestureState.dx);
          const dy = Math.abs(gestureState.dy);
          return dx > 10 && dx > dy;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!qualOpen || closingQualRef.current || openingQualRef.current)
            return;
          const { dx } = gestureState;
          if (dx < -35 && qualPage === 0) {
            setQualPage(1);
            Animated.spring(pageX, {
              toValue: -1,
              damping: 26,
              stiffness: 240,
              mass: 1,
              overshootClamping: true,
              useNativeDriver: true,
            }).start();
            return;
          }
          if (dx > 35 && qualPage === 1) {
            setQualPage(0);
            Animated.spring(pageX, {
              toValue: 0,
              damping: 26,
              stiffness: 240,
              mass: 1,
              overshootClamping: true,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [pageX, qualOpen, qualPage],
  );

  const CARD_SIDE_PAD = 22;
  const CARD_W = screenW - CARD_SIDE_PAD * 2;
  const CARD_GAP = 22;
  const SNAP = CARD_W + CARD_GAP;
  const compactLocation = useMemo(() => {
    const raw = String(profile.locations ?? "").trim();
    if (!raw) return "";

    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
    return raw;
  }, [profile.locations]);

  // const heroMeta = useMemo(() => {
  //   const items: string[] = [];
  //   if (compactLocation) items.push(`📍${compactLocation}`);
  //   if (workTypeDisplay && workTypeDisplay !== "—") items.push(workTypeDisplay);
  //   return items.join("  |  ");
  // }, [compactLocation, workTypeDisplay]);

  return (
    <>
      <RequireUserType type="company" />

      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: C.bg }}
      >
        <Animated.ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchLatestProfile}
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
        >
          <View
            style={{
              height: 64,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.card,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
            }}
          >
            <ProfileBrandWordmark
              fontFamily={FONTS.LEXEND_LIGHT}
              size={32}
              markSize={20}
              markOffsetTop={1}
              containerOffsetTop={-10}
              containerOffsetLeft={12}
            />
          </View>

          {/* Block A */}
          <View style={{ backgroundColor: C.card }}>
            <View
              style={{
                paddingHorizontal: 18,
                paddingTop: 12,
                paddingBottom: 22,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(companyUser)/video-library",
                      params: { returnTo: "/(companyUser)/profile" },
                    })
                  }
                  hitSlop={10}
                >
                  <Feather name="layers" size={18} color={TEXT} />
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(companyUser)/profile-edit")}
                  hitSlop={10}
                >
                  <Feather name="edit-2" size={18} color={TEXT} />
                </Pressable>

                <Pressable
                  onPress={() => router.push("/(companyUser)/settings")}
                  hitSlop={10}
                >
                  <Feather name="settings" size={18} color={TEXT} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => openVideo(profile.avatarVideoUri)}
              style={{ alignSelf: "center", marginTop: 2 }}
              hitSlop={10}
            >
              {profile.avatarImageUri?.trim() ? (
                <Animated.Image
                  source={{ uri: profile.avatarImageUri }}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarRadius,
                  }}
                />
              ) : (
                <Animated.View
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarRadius,
                    backgroundColor: "#EDEDED",
                    opacity: 0.95,
                  }}
                />
              )}
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block B */}
          <View
            style={{
              backgroundColor: C.bg,
              paddingHorizontal: 24,
              paddingVertical: 16,
            }}
          >
            {!!missionStatement ? (
              <Text style={s.mission}>{missionStatement}</Text>
            ) : (
              <Text style={[s.mission, { opacity: 1 }]}>—</Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block C — Company Info */}
          <View
            style={{
              backgroundColor: C.card,
              paddingHorizontal: 22,
              paddingVertical: 12,
            }}
            onLayout={(event) => setQualSectionY(event.nativeEvent.layout.y)}
          >
            <Pressable
              onPress={toggleQual}
              hitSlop={10}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 4,
              }}
            >
              <Text style={s.qualHeader}>COMPANY INFO</Text>
              <Animated.View
                style={{ transform: [{ rotate: qualChevronRotate }] }}
              >
                <Feather name="chevron-down" size={24} color={HINT} />
              </Animated.View>
            </Pressable>

            <Animated.View style={{ height: qualHeight, overflow: "hidden" }}>
              {/* Hidden measurer */}
              <View
                pointerEvents="none"
                style={{ opacity: 0, position: "absolute", left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && Math.abs(h - qualContentH) > 2)
                    setQualContentH(h);
                }}
              >
                <View style={{ marginTop: 12, gap: 14 }}>
                  {!!missionStatement && (
                    <View style={{ gap: 4 }}>
                      <Text style={s.qualLabel}>Mission:</Text>
                      <Text style={s.qualValue}>{missionStatement}</Text>
                    </View>
                  )}
                  {showCoreValues && coreValues.length > 0 && (
                    <View style={{ gap: 4 }}>
                      <Text style={s.qualLabel}>Core Values:</Text>
                      <Text style={s.qualValue}>
                        {coreValues.join("  ·  ")}
                      </Text>
                    </View>
                  )}
                  {showBenefitsSummary && !!benefitsSummary && (
                    <View style={{ gap: 4 }}>
                      <Text style={s.qualLabel}>Benefits:</Text>
                      <Text style={s.qualValue}>{benefitsSummary}</Text>
                    </View>
                  )}
                  {showCulture && !!companyCulture && (
                    <View style={{ gap: 4 }}>
                      <Text style={s.qualLabel}> Company Culture:</Text>
                      <Text style={s.qualValue}>{companyCulture}</Text>
                    </View>
                  )}
                  {showIndustry && !!industry && (
                    <View style={{ gap: 4 }}>
                      <Text style={s.qualLabel}>Industry:</Text>
                      <Text style={s.qualValue}>{industry}</Text>
                    </View>
                  )}
                  {showLocations && locations.length > 0 && (
                    <View style={{ gap: 4 }}>
                      <Text style={s.qualLabel}>Locations:</Text>
                      <Text style={s.qualValue}>{locations.join("  ·  ")}</Text>
                    </View>
                  )}
                  {showOpenRoles && openRoles.length > 0 && (
                    <View style={{ gap: 8 }}>
                      <Text style={s.qualLabel}>Open Roles:</Text>
                      {openRoles.map((role: any) => (
                        <View key={role.id} style={{ gap: 2 }}>
                          <Text style={s.qualValue}>{role.title}</Text>
                          {!!role.salary?.trim() && (
                            <Text
                              style={[
                                s.qualValue,
                                { opacity: 0.65, fontSize: 12 },
                              ]}
                            >
                              {role.salary}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Visible animated content */}
              {qualOpen ? (
                <Animated.View
                  style={{
                    opacity: qualOpacity,
                    transform: [{ translateY: qualTranslateY }],
                  }}
                >
                  <View style={{ marginTop: 12, gap: 14 }}>
                    {!!missionStatement && (
                      <View style={{ gap: 4 }}>
                        <Text style={s.qualLabel}>Mission:</Text>
                        <Text style={s.qualValue}>{missionStatement}</Text>
                      </View>
                    )}
                    {showCoreValues && coreValues.length > 0 && (
                      <View style={{ gap: 4 }}>
                        <Text style={s.qualLabel}>Core Values:</Text>
                        <Text style={s.qualValue}>
                          {coreValues.join("  ·  ")}
                        </Text>
                      </View>
                    )}
                    {showBenefitsSummary && !!benefitsSummary && (
                      <View style={{ gap: 4 }}>
                        <Text style={s.qualLabel}>Benefits:</Text>
                        <Text style={s.qualValue}>{benefitsSummary}</Text>
                      </View>
                    )}
                    {showCulture && !!companyCulture && (
                      <View style={{ gap: 4 }}>
                        <Text style={s.qualLabel}>Company Culture:</Text>
                        <Text style={s.qualValue}>{companyCulture}</Text>
                      </View>
                    )}
                    {showIndustry && !!industry && (
                      <View style={{ gap: 4 }}>
                        <Text style={s.qualLabel}>Industry:</Text>
                        <Text style={s.qualValue}>{industry}</Text>
                      </View>
                    )}
                    {showLocations && locations.length > 0 && (
                      <View style={{ gap: 4 }}>
                        <Text style={s.qualLabel}>Locations:</Text>
                        <Text style={s.qualValue}>
                          {locations.join("  ·  ")}
                        </Text>
                      </View>
                    )}
                    {showOpenRoles && openRoles.length > 0 && (
                      <View style={{ gap: 8 }}>
                        <Text style={s.qualLabel}>Open Roles:</Text>
                        {openRoles.map((role: any) => (
                          <View key={role.id} style={{ gap: 2 }}>
                            <Text style={s.qualValue}>{role.title}</Text>
                            {!!role.salary?.trim() && (
                              <Text
                                style={[
                                  s.qualValue,
                                  { opacity: 0.65, fontSize: 12 },
                                ]}
                              >
                                {role.salary}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          </View>

          <View style={{ height: 1, backgroundColor: BORDER }} />

          <LinearGradient
            colors={["#ffffff", "#f7fafb", "#f5f8f9"]}
            locations={[0, 0.06, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <View
              style={{
                backgroundColor: "transparent",
                paddingTop: 22,
                paddingBottom: 0,
                paddingHorizontal: 16,
                alignSelf: "center",
                width: "100%", // 👈 add this
              }}
            >
              <View
                style={{
                  paddingHorizontal: 22,
                  paddingBottom: 22,
                  paddingTop: 6,
                }}
              >
                <Text style={s.sectionHeader}>FIRST CONNECT</Text>
              </View>

              <FlatList
                data={videos}
                keyExtractor={(item: any) =>
                  String(
                    item.id ?? `${item.slot ?? "x"}_${item.videoUri ?? ""}`,
                  )
                }
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={SNAP}
                decelerationRate="fast"
                disableIntervalMomentum
                contentContainerStyle={{ paddingHorizontal: CARD_SIDE_PAD }}
                onMomentumScrollEnd={(event) => {
                  const nextIndex = Math.round(
                    event.nativeEvent.contentOffset.x / SNAP,
                  );
                  setActiveVideoIndex(
                    Math.max(0, Math.min(videos.length - 1, nextIndex)),
                  );
                }}
                ItemSeparatorComponent={() => (
                  <View style={{ width: CARD_GAP }} />
                )}
                renderItem={({ item }: { item: any }) => {
                  const uri = String(item.videoUri ?? "").trim();
                  const thumb = String(item.imageUri ?? "").trim();
                  const caption = String(item.caption ?? "Untitled");

                  return (
                    <Pressable
                      onPress={() => openVideo(uri)}
                      style={{
                        width: CARD_W,
                        backgroundColor: C.card,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#9db3c0",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingTop: 16,
                          paddingBottom: 14,
                        }}
                      >
                        <Text style={s.videoCaption}>{caption}</Text>
                      </View>

                      <View
                        style={{
                          width: "100%",
                          height: Math.round(CARD_W * 1.18),
                          backgroundColor: "#EDEDED",
                        }}
                      >
                        {!!thumb ? (
                          <Image
                            source={{ uri: thumb }}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }}
              />

              {videos.length > 1 ? (
                <View
                  style={{
                    width: CARD_W,
                    alignSelf: "center",
                    height: 56,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {videos.map((_, idx) => {
                    const active = idx === activeVideoIndex;
                    return (
                      <View
                        key={`video-dot-${idx}`}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          marginHorizontal: 4,
                          backgroundColor: active ? "#202020" : HINT,
                          opacity: active ? 1 : 0.9,
                        }}
                      />
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View
              style={{ height: 1, backgroundColor: BORDER, marginTop: 0 }}
            />

            {/* Block E */}
            <View
              style={{
                backgroundColor: "transparent",
                paddingHorizontal: 22,
                paddingVertical: 16,
              }}
            >
              <Pressable
                onPress={() => {
                  if (contactOpen) {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                    setContactOpen(false);
                    return;
                  }

                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setContactOpen(true);

                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      const node =
                        scrollViewRef.current?.getNode?.() ??
                        scrollViewRef.current;
                      node?.scrollToEnd?.({ animated: true });
                    });
                  });
                }}
                hitSlop={10}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={s.sectionHeader}>CONTACT</Text>
                <Feather
                  name={contactOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={HINT}
                />
              </Pressable>

              {contactOpen ? (
                <View style={{ marginTop: 10, gap: 10 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={s.contactLabel}>Email</Text>
                    <Pressable
                      onPress={copyEmail}
                      disabled={!companyEmail}
                      hitSlop={8}
                    >
                      <Text style={s.contactValue}>{companyEmail || "—"}</Text>
                    </Pressable>
                  </View>

                  <View style={{ gap: 4 }}>
                    <Text style={s.contactLabel}>Phone</Text>
                    <Pressable
                      onPress={copyPhone}
                      disabled={!companyPhone}
                      hitSlop={8}
                    >
                      <Text style={s.contactValue}>{companyPhone || "—"}</Text>
                    </Pressable>
                  </View>

                  {showUrl1 ? (
                    <View style={{ gap: 4 }}>
                      <Text style={s.contactLinkLabel}>{contactUrl1Label}</Text>
                      <Pressable
                        onPress={() => copyUrl(contactUrl1)}
                        disabled={!contactUrl1}
                        hitSlop={8}
                      >
                        <Text style={s.contactValue}>{contactUrl1 || "—"}</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {showUrl2 ? (
                    <View style={{ gap: 4 }}>
                      <Text style={s.contactLinkLabel}>{contactUrl2Label}</Text>
                      <Pressable
                        onPress={() => copyUrl(contactUrl2)}
                        disabled={!contactUrl2}
                        hitSlop={8}
                      >
                        <Text style={s.contactValue}>{contactUrl2 || "—"}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={{ height: 1, backgroundColor: BORDER }} />

            {/* Logout */}
            <Pressable
              onPress={() => {
                logout();
                router.replace("/(companyUser)/explore"); //should be "/(auth)/login", to avoid error change to explore for now
              }}
              style={{
                marginTop: 10,
                paddingVertical: 18,
                alignItems: "center",
              }}
            >
              <Text style={s.logout}>Logout</Text>
            </Pressable>

            <View style={{ height: 28 }} />
          </LinearGradient>
        </Animated.ScrollView>
      </SafeAreaView>
    </>
  );
}
