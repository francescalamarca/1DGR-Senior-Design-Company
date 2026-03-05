/**
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

import { aws_config } from "@/constants/aws-config";
import { RequireUserType } from "@/src/components/RequireUserType";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, usePathname } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
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
  View,
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
const BG = "#fbfbfb";
const WHITE = "#FFFFFF";

// ✅ Brand neutrals
const TEXT = "#202020";
const HINT = "#9bb4c0";
const BORDER = "#d9d9d9";

// Right-side page-toggle button takes space; keep text readable without shrinking the whole column.
const QUAL_PAGE_BUTTON_W = 38;
const QUAL_PAGE_BUTTON_GAP = 8; // breathing room so text never touches the divider
const QUAL_RIGHT_GUTTER = QUAL_PAGE_BUTTON_W + QUAL_PAGE_BUTTON_GAP;

// Space between universities (works consistently on iOS/Android; avoids relying on `gap`)
const HIGHER_ED_ITEM_GAP = 10;

function toCloudFrontUrl(urlOrKey: string): string {
  if (!urlOrKey) return "";
  if (urlOrKey.includes("://")) return urlOrKey;

  const domain =
    (aws_config as any).cloudFrontDomain ||
    (aws_config as any).cloudfrontDomain ||
    (aws_config as any).cdnBaseUrl;

  if (domain) return `https://${domain}/${urlOrKey}`;
  return urlOrKey;
}

/** ✅ helper: normalize "field of study" */
function normalizeFieldOfStudy(e: any): string {
  return String(e?.fieldOfStudy ?? e?.field_of_study ?? e?.field_of_study_name ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** ✅ helper: degrees as separate lines: "Bachelors in X", "Masters in Y", etc. */
function degreesAsLines(e: any): string[] {
  const degrees: string[] = Array.isArray(e?.degrees) ? e.degrees : [];
  if (!degrees.length) return [];

  const fallbackField = normalizeFieldOfStudy(e);

  const details = Array.isArray(e?.degreeDetails)
    ? e.degreeDetails
    : Array.isArray(e?.degree_details)
      ? e.degree_details
      : [];

  const detailMap = new Map<string, string>();
  for (const d of details) {
    const degree = String(d?.degree ?? "").trim();
    const field = String(d?.fieldOfStudy ?? d?.field_of_study ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (degree && field) detailMap.set(degree, field);
  }

  return degrees
    .map((d) => {
      const dd = String(d ?? "").trim();
      if (!dd) return "";
      const field = detailMap.get(dd) ?? fallbackField;
      return field ? `${dd} in ${field}` : dd;
    })
    .filter(Boolean);
}

function dashIfEmpty(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

function joinOrDash(arr: any[]) {
  const a = Array.isArray(arr) ? arr.filter(Boolean).map((x) => String(x).trim()).filter(Boolean) : [];
  return a.length ? a.join(", ") : "—";
}

/**
 * Helps long tokens (no spaces) wrap instead of overflowing.
 * Adds zero-width spaces after common separators + between camelCase boundaries.
 */
function softWrapLongTokens(s: string) {
  return String(s ?? "")
    .replace(/([/_\-\.])/g, "$1\u200B")
    .replace(/([a-z])([A-Z])/g, "$1\u200B$2");
}

type QualRowValue = string | string[];
type QualRow = { label: string; value: QualRowValue };

/** Build a location string from common HigherEd shapes (city/state/country OR location fields). */
function formatHigherEdLocationLine(e: any): string {
  const city = String(e?.city ?? e?.schoolCity ?? e?.school_city ?? "").trim();
  const state = String(e?.state ?? e?.region ?? e?.schoolState ?? e?.school_state ?? "").trim();
  const country = String(e?.country ?? e?.nation ?? e?.schoolCountry ?? e?.school_country ?? "").trim();

  const directLocation = String(e?.location ?? e?.schoolLocation ?? e?.school_location ?? "").trim();

  // Prefer explicit city/state/country if any exist
  const parts = [city, state, country].filter(Boolean);
  if (parts.length) return parts.join(", ");

  // Fallback to a single location field if backend provides it
  if (directLocation) return directLocation;

  return "";
}

/**
 * ✅ Split a raw label like:
 * "California State University-Los Angeles, Los Angeles, California, USA"
 * into:
 *   school = "California State University-Los Angeles"
 *   location = "Los Angeles, California, USA"
 */
function splitSchoolAndLocationFromLabel(label: string): { school: string; location: string } {
  const raw = String(label ?? "").trim();
  if (!raw) return { school: "", location: "" };
  const idx = raw.indexOf(",");
  if (idx === -1) return { school: raw, location: "" };
  return {
    school: raw.slice(0, idx).trim(),
    location: raw.slice(idx + 1).trim(),
  };
}

/**
 * ✅ Format one higher-ed entry into multi-line text:
 * School
 * Location
 * Degree 1
 * Degree 2
 * Estimated grad: YYYY (optional)
 */
function formatHigherEdMultiline(e: any): string {
  const rawLabel = String(e?.label ?? e?.schoolName ?? e?.school_name ?? "").trim();
  const { school: schoolFromLabel, location: locationFromLabel } = splitSchoolAndLocationFromLabel(rawLabel);

  // If backend provides structured location fields, prefer them; else use the parsed label location.
  const structuredLocation = formatHigherEdLocationLine(e);

  const finalSchool = String(schoolFromLabel || rawLabel).trim();
  const finalLocation = String(structuredLocation || locationFromLabel).trim();

  const estimated = String(
    e?.estimatedGraduation ?? e?.estimated_graduation ?? e?.gradYear ?? e?.graduation ?? ""
  ).trim();

  const lines: string[] = [];

  // ✅ Order matters: School -> Location -> Degrees -> Estimated
  if (finalSchool) lines.push(finalSchool);
  if (finalLocation) lines.push(finalLocation);

  const degreeLines = degreesAsLines(e);
  if (degreeLines.length) {
    lines.push(...degreeLines);
  } else {
    const degreesFallback = Array.isArray(e?.degrees)
      ? e.degrees.map((d: any) => String(d ?? "").trim()).filter(Boolean)
      : [];
    if (degreesFallback.length) lines.push(...degreesFallback);
  }

  if (estimated) lines.push(`Estimated grad: ${estimated}`);

  return lines.length ? lines.join("\n") : "—";
}

/** Render a qual row's value. If it's a list (universities), add spacing between items. */
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

export default function ProfileScreen() {
  const { logout, accessToken } = useSession();
  const { profile, setProfile } = useProfile();
  const pathname = usePathname();

  const [refreshing, setRefreshing] = useState(false);
  const fetchingRef = useRef(false);
  const didFetchOnceRef = useRef(false);

  // ===== Name toggle (preserved) =====
  const [showLegalNow, setShowLegalNow] = useState(false);

  const showPreferred = profile.nameDisplaySettings.showPreferredName;
  const showLegal = profile.nameDisplaySettings.showLegalName;
  const bothEnabled = showPreferred && showLegal;

  const legalFullName = useMemo(() => {
    const first = profile.legalFirstName?.trim() ?? "";
    const last = profile.legalLastName?.trim() ?? "";
    const middle = profile.legalMiddleName?.trim() ?? "";
    return `${first}${middle ? ` ${middle}` : ""}${last ? ` ${last}` : ""}`.trim();
  }, [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName]);

  const preferredName = (profile.preferredName ?? "").trim();
  const preferredOk = preferredName.length > 0;
  const legalOk = legalFullName.length > 0;

  const canToggleName = bothEnabled && preferredOk && legalOk;

  const displayName = useMemo(() => {
    if (bothEnabled) {
      if (showLegalNow) return legalFullName || preferredName || profile.name;
      return preferredName || legalFullName || profile.name;
    }
    return profile.name;
  }, [bothEnabled, showLegalNow, legalFullName, preferredName, profile.name]);

  useFocusEffect(
    useCallback(() => {
      if (bothEnabled) {
        const first = profile.nameDisplaySettings.firstWhenBothOn;

        if (first === "legal" && legalOk) setShowLegalNow(true);
        else if (first === "preferred" && preferredOk) setShowLegalNow(false);
        else if (preferredOk) setShowLegalNow(false);
        else if (legalOk) setShowLegalNow(true);
        else setShowLegalNow(false);
      } else {
        setShowLegalNow(false);
      }
    }, [bothEnabled, preferredOk, legalOk, profile.nameDisplaySettings.firstWhenBothOn])
  );

  // ===== Styles =====
  const s = useMemo(() => {
    const lexLight = { fontFamily: FONTS.LEXEND_LIGHT } as const;
    const lexReg = { fontFamily: FONTS.LEXEND_REGULAR } as const;
    const monoLight = { fontFamily: FONTS.DMMONO_LIGHT } as const; // kept (even if unused)
    const crimson = { fontFamily: FONTS.CRIMSON_REGULAR } as const;
    const crimsonSemi = { fontFamily: FONTS.CRIMSON_SEMIBOLD } as const;

    return {
      topLink: { ...lexLight, fontSize: 13, color: TEXT } as const,

      displayName: {
        ...lexLight,
        fontSize: 24,
        textAlign: "center" as const,
        color: TEXT,
      } as const,

      headline: {
        ...lexLight,
        fontSize: 13,
        textAlign: "center" as const,
        color: HINT,
        marginTop: 6,
      } as const,

      hook: {
        ...crimson,
        textAlign: "center" as const,
        opacity: 1,
        fontSize: 20,
        lineHeight: 24,
        paddingHorizontal: 20,
        color: TEXT,
      } as const,

      valuesLabel: { ...lexLight, fontSize: 12, color: TEXT, opacity: 1 } as const,
      valuesValue: { ...lexLight, fontSize: 13, color: TEXT, opacity: .65, textAlign: "center" as const } as const,
      contactLabel: { ...lexLight, fontSize: 12.5, color: HINT, opacity: 1 } as const,
      contactValue: { ...lexLight, fontSize: 14, color: TEXT, opacity: 1 } as const,

      qualHeader: {
        ...lexLight,
        fontSize: 13,
        marginLeft: 5,
        letterSpacing: 1.4,
        color: TEXT,
        opacity: 1,
      } as const,

      // (kept font + opacity exactly as you had)
      qualLabel: { ...lexLight, fontSize: 12.5, color: TEXT, opacity: 1, marginLeft: 5 } as const,
      qualValue: {
        ...lexLight,
        fontSize: 13,
        marginLeft: 10,
        color: TEXT,
        opacity: 1,
        lineHeight: 18,
        flexShrink: 1,
        flexWrap: "wrap",
        width: "90%", // ✅ keep as requested
      } as const,

      videoCaption: { ...crimsonSemi, fontSize: 15.2, color: TEXT } as const,
      logout: { ...lexLight, color: TEXT } as const,
    };
  }, []);

  // ===== LIVE LINK (preserved) =====
  const liveProfileUrl = useMemo(() => {
    const base =
      (aws_config as any).liveProfileBaseUrl ||
      (aws_config as any).webBaseUrl ||
      (aws_config as any).publicBaseUrl ||
      (aws_config as any).apiBaseUrl;

    const handle = (profile as any).liveHandle || (profile as any).handle || (profile as any).username || "me";

    return `${String(base).replace(/\/$/, "")}/u/${encodeURIComponent(String(handle))}`;
  }, [profile]);

  async function copyLiveAsUrl() {
    await Clipboard.setStringAsync(liveProfileUrl);
    Alert.alert("Copied", "Live profile URL copied to clipboard.");
  }

  async function copyLiveAsQrData() {
    await Clipboard.setStringAsync(liveProfileUrl);
    Alert.alert("Copied", "QR data copied to clipboard.");
  }

  async function copyEmail() {
    if (!contactEmail) return;
    await Clipboard.setStringAsync(contactEmail);
    Alert.alert("Copied", "Email copied to clipboard.");
  }

  async function copyPhone() {
    if (!contactPhone) return;
    await Clipboard.setStringAsync(contactPhone);
    Alert.alert("Copied", "Phone number copied to clipboard.");
  }

  async function copyUrl(url: string) {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    Alert.alert("Copied", "URL copied to clipboard.");
  }

  function openLiveShareSheet() {
    const options = ["Copy as URL", "Copy as QR code", "Cancel"];
    const cancelButtonIndex = 2;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex }, async (buttonIndex) => {
        if (buttonIndex === 0) copyLiveAsUrl();
        if (buttonIndex === 1) copyLiveAsQrData();
      });
    } else {
      Alert.alert("Share live profile", "Choose an option", [
        { text: "Copy as URL", onPress: copyLiveAsUrl },
        { text: "Copy as QR code", onPress: copyLiveAsQrData },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

// ===== Fix missing thumbs =====
const profileMediaRef = useRef(profile.media);
profileMediaRef.current = profile.media;

useEffect(() => {
  const fixMissingThumbs = async () => {
    const media = profileMediaRef.current;
    if (!media || media.length === 0) return;

    const updates = await Promise.all(
      media.map(async (m: any) => {
        if (m.videoUri && (!m.imageUri || m.imageUri.trim() === "")) {
          try {
            const res = await VideoThumbnails.getThumbnailAsync(m.videoUri, { time: 1000 });
            if (res.uri) return { ...m, imageUri: res.uri };
          } catch {
            // ignore
          }
        }
        return m;
      })
    );

    const hasChanges = updates.some((u, i) => u.imageUri !== media[i].imageUri);
    if (hasChanges) setProfile((prev: any) => ({ ...prev, media: updates }));
  };

  fixMissingThumbs();
}, []); // ✅ runs once on mount only — uses ref to read latest media

// ===== Fetch latest =====
const fetchLatestProfile = useCallback(async () => {
  try {
    if (!accessToken) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setRefreshing(true);

    const url = `${aws_config.apiBaseUrl}/profile`;

    const doFetch = async (authHeader: string) => {
      const res = await fetch(url, { headers: { Authorization: authHeader } });
      const text = await res.text().catch(() => "");
      return { res, text };
    };

    let { res, text } = await doFetch(`Bearer ${accessToken}`);

    if (res.status === 401) {
      ({ res, text } = await doFetch(accessToken));
    }

    if (!res.ok) {
      console.error("Failed to fetch profile:", res.status, text);
      return;
    }

    const data = text ? JSON.parse(text) : {};
    const user = data?.user ?? data?.users?.[0] ?? null;
    const videoLibrary = data?.videoLibrary ?? data?.videos ?? [];

    const higherEducation = Array.isArray(data?.higher_education)
      ? data.higher_education.map((e: any) => ({
          ...e,
          degreeDetails: Array.isArray(e?.degreeDetails)
            ? e.degreeDetails
            : Array.isArray(e?.degree_details)
              ? e.degree_details
              : [],
          estimatedGraduation: String(e?.estimatedGraduation ?? e?.estimated_graduation ?? "").trim(),
        }))
      : [];

    setProfile((prev: any) => {
      const prevByUnit = new Map<string, any>(
        (Array.isArray(prev?.higherEducation) ? prev.higherEducation : []).map((e: any) => [String(e?.unitid ?? ""), e])
      );

      const mergedHigherEducation = higherEducation.map((e: any) => {
        const prevE = prevByUnit.get(String(e?.unitid ?? ""));
        return {
          ...(prevE ?? {}),
          ...e,
          degreeDetails:
            Array.isArray(e?.degreeDetails) && e.degreeDetails.length > 0
              ? e.degreeDetails
              : Array.isArray(prevE?.degreeDetails)
                ? prevE.degreeDetails
                : [],
          estimatedGraduation:
            String(e?.estimatedGraduation ?? "").trim() || String(prevE?.estimatedGraduation ?? "").trim(),
        };
      });

      return {
        ...prev,
        legalFirstName: user?.legal_first_name ?? "",
        legalLastName: user?.legal_last_name ?? "",
        legalMiddleName: user?.legal_middle_name ?? "",
        email: user?.email ?? "",
        phoneNumber: user?.phone_number ?? "",
        contactUrl1: user?.contact_url_1 ?? user?.contactUrl1 ?? user?.website_url_1 ?? "",
        contactUrl2: user?.contact_url_2 ?? user?.contactUrl2 ?? user?.website_url_2 ?? "",
        contactUrl1Label: user?.contact_url_1_label ?? user?.contactUrl1Label ?? (prev as any)?.contactUrl1Label ?? "URL 1",
        contactUrl2Label: user?.contact_url_2_label ?? user?.contactUrl2Label ?? (prev as any)?.contactUrl2Label ?? "URL 2",
        preferredName: user?.preferred_name ?? "",
        bio: user?.bio ?? "",
        workType: user?.work_type ?? user?.workType ?? user?.employment_type ?? "",
        workPreference: user?.work_preference ?? user?.workPreference ?? user?.work_location_preference ?? "",
        residencyStatus: user?.residency ?? "",
        geographicLocation: user?.location ?? "",
        industryExperience: user?.experience ?? "",
        highestEducationCompleted: user?.highest_education ?? "",
        industryInterests: user?.industry_interests ?? [],
        higherEducation: mergedHigherEducation,
        valuesSummary: Array.isArray((user as any)?.values_summary)
          ? (user as any).values_summary
              .map((item: any, idx: number) => {
                const label = String(item?.label ?? "").trim();
                const value = String(item?.value ?? "").trim();
                if (!label && !value) return null;
                return {
                  key: String(item?.key ?? `value_${idx + 1}`).trim() || `value_${idx + 1}`,
                  label,
                  value: value || label,
                };
              })
              .filter(Boolean)
          : (prev as any)?.valuesSummary ?? [],
        avatarImageUri: toCloudFrontUrl(user?.avatar_image_url ?? user?.avatar_image_key),
        avatarVideoUri: toCloudFrontUrl(user?.avatar_video_url ?? user?.avatar_video_key),
        media: (Array.isArray(videoLibrary) ? videoLibrary : [])
          .filter((v: any) => v.slot !== null && v.slot !== undefined)
          .sort((a: any, b: any) => (a.slot ?? 0) - (b.slot ?? 0))
          .map((v: any, index: number) => {
            const rawUrl = v.thumbnailUrl || v.thumbnail_key || "";
            const finalThumb = toCloudFrontUrl(rawUrl);
            return {
              id: v.id || `vid_${index}`,
              videoUri: toCloudFrontUrl(v.url || v.s3_key),
              imageUri: finalThumb,
              caption: (v.caption ?? v.title ?? "").trim?.() ? (v.caption ?? v.title).trim() : "Untitled",
              slot: v.slot,
            };
          }),
      };
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
  } finally {
    fetchingRef.current = false;
    setRefreshing(false);
  }
}, [accessToken]); // ✅ removed setProfile — it's a stable setter, not needed here

useFocusEffect(
  useCallback(() => {
    if (didFetchOnceRef.current) return;
    didFetchOnceRef.current = true;
    fetchLatestProfile();
  }, [fetchLatestProfile])
);

  // ===== Layout constants =====
  const screenW = Dimensions.get("window").width;
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

  // ===== Hook + headline mapping =====
  const hookText = (profile.bio ?? "").trim();
  const headlineText =
    String((profile as any).headline ?? (profile as any).title ?? (profile as any).tagline ?? "").trim() || "";

  // ===== Values list (ONLY reads from valuesSummary; otherwise hidden) =====
  const valuesItems = useMemo(() => {
    const dynamic = (profile as any).valuesSummary;
    if (!Array.isArray(dynamic) || dynamic.length === 0) return [];
    return dynamic.map((it: any, idx: number) => ({
      key: String(it?.key ?? it?.label ?? idx),
      label: String(it?.label ?? "").trim(),
      value: dashIfEmpty(it?.value),
    }));
  }, [profile]);

  // ===== Qualifications dropdown (2-page pull-in) =====
  const [qualOpen, setQualOpen] = useState(false);
  const [qualPage, setQualPage] = useState<0 | 1>(0);

  const qualHeight = useRef(new Animated.Value(0)).current; // non-native
  const qualOpacity = useRef(new Animated.Value(0)).current; // native
  const qualTranslateY = useRef(new Animated.Value(-6)).current; // native
  const [qualContentH, setQualContentH] = useState(0);

  const openingQualRef = useRef(false);
  const closingQualRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
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
    [qualChevron, qualContentH, qualHeight, qualOpacity, qualTranslateY]
  );

  const openQual = useCallback(() => {
    if (qualOpen) return;
    if (openingQualRef.current || closingQualRef.current) return;

    openingQualRef.current = true;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQualOpen(true);

    // Wait up to ~8 frames for the measurer to report a real height.
    requestAnimationFrame(() => runOpenAnimation(8));
  }, [qualOpen, runOpenAnimation]);

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
          if (!qualOpen || closingQualRef.current || openingQualRef.current) return false;
          const dx = Math.abs(gestureState.dx);
          const dy = Math.abs(gestureState.dy);
          return dx > 10 && dx > dy;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!qualOpen || closingQualRef.current || openingQualRef.current) return;
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
    [pageX, qualOpen, qualPage]
  );

  const higherEd = Array.isArray((profile as any).higherEducation) ? ((profile as any).higherEducation as any[]) : [];

  const qualCol1: QualRow[] = useMemo(() => {
    const workTypePrimary = String(
      (profile as any).workType ?? (profile as any).work_type ?? (profile as any).employmentType ?? ""
    ).trim();
    const workTypeSecondary = String(
      (profile as any).workPreference ?? (profile as any).work_preference ?? (profile as any).work_location_preference ?? ""
    ).trim();
    const workType = dashIfEmpty([workTypePrimary, workTypeSecondary].filter(Boolean).join(" · "));
    const location = dashIfEmpty(profile.geographicLocation);

    const higherEdItems =
      higherEd.length > 0
        ? higherEd
            .map((e: any) => formatHigherEdMultiline(e))
            .filter((s: string) => String(s ?? "").trim() && String(s ?? "").trim() !== "—")
        : [];

    return [
      { label: "Work type", value: workType },
      { label: "Location", value: location },
      { label: "Higher education", value: higherEdItems.length ? higherEdItems : "—" },
    ];
  }, [higherEd, profile]);

  const qualCol2: QualRow[] = useMemo(() => {
    const residency = dashIfEmpty(profile.residencyStatus);
    const experience = dashIfEmpty(profile.industryExperience);
    const interests = joinOrDash(profile.industryInterests ?? []);

    const funFacts = (profile.additionalDetails ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    return [
      { label: "Residency status", value: residency },
      { label: "Industry experience", value: experience },
      { label: "Industry interests", value: interests },
      { label: "Fun facts", value: funFacts.length ? funFacts.join("\n") : "—" },
    ];
  }, [profile]);

  // ===== Videos (horizontal snap) =====
  const videos = useMemo(() => {
    const list = Array.isArray(profile.media) ? profile.media : [];
    return list.filter((m: any) => m?.videoUri?.trim());
  }, [profile.media]);
  const contactEmail = String(profile.email ?? "").trim();
  const contactPhone = String(profile.phoneNumber ?? "").trim();
  const contactUrl1 = String((profile as any).contactUrl1 ?? "").trim();
  const contactUrl2 = String((profile as any).contactUrl2 ?? "").trim();
  const contactUrl1Label = String((profile as any).contactUrl1Label ?? "URL 1").trim() || "URL 1";
  const contactUrl2Label = String((profile as any).contactUrl2Label ?? "URL 2").trim() || "URL 2";
  const showUrl1 = !!(profile as any)?.contactDisplaySettings?.showUrl1;
  const showUrl2 = !!(profile as any)?.contactDisplaySettings?.showUrl2;

  const CARD_W = Math.min(220, Math.round(screenW * 0.62));
  const CARD_GAP = 12;
  const SNAP = CARD_W + CARD_GAP;

  const openVideo = useCallback(
    (uri: string) => {
      router.push({
        pathname: "/(companyUser)/video",
        params: {
          uri,
          returnTo: pathname,
          playId: String(Date.now()),
        },
      });
    },
    [pathname]
  );

  return (
    <>
      <RequireUserType type="home" />

      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: BG }}>
        <Animated.ScrollView
          style={{ backgroundColor: BG }}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchLatestProfile} />}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        >
          {/* Block A */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable onPress={openLiveShareSheet} hitSlop={10}>
                <Text style={s.topLink}>Share Live</Text>
              </Pressable>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
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

                <Pressable onPress={() => router.push("/(companyUser)/profile-edit")} hitSlop={10}>
                  <Feather name="edit-2" size={18} color={TEXT} />
                </Pressable>

                <Pressable onPress={() => router.push("/(companyUser)/settings")} hitSlop={10}>
                  <Feather name="settings" size={18} color={TEXT} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => openVideo(profile.avatarVideoUri)}
              style={{ alignSelf: "center", marginTop: 18 }}
              hitSlop={10}
            >
              {profile.avatarImageUri?.trim() ? (
                <Animated.Image
                  source={{ uri: profile.avatarImageUri }}
                  style={{ width: avatarSize, height: avatarSize, borderRadius: avatarRadius }}
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

            <Pressable
              disabled={!canToggleName}
              onPress={() => {
                if (!canToggleName) return;
                setShowLegalNow((v) => !v);
              }}
              style={{ alignSelf: "center", marginTop: 12 }}
              hitSlop={10}
            >
              <Text style={s.displayName}>{displayName}</Text>
            </Pressable>

            {!!headlineText && <Text style={s.headline}>{headlineText}</Text>}

            {valuesItems.length > 0 ? (
              <View style={{ marginTop: 8, gap: 8, alignItems: "center" }}>
                {valuesItems.map((it) => (
                  <View key={it.key} style={{ gap: 4, alignItems: "center", width: "100%" }}>
                    {!!it.label && <Text style={s.valuesLabel}>{it.label}</Text>}
                    <Text style={s.valuesValue}>{it.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block B */}
          <View style={{ backgroundColor: WHITE, padding: BLOCK_PAD }}>
            {!!hookText ? <Text style={s.hook}>{hookText}</Text> : <Text style={[s.hook, { opacity: 1 }]}>—</Text>}
          </View>

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block C */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <Pressable
              onPress={toggleQual}
              hitSlop={10}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 2,
              }}
            >
              <Text style={s.qualHeader}>QUALIFICATIONS</Text>

              <Animated.View style={{ transform: [{ rotate: qualChevronRotate }], marginRight: 6 }}>
                <Feather name="chevron-down" size={24} color={HINT} />
              </Animated.View>
            </Pressable>

            {/* ✅ Premium animated reveal container */}
            <Animated.View style={{ height: qualHeight, overflow: "hidden" }}>
              {/* ✅ Hidden measurer */}
              <View
                pointerEvents="none"
                style={{ opacity: 0, position: "absolute", left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && Math.abs(h - qualContentH) > 2) setQualContentH(h);
                }}
              >
                <View style={{ marginTop: 14 }}>
                  <View style={{ overflow: "hidden" }}>
                    <View style={{ width: panelW * 2, flexDirection: "row" }}>
                      <View style={{ width: panelW }}>
                        <View style={{ gap: 14 }}>
                          {qualCol1.map((row) => (
                            <View key={row.label} style={{ gap: 4, paddingRight: QUAL_RIGHT_GUTTER }}>
                              <Text style={s.qualLabel}>{row.label}</Text>
                              <QualValue value={row.value} textStyle={s.qualValue} />
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={{ width: panelW }}>
                        <View style={{ gap: 14 }}>
                          {qualCol2.map((row) => (
                            <View key={row.label} style={{ gap: 4, paddingRight: QUAL_RIGHT_GUTTER }}>
                              <Text style={s.qualLabel}>{row.label}</Text>
                              <QualValue value={row.value} textStyle={s.qualValue} />
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "center" }}>
                    {[0, 1].map((idx) => {
                      const active = qualPage === idx;
                      return (
                        <View
                          key={`qual-dot-measure-${idx}`}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 999,
                            marginHorizontal: 3.5,
                            backgroundColor: active ? "#202020" : HINT,
                            opacity: active ? 1 : 0.95,
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Visible animated content */}
              {qualOpen ? (
                <Animated.View style={{ opacity: qualOpacity, transform: [{ translateY: qualTranslateY }] }}>
                  <View style={{ marginTop: 14 }}>
                    <View style={{ overflow: "hidden" }} {...qualSwipeResponder.panHandlers}>
                      <Animated.View
                        style={{
                          width: panelW * 2,
                          flexDirection: "row",
                          transform: [{ translateX: pageTranslateX }],
                        }}
                      >
                        <View style={{ width: panelW }}>
                          <View style={{ gap: 14 }}>
                            {qualCol1.map((row) => (
                              <View key={row.label} style={{ gap: 4, paddingRight: QUAL_RIGHT_GUTTER }}>
                                <Text style={s.qualLabel}>{row.label}</Text>
                                <QualValue value={row.value} textStyle={s.qualValue} />
                              </View>
                            ))}
                          </View>
                        </View>

                        <View style={{ width: panelW }}>
                          <View style={{ gap: 14 }}>
                            {qualCol2.map((row) => (
                              <View key={row.label} style={{ gap: 4, paddingRight: QUAL_RIGHT_GUTTER }}>
                                <Text style={s.qualLabel}>{row.label}</Text>
                                <QualValue value={row.value} textStyle={s.qualValue} />
                              </View>
                            ))}
                          </View>
                        </View>
                      </Animated.View>

                      {/* Page toggle button */}
                      <Pressable
                        onPress={toggleQualPage}
                        hitSlop={10}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: QUAL_PAGE_BUTTON_W,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      />
                    </View>

                    <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "center" }}>
                      {[0, 1].map((idx) => {
                        const active = qualPage === idx;
                        return (
                          <View
                            key={`qual-dot-${idx}`}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              marginHorizontal: 3.5,
                              backgroundColor: active ? "#202020" : HINT,
                              opacity: active ? 1 : 0.95,
                            }}
                          />
                        );
                      })}
                    </View>
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          </View>

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block D */}
          <View style={{ backgroundColor: WHITE, paddingVertical: BLOCK_PAD, paddingLeft: BLOCK_PAD }}>
            <View style={{ paddingRight: BLOCK_PAD, paddingBottom: 16 }}>
              <Text style={s.qualHeader}>QUESTIONS</Text>
            </View>

            <FlatList
              data={videos}
              keyExtractor={(item: any) => String(item.id ?? `${item.slot ?? "x"}_${item.videoUri ?? ""}`)}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP}
              decelerationRate="fast"
              disableIntervalMomentum
              contentContainerStyle={{ paddingRight: BLOCK_PAD }}
              ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
              renderItem={({ item }: { item: any }) => {
                const uri = String(item.videoUri ?? "").trim();
                const thumb = String(item.imageUri ?? "").trim();
                const caption = String(item.caption ?? "Untitled");

                return (
                  <Pressable
                    onPress={() => openVideo(uri)}
                    style={{
                      width: CARD_W,
                      backgroundColor: WHITE,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <View style={{ width: "100%", height: Math.round(CARD_W * 0.78), backgroundColor: "#EDEDED" }}>
                      {!!thumb ? <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} /> : null}
                    </View>

                    <View style={{ padding: 12 }}>
                      <Text style={s.videoCaption}>
                        {caption}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block E */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <Text style={s.qualHeader}>CONTACT</Text>

            <View style={{ marginTop: 14, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={s.contactLabel}>Email</Text>
                <Pressable onPress={copyEmail} disabled={!contactEmail} hitSlop={8}>
                  <Text style={s.contactValue}>{contactEmail || "—"}</Text>
                </Pressable>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={s.contactLabel}>Phone</Text>
                <Pressable onPress={copyPhone} disabled={!contactPhone} hitSlop={8}>
                  <Text style={s.contactValue}>{contactPhone || "—"}</Text>
                </Pressable>
              </View>

              {showUrl1 ? (
                <View style={{ gap: 4 }}>
                  <Text style={s.contactLabel}>{contactUrl1Label}</Text>
                  <Pressable onPress={() => copyUrl(contactUrl1)} disabled={!contactUrl1} hitSlop={8}>
                    <Text style={s.contactValue}>{contactUrl1 || "—"}</Text>
                  </Pressable>
                </View>
              ) : null}

              {showUrl2 ? (
                <View style={{ gap: 4 }}>
                  <Text style={s.contactLabel}>{contactUrl2Label}</Text>
                  <Pressable onPress={() => copyUrl(contactUrl2)} disabled={!contactUrl2} hitSlop={8}>
                    <Text style={s.contactValue}>{contactUrl2 || "—"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>
    </>
  );
}
