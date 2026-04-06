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

import { WebFooter } from "@/src/components/WebFooter";
import { RequireUserType } from "@/src/components/RequireUserType";
import { useCompanyProfileScreenData } from "@/src/features/profile/edit/profileScreen.shared";
import { useSession } from "@/src/state/session";
import { useDynColors } from "@/src/state/theme-colors";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  TopNav,
  HeroSection,
  AboutUsCard,
  FirstConnectCard,
  AboutUsSidebar,
  RolesModal,
} from "./profileWeb.ui";

export default function ProfileWebScreen() {
  const C = useDynColors();
  const { logout } = useSession();
  const { width } = useWindowDimensions();

  // Refs
  const railRef             = useRef<FlatList<any> | null>(null);
  const railScrollOffsetRef = useRef(0);
  const scrollViewRef       = useRef<any>(null);

  // Data
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

  // Modal / sidebar state
  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [rolesModalOpen,     setRolesModalOpen]      = useState(false);
  const [sidebarColumnHeight,setSidebarColumnHeight] = useState(760);
  const sidebarAnimation = useRef(new Animated.Value(0)).current;

  // Layout-derived values
  const isCompact      = width < 1280;
  const pagePad        = Math.max(20, Math.min(64, Math.round(width * 0.035)));
  const heroAvatarSize = width < 1180 ? 128 : 164;
  const railCardWidth  = Math.min(360, Math.round(width * 0.22));
  const railStep       = railCardWidth + 20;
  const sidebarWidth   = isCompact ? 0 : Math.round(width * 0.32);
  const navReturnTo    = "/(companyUser)/profile";

  // Sidebar detail rows — memoised so they only recompute when data changes
  const sidebarRows = useMemo(() => {
    const qualCol1: any[] = [];
    const qualCol2: any[] = [
      { label: "Mission Statement", value: missionStatement || "—" },
      { label: "Core Values",       value: coreValues.length ? coreValues.join(", ") : "—" },
      { label: "Industry",          value: industry || "—" },
      { label: "Benefits",          value: benefitsSummary || "—" },
      { label: "Locations",         value: locations.length ? locations.join(", ") : "—" },
    ];
    return [...qualCol1, ...qualCol2];
  }, [missionStatement, coreValues, industry, benefitsSummary, locations]);

  // Sidebar animation interpolations
  const collapsedPanelHeight = 64;
  const sidebarPanelHeight   = isCompact
    ? 540
    : Math.max(sidebarColumnHeight, collapsedPanelHeight + 200);

  const animatedPanelHeight = sidebarAnimation.interpolate({
    inputRange:  [0, 1],
    outputRange: [collapsedPanelHeight, sidebarPanelHeight],
  });
  const animatedExpandedOpacity = sidebarAnimation.interpolate({
    inputRange:  [0, 0.7, 1],
    outputRange: [0, 0.15, 1],
  });
  const animatedExpandedHeight = sidebarAnimation.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, Math.max(0, sidebarPanelHeight - collapsedPanelHeight)],
  });

  // Helpers
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

  return (
    <>
      <RequireUserType type="company" />

      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: C.bg }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLatestProfile} />}
        >
          {/* ── Top navigation bar ── */}
          <TopNav pagePad={pagePad} />

          {/* ── Main page body ── */}
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
            >
              {/* ── Hero: avatar + name + quick-action buttons ── */}
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: pagePad,
                  paddingTop: 22,
                  paddingBottom: 22,
                  minWidth: 0,
                }}
              >
                <HeroSection
                  profile={profile}
                  displayName={displayName}
                  missionStatement={missionStatement}
                  headquarters={headquarters}
                  isCompact={isCompact}
                  heroAvatarSize={heroAvatarSize}
                  sidebarWidth={sidebarWidth}
                  refreshing={refreshing}
                  navReturnTo={navReturnTo}
                  openVideo={openVideo}
                  onRefresh={fetchLatestProfile}
                />
              </View>

              {/* ── About Us floating card ── */}
              <AboutUsCard pagePad={pagePad} />

              {/* ── First Connect floating card (video rail) ── */}
              <FirstConnectCard
                pagePad={pagePad}
                isCompact={isCompact}
                railCardWidth={railCardWidth}
                profile={profile}
                videos={videos}
                railRef={railRef as React.RefObject<FlatList<any>>}
                railScrollOffsetRef={railScrollOffsetRef}
                openVideo={openVideo}
                onScrollRail={scrollRail}
              />

              {/* ── About Us sidebar (absolute on desktop, stacked on compact) ── */}
              <AboutUsSidebar
                isCompact={isCompact}
                sidebarWidth={sidebarWidth}
                sidebarOpen={sidebarOpen}
                animatedPanelHeight={animatedPanelHeight}
                animatedExpandedHeight={animatedExpandedHeight}
                animatedExpandedOpacity={animatedExpandedOpacity}
                sidebarRows={sidebarRows}
                openRoles={openRoles}
                companyEmail={companyEmail}
                companyPhone={companyPhone}
                contactUrl1={contactUrl1}
                contactUrl2={contactUrl2}
                contactUrl1Label={contactUrl1Label}
                contactUrl2Label={contactUrl2Label}
                showUrl1={showUrl1}
                showUrl2={showUrl2}
                copyEmail={copyEmail}
                copyPhone={copyPhone}
                copyUrl={copyUrl}
                onToggleSidebar={toggleSidebar}
                onOpenRolesModal={() => setRolesModalOpen(true)}
                onLayout={(event) => {
                  // Track sidebar height so the animated panel can expand to fill it
                  if (!isCompact) setSidebarColumnHeight(event.nativeEvent.layout.height);
                }}
              />

            </View>
          </View> {/* close main page body */}
        </ScrollView>

        {/* Footer sits outside ScrollView so it stays pinned to the bottom */}
        <WebFooter
          onLogout={() => {
            logout();
            router.replace("/(auth)/login" as any);
          }}
        />
      </SafeAreaView>

      {/*
        Open Roles modal: tapping the backdrop or X closes it.
        Each role card shows title, work type, location, salary, skills, relocation, postUrl.
      */}
      <RolesModal
        visible={rolesModalOpen}
        openRoles={openRoles}
        screenWidth={width}
        onClose={() => setRolesModalOpen(false)}
      />
    </>
  );
}