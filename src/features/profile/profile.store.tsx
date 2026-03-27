/**
 * Profile Store (Context + Provider)
 *
 * What this file does:
 * - Holds the app's "Profile" state in a React Context (useProfile()).
 * - Persists selected profile settings + video libraries + share links to AsyncStorage.
 * - Hydrates (loads) persisted state on app launch so the UI has immediate data.
 * - Refreshes the profile from your backend (GET /profile) with Bearer → raw-token fallback.
 * - Normalizes critical invariants so the UI never breaks:
 *   - Name display settings are always valid (at least one toggle enabled).
 *   - dateOfBirth is immutable once set.
 *   - videoLibrary / deletedVideoLibrary always exist (arrays).
 *   - higherEducation always exists (array), even for older cached profiles.
 *
 * Design notes:
 * - updateProfileState is the single "safe setter": it normalizes + persists deltas.
 * - refreshProfile maps backend payload shapes into the Profile shape used by screens.
 */
import { aws_config } from "@/constants/aws-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type {
  ContactDisplaySettings,
  HigherEdEntry,
  LibraryVideo,
  NameDisplaySettings,
  Profile,
  ValueSummaryItem,
} from "./profile.types";

/** ======================
 *  AsyncStorage keys
 *  ====================== */
const STORAGE_KEYS = {
  NAME_DISPLAY_SETTINGS: "@1dgr_nameDisplaySettings",
  CONTACT_DISPLAY_SETTINGS: "@1dgr_contactDisplaySettings",
  VIDEO_LIBRARY: "@1dgr_videoLibrary",
  DELETED_VIDEO_LIBRARY: "@1dgr_deletedVideoLibrary",
  SHARE_LINKS: "@1dgr_shareLinks",
};

/** ======================
 *  Name helpers
 *  ====================== */
function getLegalFullName(p: Pick<Profile, "legalFirstName" | "legalMiddleName" | "legalLastName">) {
  const first = (p.legalFirstName ?? "").trim();
  const middle = (p.legalMiddleName ?? "").trim();
  const last = (p.legalLastName ?? "").trim();
  return `${first}${middle ? ` ${middle}` : ""}${last ? ` ${last}` : ""}`.trim();
}

/**
 * Resolves the displayed name based on:
 * - preferredName / legal name parts
 * - nameDisplaySettings toggles + "firstWhenBothOn"
 */
function getDisplayName(
  p: Pick<Profile, "preferredName" | "legalFirstName" | "legalMiddleName" | "legalLastName" | "nameDisplaySettings">
) {
  const legal = getLegalFullName(p).trim();
  const preferred = (p.preferredName ?? "").trim();

  const { showPreferredName, showLegalName, firstWhenBothOn } = p.nameDisplaySettings;
 
  // Safety: never allow a state where both are "off"
  const safeShowPreferred = showPreferredName || !showLegalName;
  const safeShowLegal = showLegalName || !showPreferredName;
  
  // If both are enabled, pick the "first" preference, then fall back to the other.
  if (safeShowPreferred && safeShowLegal) {
    const first = firstWhenBothOn === "legal" ? legal : preferred;
    const second = firstWhenBothOn === "legal" ? preferred : legal;

    if (first.length > 0) return first;
    if (second.length > 0) return second;
    return "Your Name";
  }

  if (safeShowPreferred && preferred.length > 0) return preferred;
  if (safeShowLegal && legal.length > 0) return legal;

  return "Your Name";
}

/**
 * Ensures name toggles are always valid:
 * - If both toggles are off, default to preferred name ON.
 * - Ensures firstWhenBothOn always exists.
 */
function normalizeNameToggles(s: NameDisplaySettings): NameDisplaySettings {
  const firstWhenBothOn = s.firstWhenBothOn ?? "preferred";

  if (!s.showPreferredName && !s.showLegalName) {
    return { showPreferredName: true, showLegalName: false, firstWhenBothOn };
  }

  return { ...s, firstWhenBothOn };
}

function normalizeContactToggles(s?: ContactDisplaySettings): ContactDisplaySettings {
  return {
    showEmail: !!s?.showEmail,
    showPhoneNumber: !!s?.showPhoneNumber,
    showUrl1: !!s?.showUrl1,
    showUrl2: !!s?.showUrl2,
  };
}


/** ======================
 *  Immutable DOB helper
 *  ====================== */
/**
 * dateOfBirth can be set once, then becomes immutable.
 * - If prev had a DOB, keep it.
 * - Otherwise accept next's DOB.
 */
function lockDateOfBirth(prev: Profile, next: Profile): Profile {
  const prevDob = (prev.dateOfBirth ?? "").trim();
  const nextDob = (next.dateOfBirth ?? "").trim();

  if (prevDob.length > 0) return { ...next, dateOfBirth: prevDob };
  return { ...next, dateOfBirth: nextDob };
}


/** ======================
 *  URL/key helper
 *  ====================== */
/**
 * Derive an S3 key from a CloudFront/S3 URL (or passthrough if already a key).
 * Example: https://domain/path/to/file.mp4 -> path/to/file.mp4
 */
function extractS3KeyFromUrl(urlOrKey: string) {
  if (!urlOrKey) return "";
  if (!urlOrKey.includes("://")) return urlOrKey;

  try {
    const u = new URL(urlOrKey);
    return (u.pathname || "").replace(/^\/+/, "");
  } catch {
    return "";
  }
}


/** ======================
 *  Initial Profile
 *  ====================== */
/**
 * Base profile defaults:
 * - No demo placeholders (so refresh/persistence isn't "faked")
 * - media is the 5 profile slots (NOT the library)
 * - videoLibrary / deletedVideoLibrary are canonical lists
 */
const initialProfileBase = {
  bio: "",
  avatarImageUri: "",
  avatarVideoUri: "",
  // ✅ profile slots (NOT the library)
  media: Array.from({ length: 5 }).map((_, i) => ({
    id: String(i + 1),
    imageUri: "",
    videoUri: "",
    caption: "",
  })),

  // ✅ canonical library list (active)
  videoLibrary: [] as LibraryVideo[],

  // ✅ soft-deleted library list (recover screen)
  deletedVideoLibrary: [] as LibraryVideo[],

  // ✅ NEW: Higher Education
  higherEducation: [] as HigherEdEntry[],

  email: "",
  phoneNumber: "",
  contactUrl1: "",
  contactUrl2: "",

  linkedinUrl: "",
};

/** ======================
 *  AsyncStorage load/save
 *  ====================== */
async function loadPersistedSettings() {
  try {
    const [
      nameSerialized,
      contactSerialized,
      videoSerialized,
      deletedVideoSerialized,
      shareLinksSerialized,
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.NAME_DISPLAY_SETTINGS),
      AsyncStorage.getItem(STORAGE_KEYS.CONTACT_DISPLAY_SETTINGS),
      AsyncStorage.getItem(STORAGE_KEYS.VIDEO_LIBRARY),
      AsyncStorage.getItem(STORAGE_KEYS.DELETED_VIDEO_LIBRARY),
      AsyncStorage.getItem(STORAGE_KEYS.SHARE_LINKS),
    ]);

    const nameSettings = nameSerialized ? JSON.parse(nameSerialized) : null;
    const contactSettings = contactSerialized ? JSON.parse(contactSerialized) : null;
    const videoLibrary = videoSerialized ? JSON.parse(videoSerialized) : null;
    const deletedVideoLibrary = deletedVideoSerialized ? JSON.parse(deletedVideoSerialized) : null;
    const shareLinks = shareLinksSerialized ? JSON.parse(shareLinksSerialized) : null;

    return { nameSettings, contactSettings, videoLibrary, deletedVideoLibrary, shareLinks };
  } catch (error) {
    console.error("[loadPersistedSettings] Error:", error);
    return {
      nameSettings: null,
      contactSettings: null,
      videoLibrary: null,
      deletedVideoLibrary: null,
      shareLinks: null,
    };
  }
}

// ✅ Helper: Save settings to AsyncStorage
async function saveNameDisplaySettings(settings: NameDisplaySettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NAME_DISPLAY_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("[saveNameDisplaySettings] Error:", error);
  }
}

async function saveContactDisplaySettings(settings: ContactDisplaySettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CONTACT_DISPLAY_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("[saveContactDisplaySettings] Error:", error);
  }
}

async function saveVideoLibraries(videoLibrary: LibraryVideo[], deletedVideoLibrary: LibraryVideo[]) {
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.VIDEO_LIBRARY, JSON.stringify(videoLibrary)),
      AsyncStorage.setItem(STORAGE_KEYS.DELETED_VIDEO_LIBRARY, JSON.stringify(deletedVideoLibrary)),
    ]);
  } catch (error) {
    console.error("[saveVideoLibraries] Error:", error);
  }
}

async function saveShareLinks(shareLinks: any[] | undefined) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SHARE_LINKS, JSON.stringify(shareLinks || []));
  } catch (error) {
    console.error("[saveShareLinks] Error:", error);
  }
}

const initialProfile: Profile = {
  name: "Your Name",
  ...initialProfileBase,

  legalFirstName: "",
  legalLastName: "",
  legalMiddleName: "",
  preferredName: "Your Name",
  nameDisplaySettings: {
    showPreferredName: true,
    showLegalName: false,
    firstWhenBothOn: "preferred",
  },

  dateOfBirth: "",

  phoneNumber: "",
  email: "",
  contactUrl1: "",
  contactUrl2: "",
  contactUrl1Label: "URL 1",
  contactUrl2Label: "URL 2",
  linkedinUrl: "",

  residencyStatus: "",
  industryInterests: [],
  industryExperience: "",
  geographicLocation: "",
  highestEducationCompleted: "",

  // ✅ NEW
  higherEducation: [],

  additionalDetails: "",
  valuesSummary: [],

  contactDisplaySettings: {
    showEmail: false,
    showPhoneNumber: false,
    showUrl1: false,
    showUrl2: false,
  },

  shareLinks: [],
};

initialProfile.name = getDisplayName(initialProfile);


/** ======================
 *  Context types
 *  ====================== */
type ProfileContextValue = {
  profile: Profile;
  setProfile: (next: React.SetStateAction<Profile>) => void;
  refreshProfile: (token: string) => Promise<void>;
  isLoading: boolean;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

/** ======================
 *  Provider
 *  ====================== */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, _setProfile] = useState<Profile>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * Hydrate persisted settings once on mount:
   * - nameDisplaySettings
   * - contactDisplaySettings
   * - videoLibrary / deletedVideoLibrary
   * - shareLinks
   */
    useEffect(() => {
    const hydrate = async () => {
      const { nameSettings, contactSettings, videoLibrary, deletedVideoLibrary, shareLinks } =
        await loadPersistedSettings();

      _setProfile((prev) => {
        let updated = { ...prev };

        if (nameSettings) {
          updated = {
            ...updated,
            nameDisplaySettings: normalizeNameToggles(nameSettings),
          };
        }

        if (contactSettings) {
          updated = {
            ...updated,
            contactDisplaySettings: normalizeContactToggles(contactSettings),
          };
        }

        if (videoLibrary) {
          updated = {
            ...updated,
            videoLibrary,
          };
        }

        if (deletedVideoLibrary) {
          updated = {
            ...updated,
            deletedVideoLibrary,
          };
        }

        if (shareLinks) {
          updated = {
            ...updated,
            shareLinks,
          };
        }

        // Ensure higherEducation exists (backwards compatibility)
        if (!Array.isArray((updated as any).higherEducation)) {
          (updated as any).higherEducation = prev.higherEducation ?? [];
        }


        return { ...updated, name: getDisplayName(updated) };
      });

      setIsHydrated(true);
    };

    hydrate();
  }, []);

    /**
   * updateProfileState:
   * - Normalizes invariants (DOB lock, name toggles, arrays)
   * - Recomputes display name
   * - Persists deltas to AsyncStorage
   */
  const updateProfileState = (nextOrUpdater: React.SetStateAction<Profile>) => {
    _setProfile((prev) => {
      const next =
        typeof nextOrUpdater === "function"
          ? (nextOrUpdater as (p: Profile) => Profile)(prev)
          : nextOrUpdater;

      const dobLocked = lockDateOfBirth(prev, next);
      const normalizedToggles = normalizeNameToggles(dobLocked.nameDisplaySettings);

      const fixed: Profile = {
        ...dobLocked,
        nameDisplaySettings: normalizedToggles,
        contactDisplaySettings: normalizeContactToggles(dobLocked.contactDisplaySettings ?? prev.contactDisplaySettings),
        shareLinks: dobLocked.shareLinks ?? prev.shareLinks ?? [],

        // ✅ ensure both libraries always exist
        videoLibrary: dobLocked.videoLibrary ?? prev.videoLibrary ?? [],
        deletedVideoLibrary: dobLocked.deletedVideoLibrary ?? prev.deletedVideoLibrary ?? [],

        // ✅ ensure higherEducation always exists (so it never gets dropped)
        higherEducation:
          (dobLocked as any).higherEducation ?? (prev as any).higherEducation ?? [],
      };

      const finalProfile = { ...fixed, name: getDisplayName(fixed) };

      // Persist when changed (kept lightweight by comparing JSON)
      if (JSON.stringify(prev.nameDisplaySettings) !== JSON.stringify(finalProfile.nameDisplaySettings)) {
        saveNameDisplaySettings(finalProfile.nameDisplaySettings);
      }

      if (
        JSON.stringify(prev.contactDisplaySettings) !==
        JSON.stringify(finalProfile.contactDisplaySettings)
      ) {
        saveContactDisplaySettings(finalProfile.contactDisplaySettings);
      }

      // ✅ Persist video libraries whenever they change
      if (
        JSON.stringify(prev.videoLibrary) !== JSON.stringify(finalProfile.videoLibrary) ||
        JSON.stringify(prev.deletedVideoLibrary) !== JSON.stringify(finalProfile.deletedVideoLibrary)
      ) {
        saveVideoLibraries(finalProfile.videoLibrary, finalProfile.deletedVideoLibrary);
      }

      if (JSON.stringify(prev.shareLinks) !== JSON.stringify(finalProfile.shareLinks)) {
        saveShareLinks(finalProfile.shareLinks);
      }

      return finalProfile;
    });
  };
  


  /**
   * refreshProfile:
   * - GET /profile with Bearer → raw token fallback
   * - Maps backend payload into Profile shape:
   *   - videoLibrary / deletedVideoLibrary
   *   - avatar urls/keys
   *   - higher education
   *   - share links
   * - Merges backend libraries with local-only items (so locally-created items aren't lost)
   */
    const refreshProfile = async (token: string) => {
    if (!token) {
      console.log("[refreshProfile] token is missing");
      return;
    }

    setIsLoading(true);

    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/profile`;
    console.log("[refreshProfile] Fetching profile from:", url);

    try {
      const doFetch = async (authHeader: string) => {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
        });
        const text = await res.text().catch(() => "");
        return { res, text };
      };

      // Try Bearer first
      let { res, text } = await doFetch(`Bearer ${token}`);

      // ✅ If 401, try raw token
      if (res.status === 401) {
        console.log("[refreshProfile] 401 with Bearer, retrying raw token...");
        ({ res, text } = await doFetch(token));
      }

      console.log("[refreshProfile] Response status:", res.status);

      if (!res.ok) {
        console.error("[refreshProfile] Fetch failed:", res.status, text);
        return;
      }

      const data = text ? JSON.parse(text) : {};
      console.log("[refreshProfile] RAW SERVER DATA:", JSON.stringify(data, null, 2));

      // API returns { user, videos }
      const userData = data.user ?? data.users?.[0] ?? data;
      //const serverVideos = Array.isArray(data.videos) ? data.videos : [];
      const serverVideos = Array.isArray(data.videoLibrary) ? data.videoLibrary : [];
      const serverDeletedVideos = Array.isArray(data.deletedVideoLibrary) ? data.deletedVideoLibrary : [];
      console.log("[refreshProfile] Active videos count:", serverVideos.length);
      console.log("[refreshProfile] Deleted videos count:", serverDeletedVideos.length);
      // ✅ Avatar: use url if present, else key if present, else empty
      const serverAvatarVideo =
        (typeof userData.avatar_video_url === "string" && userData.avatar_video_url.trim()) ||
        (typeof userData.avatar_video_key === "string" && userData.avatar_video_key.trim()) ||
        "";

      const serverAvatarImage =
        (typeof userData.avatar_image_url === "string" && userData.avatar_image_url.trim()) ||
        (typeof userData.avatar_image_key === "string" && userData.avatar_image_key.trim()) ||
        "";


      const mappedLibrary: LibraryVideo[] = serverVideos
        .map((v: any) => {
          const url = (v.url ?? "").trim();
          const thumb = (v.thumbnailUrl ?? "").trim();
          const caption = (v.caption ?? v.title ?? "").trim();

          const derivedKey = extractS3KeyFromUrl(url);
          const s3KeyFromServer = (v.s3_key ?? v.s3Key ?? "").trim();

          return {
            id: v.id ? String(v.id) : derivedKey || url,
            url,
            s3Key: s3KeyFromServer || derivedKey,
            slot: typeof v.slot === "number" ? v.slot : null,
            thumbnailUrl: thumb,
            caption,
            source: (v.source ?? "camera-roll") as "recording-studio" | "camera-roll",
            createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.now(),
          };
        })
        .filter((x: LibraryVideo) => !!x.url);

      const mappedDeletedLibrary: LibraryVideo[] = serverDeletedVideos
        .map((v: any) => {
          const url = (v.url ?? "").trim();
          const thumb = (v.thumbnailUrl ?? "").trim();
          const caption = (v.caption ?? v.title ?? "").trim();

          const derivedKey = extractS3KeyFromUrl(url);
          const s3KeyFromServer = (v.s3_key ?? v.s3Key ?? "").trim();

          return {
            id: v.id ? String(v.id) : derivedKey || url,
            url,
            s3Key: s3KeyFromServer || derivedKey,
            thumbnailUrl: thumb,
            caption,
            source: (v.source ?? "camera-roll") as "recording-studio" | "camera-roll",
            createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.now(),
          };
        })
        .filter((x: LibraryVideo) => !!x.url);

      console.log("[refreshProfile] Mapped active library:", mappedLibrary.length);
      console.log("[refreshProfile] Mapped deleted library:", mappedDeletedLibrary.length);

      // Profile slots: hydrate from explicit backend slot assignment (1..5)
      const bySlot = new Map<number, LibraryVideo>();
      for (const v of mappedLibrary) {
        const slot = Number((v as any).slot);
        if (Number.isInteger(slot) && slot >= 1 && slot <= 5 && !bySlot.has(slot)) {
          bySlot.set(slot, v);
        }
      }

      const finalMedia = Array.from({ length: 5 }, (_, i) => {
        const slot = i + 1;
        const v = bySlot.get(slot);
        return {
          id: String(slot),
          imageUri: v ? (v.thumbnailUrl ?? "").trim() : "",
          videoUri: v ? (v.url ?? "").trim() : "",
          caption: v ? (v.caption ?? "").trim() : "",
        };
      });

      const mappedHigherEducation: any[] = Array.isArray(data.higher_education)
        ? data.higher_education.map((edu: any) => ({
            unitid: String(edu.unitid ?? "").trim(),
            label: String(edu.label ?? "").trim(),
            degrees: Array.isArray(edu.degrees)
              ? edu.degrees.map((d: any) => String(d).trim()).filter(Boolean)
              : [],
            degreeDetails: Array.isArray(edu?.degreeDetails)
              ? edu.degreeDetails
              : Array.isArray(edu?.degree_details)
                ? edu.degree_details
                : [],
            estimatedGraduation: String(edu?.estimatedGraduation ?? edu?.estimated_graduation ?? "").trim(),
          }))
        : [];



      const mappedProfile: Partial<Profile> = {
        legalFirstName: userData.legal_first_name || "",
        legalLastName: userData.legal_last_name || "",
        preferredName: userData.preferred_name || userData.email || "User",
        bio: userData.bio || "",
        contactUrl1: userData.contact_url_1 || userData.contactUrl1 || userData.website_url_1 || "",
        contactUrl2: userData.contact_url_2 || userData.contactUrl2 || userData.website_url_2 || "",
        contactUrl1Label: userData.contact_url_1_label || userData.contactUrl1Label || "URL 1",
        contactUrl2Label: userData.contact_url_2_label || userData.contactUrl2Label || "URL 2",

        workType: userData.work_type || userData.workType || userData.employment_type || "",
        workPreference:
          userData.work_preference || userData.workPreference || userData.work_location_preference || "",
        residencyStatus: userData.residency || "",
        industryExperience: userData.experience || "",
        geographicLocation: userData.location || "",
        industryInterests: userData.industry_interests || [],
        additionalDetails: userData.bio_facts || "",
        valuesSummary: Array.isArray(userData.values_summary)
          ? userData.values_summary
              .map((item: any, idx: number): ValueSummaryItem | null => {
                const label = String(item?.label ?? "").trim();
                const value = String(item?.value ?? "").trim();
                if (!label && !value) return null;
                return {
                  key: String(item?.key ?? `value_${idx + 1}`).trim() || `value_${idx + 1}`,
                  label,
                  value: value || label,
                };
              })
              .filter((item: ValueSummaryItem | null): item is ValueSummaryItem => !!item)
          : [],
        highestEducationCompleted: userData.highest_education || "",
        higherEducation: mappedHigherEducation,


        media: finalMedia,

        // ✅ Active + Deleted libraries
        videoLibrary: mappedLibrary,
        deletedVideoLibrary: mappedDeletedLibrary,

        shareLinks: data.shareLinks || [],
      };

      console.log("MAPPED HIGHER EDUCATION:", mappedHigherEducation);

      updateProfileState((prev) => {
        // ✅ Merge backend libraries with local libraries (prefer local for videos created locally)
        const backendIds = new Set([
          ...mappedLibrary.map((v) => v.id),
          ...mappedDeletedLibrary.map((v) => v.id),
        ]);

        const localOnlyActive = prev.videoLibrary.filter((v) => !backendIds.has(v.id));
        const localOnlyDeleted = prev.deletedVideoLibrary.filter((v) => !backendIds.has(v.id));

        const mergedLibrary = [...mappedLibrary, ...localOnlyActive];
        const mergedDeletedLibrary = [...mappedDeletedLibrary, ...localOnlyDeleted];

        const prevHigherEdByUnit = new Map<string, any>(
          (Array.isArray(prev?.higherEducation) ? prev.higherEducation : []).map((e: any) => [String(e?.unitid ?? ""), e])
        );
        const mergedHigherEducation = mappedHigherEducation.map((e: any) => {
          const prevE = prevHigherEdByUnit.get(String(e?.unitid ?? ""));
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
          ...mappedProfile,

          // ✅ Use merged libraries
          videoLibrary: mergedLibrary,
          deletedVideoLibrary: mergedDeletedLibrary,

          // ✅ Avatar slot 0: ONLY overwrite if backend provided real value
          avatarVideoUri: serverAvatarVideo ? serverAvatarVideo : prev.avatarVideoUri,
          avatarImageUri: serverAvatarImage ? serverAvatarImage : prev.avatarImageUri,

          shareLinks: mappedProfile.shareLinks || prev.shareLinks,

          higherEducation: mergedHigherEducation,
        };
      });
    } catch (error) {
      console.error("[refreshProfile] Network/Logic error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  


  const value = { profile, setProfile: updateProfileState, refreshProfile, isLoading };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
