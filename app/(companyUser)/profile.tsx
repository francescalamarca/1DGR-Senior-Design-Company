/**
 * Profile Screen (V2 Visual Redesign)
 * - Preserves: avatar press-to-play, slot-based videos, name toggle logic, live share sheet, fetch/refresh.
 * - Visual changes only unless explicitly noted.
 *
 * New layout:
 * Block A (bg): ShareLive + edit(pencil) + settings, avatar, name, headline, Values list
 * Block B (white): mission
 * Block C (bg): benefitsifications dropdown (2-page pull-in) + premium open/close animation
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

// MUST match EXACT keys from your useFonts(...)
const FONTS = {
  LEXEND_LIGHT: "Lexend-Light",
  LEXEND_REGULAR: "Lexend-Regular",
  LEXEND_BOLD: "Lexend-Bold",

  DMMONO_LIGHT: "DMMono-Light",

  CRIMSON_REGULAR: "CrimsonText-Regular",
  CRIMSON_SEMIBOLD: "CrimsonText-SemiBold",
} as const;

// Backgrounds
const BG = "#fbfbfb";
const WHITE = "#FFFFFF";

// Brand neutrals
const TEXT = "#202020";
const HINT = "#9bb4c0";
const BORDER = "#d9d9d9";

// Right-side page-toggle button takes space; keep text readable without shrinking the whole column.
const benefits_PAGE_BUTTON_W = 38; 
const benefits_PAGE_BUTTON_GAP = 8; // breathing room so text never touches the divider
const benefits_RIGHT_GUTTER = benefits_PAGE_BUTTON_W + benefits_PAGE_BUTTON_GAP;

//FOR COMPANY SAME THING
// Right-side page-toggle button takes space; keep text readable without shrinking the whole column.
const company_PAGE_BUTTON_W = 38; 
const company_PAGE_BUTTON_GAP = 8; // breathing room so text never touches the divider
const company_RIGHT_GUTTER = company_PAGE_BUTTON_W + company_PAGE_BUTTON_GAP;

//FOR EMPLOYEES SAME THING
// Right-side page-toggle button takes space; keep text readable without shrinking the whole column.
const employee_PAGE_BUTTON_W = 38; 
const employee_PAGE_BUTTON_GAP = 8; // breathing room so text never touches the divider
const employee_RIGHT_GUTTER = employee_PAGE_BUTTON_W + employee_PAGE_BUTTON_GAP;

//FOR EMPLOYEES SAME THING
// Right-side page-toggle button takes space; keep text readable without shrinking the whole column.
const roles_PAGE_BUTTON_W = 38; 
const roles_PAGE_BUTTON_GAP = 8; // breathing room so text never touches the divider
const roles_RIGHT_GUTTER = roles_PAGE_BUTTON_W + roles_PAGE_BUTTON_GAP;


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

function dashIfEmpty(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

function joinOrDash(arr: any[]) {
  const a = Array.isArray(arr)
    ? arr
        .filter(Boolean)
        .map((x) => String(x).trim())
        .filter(Boolean)
    : [];
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

type benefitsRowValue = string | string[];
type benefitsRow = { label: string; value: companyRowValue };

type companyRowValue = string | string[];
type companyRow = { label: string; value: companyRowValue };

type employeeRowValue = string | string[];
type employeeRow = { label: string; value: employeeRowValue };

type rolesRowValue = string | string[];
type rolesRow = { label: string; value: rolesRowValue };

/** Build a location string from common fields (city/state/country OR location fields). */
function formatBusinessLocationLine(e: any): string {
  const city = String(e?.city ?? e?.schoolCity ?? e?.school_city ?? "").trim();
  const state = String(
    e?.state ?? e?.region ?? e?.schoolState ?? e?.school_state ?? "",
  ).trim();
  const country = String(
    e?.country ?? e?.nation ?? e?.schoolCountry ?? e?.school_country ?? "",
  ).trim();

  const directLocation = String(
    e?.location ?? e?.schoolLocation ?? e?.school_location ?? "",
  ).trim();

  // Prefer explicit city/state/country if any exist
  const parts = [city, state, country].filter(Boolean);
  if (parts.length) return parts.join(", ");

  // Fallback to a single location field if backend provides it
  if (directLocation) return directLocation;

  return "";
}

/** Render a benefits row's value. If it's a list (universities), add spacing between items. */
function BenefitsValue({
  value,
  textStyle,
}: {
  value: benefitsRowValue;
  textStyle: any;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={textStyle}>—</Text>;

    return (
      <View>
        {value.map((item, idx) => (
          <Text
            key={`${idx}_${item}`}
            //style={[textStyle, idx === value.length - 1 ? null : { marginBottom: HIGHER_ED_ITEM_GAP }]}
          >
            {softWrapLongTokens(item)}
          </Text>
        ))}
      </View>
    );
  }

  return <Text style={textStyle}>{softWrapLongTokens(value)}</Text>;
}

/** Render a company row's value. If it's a list (universities), add spacing between items. */
function CompanyValue({
  value,
  textStyle,
}: {
  value: companyRowValue;
  textStyle: any;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={textStyle}>—</Text>;

    return (
      <View>
        {value.map((item, idx) => (
          <Text
            key={`${idx}_${item}`}
            //style={[textStyle, idx === value.length - 1 ? null : { marginBottom: HIGHER_ED_ITEM_GAP }]}
          >
            {softWrapLongTokens(item)}
          </Text>
        ))}
      </View>
    );
  }

  return <Text style={textStyle}>{softWrapLongTokens(value)}</Text>;
}

function EmployeeValue({
  value,
  textStyle,
}: {
  value: companyRowValue;
  textStyle: any;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={textStyle}>—</Text>;

    return (
      <View>
        {value.map((item, idx) => (
          <Text
            key={`${idx}_${item}`}
            //style={[textStyle, idx === value.length - 1 ? null : { marginBottom: HIGHER_ED_ITEM_GAP }]}
          >
            {softWrapLongTokens(item)}
          </Text>
        ))}
      </View>
    );
  }

  return <Text style={textStyle}>{softWrapLongTokens(value)}</Text>;
}

function RolesValue({
  value,
  textStyle,
}: {
  value: rolesRowValue;
  textStyle: any;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={textStyle}>—</Text>;

    return (
      <View>
        {value.map((item, idx) => (
          <Text
            key={`${idx}_${item}`}
            //style={[textStyle, idx === value.length - 1 ? null : { marginBottom: HIGHER_ED_ITEM_GAP }]}
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
  const [showCompanyNow, setShowCompanyNow] = useState(false);

  const showCompanyName = profile.nameDisplaySettings.showCompanyName;


  const displayName = useMemo(() => {
    return profile.companyName;
  }, [profile.companyName]);

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

      mission: {
        //renamed to be specific for company side
        ...crimson,
        textAlign: "center" as const,
        opacity: 1,
        fontSize: 20,
        lineHeight: 24,
        paddingHorizontal: 20,
        color: TEXT,
      } as const,

      valuesLabel: {
        ...lexLight,
        fontSize: 12,
        color: TEXT,
        opacity: 1,
      } as const,
      valuesValue: {
        ...lexLight,
        fontSize: 13,
        color: TEXT,
        opacity: 0.65,
        textAlign: "center" as const,
      } as const,
      contactLabel: {
        ...lexLight,
        fontSize: 12.5,
        color: HINT,
        opacity: 1,
      } as const,
      contactValue: {
        ...lexLight,
        fontSize: 14,
        color: TEXT,
        opacity: 1,
      } as const,

      benefitsHeader: {
        ...lexLight,
        fontSize: 13,
        marginLeft: 5,
        letterSpacing: 1.4,
        color: TEXT,
        opacity: 1,
      } as const,

      // (kept font + opacity exactly as you had)
      benefitsLabel: {
        ...lexLight,
        fontSize: 12.5,
        color: TEXT,
        opacity: 1,
        marginLeft: 5,
      } as const,
      BenefitsValue: {
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

      //FOR COMPANY LOCATION SHOULD HAVE CLARIFIED
      companyHeader: {
        ...lexLight,
        fontSize: 13,
        marginLeft: 5,
        letterSpacing: 1.4,
        color: TEXT,
        opacity: 1,
      } as const,

      // (kept font + opacity exactly as you had)
      companyLabel: {
        ...lexLight,
        fontSize: 12.5,
        color: TEXT,
        opacity: 1,
        marginLeft: 5,
      } as const,
      CompanyValue: {
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


      //FOR CURRENT EMPLOYEE INFORMATION
      employeeHeader: {
        ...lexLight,
        fontSize: 13,
        marginLeft: 5,
        letterSpacing: 1.4,
        color: TEXT,
        opacity: 1,
      } as const,

      // (kept font + opacity exactly as you had)
      employeeLabel: {
        ...lexLight,
        fontSize: 12.5,
        color: TEXT,
        opacity: 1,
        marginLeft: 5,
      } as const,
      EmployeeValue: {
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

      rolesHeader: {
        ...lexLight,
        fontSize: 13,
        marginLeft: 5,
        letterSpacing: 1.4,
        color: TEXT,
        opacity: 1,
      } as const,

      // (kept font + opacity exactly as you had)
      rolesLabel: {
        ...lexLight,
        fontSize: 12.5,
        color: TEXT,
        opacity: 1,
        marginLeft: 5,
      } as const,
      RolesValue: {
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
              const res = await VideoThumbnails.getThumbnailAsync(m.videoUri, {
                time: 1000,
              });
              if (res.uri) return { ...m, imageUri: res.uri };
            } catch {
              // ignore
            }
          }
          return m;
        }),
      );

      const hasChanges = updates.some(
        (u, i) => u.imageUri !== media[i].imageUri,
      );
      if (hasChanges) setProfile((prev: any) => ({ ...prev, media: updates }));
    };

    fixMissingThumbs();
  }, []); // runs once on mount only — uses ref to read latest media

  // ===== Fetch latest =====
  const fetchLatestProfile = useCallback(async () => {
    try {
      if (!accessToken) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;
      setRefreshing(true);

      const url = `${aws_config.apiBaseUrl}/profile`;

      const doFetch = async (authHeader: string) => {
        const res = await fetch(url, {
          headers: { Authorization: authHeader },
        });
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

      setProfile((prev: any) => {
        return {
          ...prev,
          companyName: user?.company_name ?? "",
          email: user?.email ?? "",
          phoneNumber: user?.phone_number ?? "",
          contactUrl1:
            user?.contact_url_1 ??
            user?.contactUrl1 ??
            user?.website_url_1 ??
            "",
          contactUrl2:
            user?.contact_url_2 ??
            user?.contactUrl2 ??
            user?.website_url_2 ??
            "",
          contactUrl1Label:
            user?.contact_url_1_label ??
            user?.contactUrl1Label ??
            (prev as any)?.contactUrl1Label ??
            "URL 1",
          contactUrl2Label:
            user?.contact_url_2_label ??
            user?.contactUrl2Label ??
            (prev as any)?.contactUrl2Label ??
            "URL 2",
          missionStatement: user?.missionStatement ?? "",
          workType:
            user?.work_type ?? user?.workType ?? user?.employment_type ?? "",
          workPreference:
            user?.work_preference ??
            user?.workPreference ??
            user?.work_location_preference ??
            "",
          locations: Array.isArray((user as any)?.locations)
            ? (user as any).locations.map((loc: any) => String(loc ?? "").trim()).filter(Boolean)
            : ((prev as any)?.locations ?? []),
          industryExperience: user?.experience ?? "",
          industryInterests: user?.industry_interests ?? [],
          avatarImageUri: toCloudFrontUrl(
            user?.avatar_image_url ?? user?.avatar_image_key,
          ),
          avatarVideoUri: toCloudFrontUrl(
            user?.avatar_video_url ?? user?.avatar_video_key,
          ),
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
                caption: (v.caption ?? v.title ?? "").trim?.()
                  ? (v.caption ?? v.title).trim()
                  : "Untitled",
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
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      if (didFetchOnceRef.current) return;
      didFetchOnceRef.current = true;
      fetchLatestProfile();
    }, [fetchLatestProfile]),
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

  // ===== mission + headline mapping =====
  const missionText = (profile.missionStatement ?? "").trim();
  const headlineText =
    String(
      (profile as any).headline ??
        (profile as any).title ??
        (profile as any).tagline ??
        "",
    ).trim() || "";


  // ===== Benefits dropdown (2-page pull-in) =====
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [benefitsPage, setBenefitsPage] = useState<0 | 1>(0);

  const benefitsHeight = useRef(new Animated.Value(0)).current; // non-native
  const benefitsOpacity = useRef(new Animated.Value(0)).current; // native
  const benefitsTranslateY = useRef(new Animated.Value(-6)).current; // native
  const [benefitsContentH, setBenefitsContentH] = useState(0);

  const openingBenefitsRef = useRef(false);
  const closingBenefitsRef = useRef(false);

  const benefitsChevron = useRef(new Animated.Value(0)).current;
  const benefitsChevronRotate = benefitsChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // ===== Company Location dropdown (2-page pull-in) =====
  //all of these components must be unique to each dropdown in order for them to open individually
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyPage, setCompanyPage] = useState<0 | 1>(0);

  const companyHeight = useRef(new Animated.Value(0)).current; // non-native
  const companyOpacity = useRef(new Animated.Value(0)).current; // native
  const companyTranslateY = useRef(new Animated.Value(-6)).current; // native
  const [companyContentH, setCompanyContentH] = useState(0);

  const openingCompanyRef = useRef(false);
  const closingCompanyRef = useRef(false);

  const companyChevron = useRef(new Animated.Value(0)).current;
  const companyChevronRotate = companyChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // ===== Employee Location dropdown (2-page pull-in) =====
  //all of these components must be unique to each dropdown in order for them to open individually
  const [employeeOpen, setemployeeOpen] = useState(false);
  const [employeePage, setemployeePage] = useState<0 | 1>(0);

  const employeeHeight = useRef(new Animated.Value(0)).current; // non-native
  const employeeOpacity = useRef(new Animated.Value(0)).current; // native
  const employeeTranslateY = useRef(new Animated.Value(-6)).current; // native
  const [employeeContentH, setemployeeContentH] = useState(0);

  const employeeRef = useRef(false);
  const closingEmployeeRef = useRef(false);

  const employeeChevron = useRef(new Animated.Value(0)).current;
  const employeeChevronRotate = employeeChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // ===== roles Location dropdown (2-page pull-in) =====
  //all of these components must be unique to each dropdown in order for them to open individually
  const [rolesOpen, setrolesOpen] = useState(false);
  const [rolesPage, setrolesPage] = useState<0 | 1>(0);

  const rolesHeight = useRef(new Animated.Value(0)).current; // non-native
  const rolesOpacity = useRef(new Animated.Value(0)).current; // native
  const rolesTranslateY = useRef(new Animated.Value(-6)).current; // native
  const [rolesContentH, setrolesContentH] = useState(0);

  const rolesRef = useRef(false);
  const closingrolesRef = useRef(false);

  const rolesChevron = useRef(new Animated.Value(0)).current;
  const rolesChevronRotate = rolesChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Page slide (0 -> 1 pulls second column into view)
  const pageX = useRef(new Animated.Value(0)).current;

  // translate pageX in pixels (one full panel width)
  const panelW = screenW - BLOCK_PAD * 2;
  const pageTranslateX = pageX.interpolate({
    inputRange: [-1, 0],
    outputRange: [-panelW, 0],
  });

  //=========== START BENEFITS PAGE RETURN ==============

  // Keep container height synced if content height changes while open (ex: fetch updates)
  useEffect(() => {
    if (!benefitsOpen) return;
    if (!benefitsContentH) return;

    Animated.timing(benefitsHeight, {
      toValue: benefitsContentH,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [benefitsOpen, benefitsContentH, benefitsHeight]);

  const runOpenBenefitsAnimation = useCallback(
    (triesLeft: number) => {
      // If still no measurement yet, wait a frame (prevents “opens to height=1” bug)
      if (!benefitsContentH && triesLeft > 0) {
        requestAnimationFrame(() => runOpenBenefitsAnimation(triesLeft - 1));
        return;
      }

      const targetH = Math.max(benefitsContentH, 1);

      // Make sure values start from closed state (prevents half-open weirdness)
      benefitsOpacity.setValue(0);
      benefitsTranslateY.setValue(-6);
      benefitsHeight.setValue(0);

      Animated.parallel([
        Animated.timing(benefitsChevron, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(benefitsOpacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(benefitsTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(benefitsHeight, {
          toValue: targetH,
          damping: 26,
          stiffness: 220,
          mass: 1,
          overshootClamping: true,
          useNativeDriver: false,
        }),
      ]).start(() => {
        openingBenefitsRef.current = false;
      });
    },
    [
      benefitsChevron,
      benefitsContentH,
      benefitsHeight,
      benefitsOpacity,
      benefitsTranslateY,
    ],
  );

  const openbenefits = useCallback(() => {
    if (benefitsOpen) return;
    if (openingBenefitsRef.current || closingBenefitsRef.current) return;

    openingBenefitsRef.current = true;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBenefitsOpen(true);

    // Wait up to ~8 frames for the measurer to report a real height.
    requestAnimationFrame(() => runOpenBenefitsAnimation(8));
  }, [benefitsOpen, runOpenBenefitsAnimation]);

  const closebenefits = useCallback(() => {
    if (!benefitsOpen) return;
    if (closingBenefitsRef.current || openingBenefitsRef.current) return;

    closingBenefitsRef.current = true;

    Animated.parallel([
      Animated.timing(benefitsChevron, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(benefitsOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(benefitsTranslateY, {
        toValue: -6,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(benefitsHeight, {
        toValue: 0,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setBenefitsPage(0);
      setBenefitsOpen(false);
      closingBenefitsRef.current = false;
    });
  }, [
    benefitsOpen,
    benefitsChevron,
    benefitsHeight,
    benefitsOpacity,
    benefitsTranslateY,
  ]);

  const togglebenefits = useCallback(() => {
    if (!benefitsOpen) return openbenefits();
    return closebenefits();
  }, [benefitsOpen, openbenefits, closebenefits]);


  const benefitsCol1: benefitsRow[] = useMemo(() => {
  const workType = dashIfEmpty((profile as any).work_type ?? "");
  const location = dashIfEmpty(
    Array.isArray(profile.locations) && profile.locations.length 
      ? profile.locations.join(" · ") 
      : ""
  );
  const age = dashIfEmpty((profile as any).business_age ?? "");
  const benefits = dashIfEmpty((profile as any).benefits_summary ?? "");

  return [
    { label: "Work Type", value: workType },
    { label: "Locations", value: location },
    { label: "Business Age", value: age },
    { label: "Benefits", value: benefits },
  ];
}, [profile]);


  //=========== COMPANY COLUMN ====================
  // Keep container height synced if content height changes while open (ex: fetch updates)
  useEffect(() => {
    if (!companyOpen) return;
    if (!companyContentH) return; //need to change this function to reflect company info i want to drop down

    Animated.timing(companyHeight, {
      toValue: companyContentH,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [companyOpen, companyContentH, companyHeight]);

  const runOpenCompanyAnimation = useCallback(
    (triesLeft: number) => {
      // If still no measurement yet, wait a frame (prevents “opens to height=1” bug)
      if (!companyContentH && triesLeft > 0) {
        requestAnimationFrame(() => runOpenCompanyAnimation(triesLeft - 1));
        return;
      }

      const targetH = Math.max(companyContentH, 1);

      // Make sure values start from closed state (prevents half-open weirdness)
      companyOpacity.setValue(0);
      companyTranslateY.setValue(-6);
      companyHeight.setValue(0);

      Animated.parallel([
        Animated.timing(companyChevron, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(companyOpacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(companyTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(companyHeight, {
          toValue: targetH,
          damping: 26,
          stiffness: 220,
          mass: 1,
          overshootClamping: true,
          useNativeDriver: false,
        }),
      ]).start(() => {
        openingCompanyRef.current = false;
      });
    },
    [
      companyChevron,
      companyContentH,
      companyHeight,
      companyOpacity,
      companyTranslateY,
    ],
  );

  const opencompany = useCallback(() => {
    if (companyOpen) return;
    if (openingCompanyRef.current || closingCompanyRef.current) return;

    openingCompanyRef.current = true;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCompanyOpen(true);

    // Wait up to ~8 frames for the measurer to report a real height.
    requestAnimationFrame(() => runOpenCompanyAnimation(8));
  }, [companyOpen, runOpenCompanyAnimation]);

  const closecompany = useCallback(() => {
    if (!companyOpen) return;
    if (closingCompanyRef.current || openingCompanyRef.current) return;

    closingCompanyRef.current = true;

    Animated.parallel([
      Animated.timing(companyChevron, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(companyOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(companyTranslateY, {
        toValue: -6,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(companyHeight, {
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
      setCompanyPage(0);
      setCompanyOpen(false);
      closingCompanyRef.current = false;
    });
  }, [
    companyOpen,
    pageX,
    companyChevron,
    companyHeight,
    companyOpacity,
    companyTranslateY,
  ]);

  const togglecompany = useCallback(() => {
    if (!companyOpen) return opencompany();
    return closecompany();
  }, [companyOpen, opencompany, closecompany]);

  const companyCol1: companyRow[] = useMemo(() => {
  const location = dashIfEmpty(
    Array.isArray(profile.locations) && profile.locations.length 
      ? profile.locations.join(" · ") 
      : ""
  );

  return [
    { label: "Locations", value: location },
  ];
}, [profile]);


  //========= end company set up blocks

  //=========== EMPLOYEE COLUMN ====================
  // Keep container height synced if content height changes while open (ex: fetch updates)
  useEffect(() => {
    if (!employeeOpen) return;
    if (!employeeContentH) return; 

    Animated.timing(employeeHeight, {
      toValue: employeeContentH,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [employeeOpen, employeeContentH, employeeHeight]);

  const runopenemployeeAnimation = useCallback(
    (triesLeft: number) => {
      // If still no measurement yet, wait a frame (prevents “opens to height=1” bug)
      if (!employeeContentH && triesLeft > 0) {
        requestAnimationFrame(() => runopenemployeeAnimation(triesLeft - 1));
        return;
      }

      const targetH = Math.max(employeeContentH, 1);

      // Make sure values start from closed state (prevents half-open weirdness)
      employeeOpacity.setValue(0);
      employeeTranslateY.setValue(-6);
      employeeHeight.setValue(0);

      Animated.parallel([
        Animated.timing(employeeChevron, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(employeeOpacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(employeeTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(employeeHeight, {
          toValue: targetH,
          damping: 26,
          stiffness: 220,
          mass: 1,
          overshootClamping: true,
          useNativeDriver: false,
        }),
      ]).start(() => {
        employeeRef.current = false;
      });
    },
    [
      employeeChevron,
      employeeContentH,
      employeeHeight,
      employeeOpacity,
      employeeTranslateY,
    ],
  );

  const openemployee = useCallback(() => {
    if (employeeOpen) return;
    if (employeeRef.current || closingEmployeeRef.current) return;

    employeeRef.current = true;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setemployeeOpen(true);

    // Wait up to ~8 frames for the measurer to report a real height.
    requestAnimationFrame(() => runopenemployeeAnimation(8));
  }, [employeeOpen, runopenemployeeAnimation]);

  const closeemployee = useCallback(() => {
    if (!employeeOpen) return;
    if (closingEmployeeRef.current || employeeRef.current) return;

    closingEmployeeRef.current = true;

    Animated.parallel([
      Animated.timing(employeeChevron, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(employeeOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(employeeTranslateY, {
        toValue: -6,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(employeeHeight, {
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
      setemployeePage(0);
      setemployeeOpen(false);
      closingEmployeeRef.current = false;
    });
  }, [
    employeeOpen,
    pageX,
    employeeChevron,
    employeeHeight,
    employeeOpacity,
    employeeTranslateY,
  ]);

  const toggleemployees = useCallback(() => {
    if (!employeeOpen) return openemployee();
    return closeemployee();
  }, [employeeOpen, openemployee, closeemployee]);

  const toggleemployeePage = useCallback(() => {
    if (!employeeOpen) return;
    if (closingEmployeeRef.current || employeeRef.current) return;

    const next: 0 | 1 = employeePage === 0 ? 1 : 0;
    setemployeePage(next);

    Animated.spring(pageX, {
      toValue: next === 1 ? -1 : 0,
      damping: 26,
      stiffness: 240,
      mass: 1,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
  }, [pageX, employeePage, employeeOpen]);

  const employeeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (
            !employeeOpen ||
            closingEmployeeRef.current ||
            employeeRef.current
          )
            return false;
          const dx = Math.abs(gestureState.dx);
          const dy = Math.abs(gestureState.dy);
          return dx > 10 && dx > dy;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (
            !employeeOpen ||
            closingEmployeeRef.current ||
            employeeRef.current
          )
            return;
          const { dx } = gestureState;
          if (dx < -35 && employeePage === 0) {
            setemployeePage(1);
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
          if (dx > 35 && employeePage === 1) {
            setemployeePage(0);
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
    [pageX, employeeOpen, employeePage],
  );

  const employeeCol1: employeeRow[] = useMemo(() => {
    const employees = dashIfEmpty(
      Array.isArray(profile.currentEmployees) && profile.currentEmployees.length 
      ? profile.currentEmployees.join(" · ") 
      : ""
    );

    return [
      { label: "Employees", value: employees },
    ];
  }, [profile]);

  //======= end employee column set up ===========

  //======= START roles column info set up ============
  // Keep container height synced if content height changes while open (ex: fetch updates)
  useEffect(() => {
    if (!rolesOpen) return;
    if (!rolesContentH) return; 

    Animated.timing(rolesHeight, {
      toValue: rolesContentH,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [rolesOpen, rolesContentH, rolesHeight]);

  const runopenrolesAnimation = useCallback(
    (triesLeft: number) => {
      // If still no measurement yet, wait a frame (prevents “opens to height=1” bug)
      if (!rolesContentH && triesLeft > 0) {
        requestAnimationFrame(() => runopenrolesAnimation(triesLeft - 1));
        return;
      }

      const targetH = Math.max(rolesContentH, 1);

      // Make sure values start from closed state (prevents half-open weirdness)
      rolesOpacity.setValue(0);
      rolesTranslateY.setValue(-6);
      rolesHeight.setValue(0);

      Animated.parallel([
        Animated.timing(rolesChevron, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rolesOpacity, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rolesTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(rolesHeight, {
          toValue: targetH,
          damping: 26,
          stiffness: 220,
          mass: 1,
          overshootClamping: true,
          useNativeDriver: false,
        }),
      ]).start(() => {
        rolesRef.current = false;
      });
    },
    [
      rolesChevron,
      rolesContentH,
      rolesHeight,
      rolesOpacity,
      rolesTranslateY,
    ],
  );

  const openroles = useCallback(() => {
    if (rolesOpen) return;
    if (rolesRef.current || closingrolesRef.current) return;

    rolesRef.current = true;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setrolesOpen(true);

    // Wait up to ~8 frames for the measurer to report a real height.
    requestAnimationFrame(() => runopenrolesAnimation(8));
  }, [rolesOpen, runopenrolesAnimation]);

  const closeroles = useCallback(() => {
    if (!rolesOpen) return;
    if (closingrolesRef.current || rolesRef.current) return;

    closingrolesRef.current = true;

    Animated.parallel([
      Animated.timing(rolesChevron, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rolesOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rolesTranslateY, {
        toValue: -6,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rolesHeight, {
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
      setrolesPage(0);
      setrolesOpen(false);
      closingrolesRef.current = false;
    });
  }, [
    rolesOpen,
    pageX,
    rolesChevron,
    rolesHeight,
    rolesOpacity,
    rolesTranslateY,
  ]);

  const toggleroless = useCallback(() => {
    if (!rolesOpen) return openroles();
    return closeroles();
  }, [rolesOpen, openroles, closeroles]);

  const togglerolesPage = useCallback(() => {
    if (!rolesOpen) return;
    if (closingrolesRef.current || rolesRef.current) return;

    const next: 0 | 1 = rolesPage === 0 ? 1 : 0;
    setrolesPage(next);

    Animated.spring(pageX, {
      toValue: next === 1 ? -1 : 0,
      damping: 26,
      stiffness: 240,
      mass: 1,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
  }, [pageX, rolesPage, rolesOpen]);

  const rolesSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (
            !rolesOpen ||
            closingrolesRef.current ||
            rolesRef.current
          )
            return false;
          const dx = Math.abs(gestureState.dx);
          const dy = Math.abs(gestureState.dy);
          return dx > 10 && dx > dy;
        },
        onPanResponderRelease: (_, gestureState) => {
          if (
            !rolesOpen ||
            closingrolesRef.current ||
            rolesRef.current
          )
            return;
          const { dx } = gestureState;
          if (dx < -35 && rolesPage === 0) {
            setrolesPage(1);
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
          if (dx > 35 && rolesPage === 1) {
            setrolesPage(0);
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
    [pageX, rolesOpen, rolesPage],
  );

  const rolesCol1: rolesRow[] = useMemo(() => {
    const roles = String(
      (profile as any).openRoles ??
        "",
    ).trim();

    return [
      { label: "Roles", value: roles },
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
  const contactUrl1Label =
    String((profile as any).contactUrl1Label ?? "URL 1").trim() || "URL 1";
  const contactUrl2Label =
    String((profile as any).contactUrl2Label ?? "URL 2").trim() || "URL 2";
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
    [pathname],
  );

  //START FUNCTION RETURN WHERE PAGE LAYOUT IS SET, this is where we add blocks
  return (
    <>
      <RequireUserType type="company" />

      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: BG }}
      >
        <Animated.ScrollView
          style={{ backgroundColor: BG }}
          contentContainerStyle={{ paddingBottom: 24 }}
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
          {/* Block A */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 22 }}
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
              style={{ alignSelf: "center", marginTop: 18 }}
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

            <Pressable
              onPress={() => {
                setShowCompanyNow((v) => !v);
              }}
              style={{ alignSelf: "center", marginTop: 12 }}
              hitSlop={10}
            >
              <Text style={s.displayName}>{displayName}</Text>
            </Pressable>

            {!!headlineText && <Text style={s.headline}>{headlineText}</Text>}


          </View>
          <View style={{ height: 1, backgroundColor: BORDER }} />
          {/* Block B for company mission */}
          <View style={{ backgroundColor: WHITE, padding: BLOCK_PAD }}>
            {!!missionText ? (
              <Text style={s.mission}>{missionText}</Text>
            ) : (
              <Text style={[s.mission, { opacity: 1 }]}>—</Text>
            )}
          </View>
          <View style={{ height: 1, backgroundColor: BORDER }} />
          {/* Block BA for company values - need to change variables */}
          <View style={{ backgroundColor: WHITE, padding: BLOCK_PAD }}>
            {!!missionText ? (
              <Text style={s.mission}>{missionText}</Text>
            ) : (
              <Text style={[s.mission, { opacity: 1 }]}>—</Text>
            )}
          </View>
          <View style={{ height: 1, backgroundColor: BORDER }} />
          {/* Block benefits */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <Pressable
              onPress={togglebenefits}
              hitSlop={10}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 2,
              }}
            >
              <Text style={s.benefitsHeader}>
                BENEFITS SUMMARY - management style, PTO
              </Text>
              <Animated.View style={{ transform: [{ rotate: benefitsChevronRotate }], marginRight: 6 }}>
                <Feather name="chevron-down" size={24} color={HINT} />
              </Animated.View>
            </Pressable>

            {/* Animated reveal container */}
            <Animated.View style={{ height: benefitsHeight, overflow: "hidden" }}>

              {/* Hidden measurer */}
              <View
                pointerEvents="none"
                style={{ opacity: 0, position: "absolute", left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && Math.abs(h - benefitsContentH) > 2)
                    setBenefitsContentH(h);
                }}
              >
                <View style={{ marginTop: 14 }}>
                  <View style={{ gap: 14 }}>
                    {benefitsCol1.map((row) => (
                      <View key={row.label} style={{ gap: 4, paddingRight: benefits_RIGHT_GUTTER }}>
                        <Text style={s.benefitsLabel}>{row.label}</Text>
                        <BenefitsValue value={row.value} textStyle={s.BenefitsValue} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Visible animated content */}
              {benefitsOpen ? (
                <Animated.View
                  style={{
                    opacity: benefitsOpacity,
                    transform: [{ translateY: benefitsTranslateY }],
                  }}
                >
                  <View style={{ marginTop: 14 }}>
                    <View style={{ gap: 14 }}>
                      {benefitsCol1.map((row) => (
                        <View key={row.label} style={{ gap: 4, paddingRight: benefits_RIGHT_GUTTER }}>
                          <Text style={s.benefitsLabel}>{row.label}</Text>
                          <BenefitsValue value={row.value} textStyle={s.BenefitsValue} />
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
              ) : null}

            </Animated.View>
          </View>
          {/*end benefits return block*/}

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block company location START */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <Pressable
              onPress={togglecompany}
              hitSlop={10}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 2,
              }}
            >
              <Text style={s.companyHeader}>COMPANY LOCATION</Text>

              <Animated.View
                style={{
                  transform: [{ rotate: companyChevronRotate }],
                  marginRight: 6,
                }}
              >
                <Feather name="chevron-down" size={24} color={HINT} />
              </Animated.View>
            </Pressable>

            {/* ✅ Premium animated reveal container */}
            <Animated.View
              style={{ height: companyHeight, overflow: "hidden" }}
            >
              {/* ✅ Hidden measurer */}
              <View
                pointerEvents="none"
                style={{ opacity: 0, position: "absolute", left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && Math.abs(h - companyContentH) > 2)
                    setCompanyContentH(h);
                }}
              >
                <View style={{ marginTop: 14 }}>
                  <View style={{ overflow: "hidden" }}>
                    <View style={{ width: panelW * 2, flexDirection: "row" }}>
                      <View style={{ width: panelW }}>
                        <View style={{ gap: 14 }}>
                          {companyCol1.map((row) => (
                            <View
                              key={row.label}
                              style={{ gap: 4, paddingRight: company_RIGHT_GUTTER }}
                            >
                              <Text style={s.companyLabel}>{row.label}</Text>
                              <BenefitsValue
                                value={row.value}
                                textStyle={s.CompanyValue}
                              />
                            </View>
                          ))}
                        </View>
                      </View>

                    </View>
                  </View>
                </View>
              </View>

              {/* Visible animated content */}
              {companyOpen ? (
                <Animated.View
                  style={{
                    opacity: companyOpacity,
                    transform: [{ translateY: companyTranslateY }],
                  }}
                >
                  <View style={{ marginTop: 14 }}>
                    <View style={{ gap: 14 }}>
                      {companyCol1.map((row) => (
                        <View key={row.label} style={{ gap: 4, paddingRight: company_RIGHT_GUTTER }}>
                          <Text style={s.companyLabel}>{row.label}</Text>
                          <BenefitsValue value={row.value} textStyle={s.CompanyValue} />
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>
                ) : null}
              </Animated.View>
          </View>
          {/* end block for company location */}

          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* Block employees start */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <Pressable
              onPress={toggleemployees}
              hitSlop={10}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 2,
              }}
            >
              <Text style={s.employeeHeader}>
                CURRENT EMPLOYEES
              </Text>

              <Animated.View
                style={{
                  transform: [{ rotate: employeeChevronRotate }],
                  marginRight: 6,
                }}
              >
                <Feather name="chevron-down" size={24} color={HINT} />
              </Animated.View>
            </Pressable>

            {/* ✅ Premium animated reveal container */}
            <Animated.View
              style={{ height: employeeHeight, overflow: "hidden" }}
            >
              {/* ✅ Hidden measurer */}
              <View
                pointerEvents="none"
                style={{ opacity: 0, position: "absolute", left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && Math.abs(h - employeeContentH) > 2)
                    setemployeeContentH(h);
                }}
              >
                <View style={{ marginTop: 14 }}>
                  <View style={{ overflow: "hidden" }}>
                    <View style={{ width: panelW * 2, flexDirection: "row" }}>
                      <View style={{ width: panelW }}>
                        <View style={{ gap: 14 }}>
                          {employeeCol1.map((row) => (
                            <View
                              key={row.label}
                              style={{ gap: 4, paddingRight: employee_RIGHT_GUTTER }}
                            >
                              <Text style={s.employeeLabel}>{row.label}</Text>
                              <EmployeeValue
                                value={row.value}
                                textStyle={s.EmployeeValue}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Visible animated content */}
              {employeeOpen ? (
                <Animated.View
                  style={{
                    opacity: employeeOpacity,
                    transform: [{ translateY: employeeTranslateY }],
                  }}
                >
                  <View style={{ marginTop: 14 }}>
                    <View
                      style={{ overflow: "hidden" }}
                      {...employeeSwipeResponder.panHandlers}
                    >
                      <Animated.View
                        style={{
                          width: panelW * 2,
                          flexDirection: "row",
                          transform: [{ translateX: pageTranslateX }],
                        }}
                      >
                        <View style={{ width: panelW }}>
                          <View style={{ gap: 14 }}>
                            {employeeCol1.map((row) => (
                              <View
                                key={row.label}
                                style={{ gap: 4, paddingRight: employee_RIGHT_GUTTER }}
                              >
                                <Text style={s.employeeLabel}>{row.label}</Text>
                                <EmployeeValue
                                  value={row.value}
                                  textStyle={s.EmployeeValue}
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      </Animated.View>

                      {/* Page toggle button */}
                      <Pressable
                        onPress={toggleemployeePage}
                        hitSlop={10}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: employee_PAGE_BUTTON_W,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      />
                    </View>

                    <View
                      style={{
                        marginTop: 14,
                        flexDirection: "row",
                        justifyContent: "center",
                      }}
                    >
                      {[0, 1].map((idx) => {
                        const active = employeePage === idx;
                        return (
                          <View
                            key={`benefits-dot-${idx}`}
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
          </View>{" "}
          {/*end employee return block*/}

          {/* Block D VIDEO BLOCK - i want this to be a grid like/scroll view look so right now i will hold this structure*/}
          <View
            style={{
              backgroundColor: WHITE,
              paddingVertical: BLOCK_PAD,
              paddingLeft: BLOCK_PAD,
            }}
          >
            <View style={{ paddingRight: BLOCK_PAD, paddingBottom: 16 }}>
              <Text style={s.benefitsHeader}>VIDEOS</Text>
            </View>

            <FlatList
              data={videos}
              keyExtractor={(item: any) =>
                String(item.id ?? `${item.slot ?? "x"}_${item.videoUri ?? ""}`)
              }
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP}
              decelerationRate="fast"
              disableIntervalMomentum
              contentContainerStyle={{ paddingRight: BLOCK_PAD }}
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
                      backgroundColor: WHITE,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: "100%",
                        height: Math.round(CARD_W * 0.78),
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

                    <View style={{ padding: 12 }}>
                      <Text style={s.videoCaption}>{caption}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
          <View style={{ height: 1, backgroundColor: BORDER }} />

          {/* =========== Block E - OPEN ROLES ============= */}
          {/* Block roles start */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <Pressable
              onPress={toggleroless}
              hitSlop={10}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 2,
              }}
            >
              <Text style={s.rolesHeader}>
                OPEN ROLES
              </Text>

              <Animated.View
                style={{
                  transform: [{ rotate: rolesChevronRotate }],
                  marginRight: 6,
                }}
              >
                <Feather name="chevron-down" size={24} color={HINT} />
              </Animated.View>
            </Pressable>

            {/* ✅ Premium animated reveal container */}
            <Animated.View
              style={{ height: rolesHeight, overflow: "hidden" }}
            >
              {/* ✅ Hidden measurer */}
              <View
                pointerEvents="none"
                style={{ opacity: 0, position: "absolute", left: 0, right: 0 }}
                onLayout={(e) => {
                  const h = e.nativeEvent.layout.height;
                  if (h > 0 && Math.abs(h - rolesContentH) > 2)
                    setrolesContentH(h);
                }}
              >
                <View style={{ marginTop: 14 }}>
                  <View style={{ overflow: "hidden" }}>
                    <View style={{ width: panelW * 2, flexDirection: "row" }}>
                      <View style={{ width: panelW }}>
                        <View style={{ gap: 14 }}>
                          {rolesCol1.map((row) => (
                            <View
                              key={row.label}
                              style={{ gap: 4, paddingRight: roles_RIGHT_GUTTER }}
                            >
                              <Text style={s.rolesLabel}>{row.label}</Text>
                              <RolesValue
                                value={row.value}
                                textStyle={s.RolesValue}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Visible animated content */}
              {rolesOpen ? (
                <Animated.View
                  style={{
                    opacity: rolesOpacity,
                    transform: [{ translateY: rolesTranslateY }],
                  }}
                >
                  <View style={{ marginTop: 14 }}>
                      <View style={{ gap: 14 }}>
                        {rolesCol1.map((row) => (
                          <View
                            key={row.label}
                            style={{ gap: 4, paddingRight: roles_RIGHT_GUTTER }}
                            >
                            <Text style={s.rolesLabel}>{row.label}</Text>
                            <RolesValue
                              value={row.value}
                              textStyle={s.RolesValue}
                              />
                            </View>
                            ))}
                          </View>
                        </View>
                      </Animated.View>  
                    ) : null }
            </Animated.View>
          </View>      
          {/*end roles return block*/}

          {/* =========== Block F - contact us ============= */}
          <View style={{ backgroundColor: BG, padding: BLOCK_PAD }}>
            <Text style={s.benefitsHeader}>CONTACT US</Text>

            <View style={{ marginTop: 14, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={s.contactLabel}>Email</Text>
                <Pressable
                  onPress={copyEmail}
                  disabled={!contactEmail}
                  hitSlop={8}
                >
                  <Text style={s.contactValue}>{contactEmail || "—"}</Text>
                </Pressable>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={s.contactLabel}>Phone</Text>
                <Pressable
                  onPress={copyPhone}
                  disabled={!contactPhone}
                  hitSlop={8}
                >
                  <Text style={s.contactValue}>{contactPhone || "—"}</Text>
                </Pressable>
              </View>

               <View style={{ gap: 4 }}>
                <Text style={s.contactLabel}>Website</Text>
                {/*<Pressable commenting this out bc we don't yet know if outside URL's are allowed to open from the app
                  onPress={copyPhone}
                  disabled={!contactPhone}
                  hitSlop={8}
                >
                  <Text style={s.contactValue}>{contactPhone || "—"}</Text>
                </Pressable>*/}
              </View>

              {showUrl1 ? (
                <View style={{ gap: 4 }}>
                  <Text style={s.contactLabel}>{contactUrl1Label}</Text>
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
                  <Text style={s.contactLabel}>{contactUrl2Label}</Text>
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
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </>
  );
}
