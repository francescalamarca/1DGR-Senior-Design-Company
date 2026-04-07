/*
THIS IS THE WEB BASED PROFILE APPEARANCE, WILL LOOK SLIGHTLY DIFFERENT THAN MOBILE

Layout:
  - Right sidebar:  Contact Us + Employees — always visible, no accordion/collapse
  - Main body:      Hero → About Us (always expanded) → First Connect video rail
*/

import { WebFooter } from "@/src/components/WebFooter";
import { RequireUserType } from "@/src/components/RequireUserType";
import { useCompanyProfileScreenData } from "@/src/features/profile/edit/profileScreen.shared";
import { useSession } from "@/src/state/session";
import { useDynColors } from "@/src/state/theme-colors";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
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
  ContactSidebar,
  RolesModal,
  OpenRolesCard,
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

  // Modal state
  const [rolesModalOpen,      setRolesModalOpen]      = useState(false);
  const [sidebarColumnHeight, setSidebarColumnHeight] = useState(760);

  // Layout-derived values (unchanged from original)
  const isCompact      = width < 1280;
  const pagePad        = Math.max(20, Math.min(64, Math.round(width * 0.035)));
  const heroAvatarSize = width < 1180 ? 128 : 164;
  const railCardWidth  = Math.min(360, Math.round(width * 0.22));
  const railStep       = railCardWidth + 20;
  const sidebarWidth   = isCompact ? 0 : Math.round(width * 0.32);
  const navReturnTo    = "/(companyUser)/profile";

  function scrollRail(direction: -1 | 1) {
    const nextOffset = Math.max(0, railScrollOffsetRef.current + direction * railStep);
    railRef.current?.scrollToOffset({ offset: nextOffset, animated: true });
    railScrollOffsetRef.current = nextOffset;
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

              {/* ── About Us — always visible, full detail in main body ── */}
              <AboutUsCard
                pagePad={pagePad}
                isCompact={isCompact}
                sidebarWidth={sidebarWidth}
                coreValues={coreValues}
                industry={industry}
                benefitsSummary={benefitsSummary}
                locations={locations}
                openRoles={openRoles}
                onOpenRolesModal={() => setRolesModalOpen(true)}
              />

              <OpenRolesCard
                pagePad={pagePad}
                isCompact={isCompact}
                sidebarWidth={sidebarWidth}
                openRoles={openRoles}
                onOpenRolesModal={() => setRolesModalOpen(true)}
              />

              {/* ── First Connect video rail ── */}
              <FirstConnectCard
                pagePad={pagePad}
                isCompact={isCompact}
                sidebarWidth={sidebarWidth}
                railCardWidth={railCardWidth}
                profile={profile}
                videos={videos}
                railRef={railRef as React.RefObject<FlatList<any>>}
                railScrollOffsetRef={railScrollOffsetRef}
                openVideo={openVideo}
                onScrollRail={scrollRail}
              />

              {/* ── Right sidebar: Contact Us + Employees, always visible ── */}
              <ContactSidebar
                isCompact={isCompact}
                profile={profile}
                sidebarWidth={sidebarWidth}
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
                onLayout={(event) => {
                  if (!isCompact) setSidebarColumnHeight(event.nativeEvent.layout.height);
                }}
              />

            </View>
          </View>
        </ScrollView>

        {/* Footer sits outside ScrollView so it stays pinned */}
        <WebFooter
          onLogout={() => {
            logout();
            router.replace("/(auth)/login" as any);
          }}
        />
      </SafeAreaView>

      {/* Open Roles modal — triggered from About Us card */}
      <RolesModal
        visible={rolesModalOpen}
        openRoles={openRoles}
        screenWidth={width}
        onClose={() => setRolesModalOpen(false)}
      />
    </>
  );
}