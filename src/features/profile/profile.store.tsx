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
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ContactDisplaySettings,
  LibraryVideo,
  NameDisplaySettings,
  Profile,
} from "./profile.types";

/** ======================
 *  AsyncStorage keys - THESE WILL HAVE TO CHANGE FOR COMPANY THINGS
 *  ====================== */
const STORAGE_KEYS = {
  NAME_DISPLAY_SETTINGS: "@1dgr_nameDisplaySettings",
  CONTACT_DISPLAY_SETTINGS: "@1dgr_contactDisplaySettings",
  VIDEO_LIBRARY: "@1dgr_videoLibrary",
  DELETED_VIDEO_LIBRARY: "@1dgr_deletedVideoLibrary",
};

function normalizeNameToggles(s?: NameDisplaySettings): NameDisplaySettings {
  return {
    showCompanyName: s?.showCompanyName ?? true,
  };
}

function normalizeContactToggles(
  s?: ContactDisplaySettings,
): ContactDisplaySettings {
  return {
    showEmail: !!s?.showEmail,
    showPhoneNumber: !!s?.showPhoneNumber,
    showUrl1: !!s?.showUrl1,
    showUrl2: !!s?.showUrl2,
  };
}

/** ======================
 *  Immutable DOB helper - maybe lets change this to business age helper
 *  ====================== */

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
  companyName: "",
  missionStatement: "",
  companyCulture: "",
  headquarters: "",
  coreValues: [],
  locations: [],
  currentEmployees: [],
  industry: "",
  benefitsSummary: "",
  openRoles: [],
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

  contactUrl1: "",
  contactUrl2: "",

  customBackgroundColor: "",
  companyEmail: "",
  companyPhone: "",
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
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.NAME_DISPLAY_SETTINGS),
      AsyncStorage.getItem(STORAGE_KEYS.CONTACT_DISPLAY_SETTINGS),
      AsyncStorage.getItem(STORAGE_KEYS.VIDEO_LIBRARY),
      AsyncStorage.getItem(STORAGE_KEYS.DELETED_VIDEO_LIBRARY),
    ]);

    const nameSettings = nameSerialized ? JSON.parse(nameSerialized) : null;
    const contactSettings = contactSerialized
      ? JSON.parse(contactSerialized)
      : null;
    const videoLibrary = videoSerialized ? JSON.parse(videoSerialized) : null;
    const deletedVideoLibrary = deletedVideoSerialized
      ? JSON.parse(deletedVideoSerialized)
      : null;

    return {
      nameSettings,
      contactSettings,
      videoLibrary,
      deletedVideoLibrary,
    };
  } catch (error) {
    console.error("[loadPersistedSettings] Error:", error);
    return {
      nameSettings: null,
      contactSettings: null,
      videoLibrary: null,
      deletedVideoLibrary: null,
    };
  }
}

function getDisplayName(
  p: Pick<Profile, "companyName" | "nameDisplaySettings">
) {
  return p.companyName ?? "";
}

// Helper: Save settings to AsyncStorage
async function saveNameDisplaySettings(settings: NameDisplaySettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NAME_DISPLAY_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("[saveNameDisplaySettings] Error:", error);
  }
}

async function saveContactDisplaySettings(settings: ContactDisplaySettings) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.CONTACT_DISPLAY_SETTINGS,
      JSON.stringify(settings),
    );
  } catch (error) {
    console.error("[saveContactDisplaySettings] Error:", error);
  }
}

async function saveVideoLibraries(
  videoLibrary: LibraryVideo[],
  deletedVideoLibrary: LibraryVideo[],
) {
  try {
    await Promise.all([
      AsyncStorage.setItem(
        STORAGE_KEYS.VIDEO_LIBRARY,
        JSON.stringify(videoLibrary),
      ),
      AsyncStorage.setItem(
        STORAGE_KEYS.DELETED_VIDEO_LIBRARY,
        JSON.stringify(deletedVideoLibrary),
      ),
    ]);
  } catch (error) {
    console.error("[saveVideoLibraries] Error:", error);
  }
}

const initialProfile: Profile = {
  ...initialProfileBase,

  nameDisplaySettings: {
    showCompanyName: true,
  },

  companyPhone: "",
  companyEmail: "",
  headquarters: "",
  contactUrl1: "",
  contactUrl2: "",
  contactUrl1Label: "URL 1",
  contactUrl2Label: "URL 2",

  industry: "",
  businessAge: "",
  locations: [],

  missionStatement: "",
  coreValues: [],
  currentEmployees: [],
  openRoles: [],

  contactDisplaySettings: {
    showEmail: false,
    showPhoneNumber: false,
    showUrl1: false,
    showUrl2: false,
  },
};

//putting this in the form on the display that we want it in
initialProfile.companyName = getDisplayName(initialProfile);

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
   */
  useEffect(() => {
    const hydrate = async () => {
      const {
        nameSettings,
        contactSettings,
        videoLibrary,
        deletedVideoLibrary,
      } = await loadPersistedSettings();

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

        return { ...updated, name: getDisplayName(updated) };
      });

      setIsHydrated(true);
    };

    hydrate();
  }, []);

   /**
 * updateProfileState:
 * - Normalizes invariants (name toggles, arrays)
 * - Recomputes display name
 * - Persists deltas to AsyncStorage
 */
const updateProfileState = (nextOrUpdater: React.SetStateAction<Profile>) => {
  _setProfile((prev) => {
    const next =
      typeof nextOrUpdater === "function"
        ? (nextOrUpdater as (p: Profile) => Profile)(prev)
        : nextOrUpdater;

    const fixed: Profile = {
      ...next,
      nameDisplaySettings: normalizeNameToggles(next.nameDisplaySettings),
      contactDisplaySettings: normalizeContactToggles(
        next.contactDisplaySettings ?? prev.contactDisplaySettings,
      ),
      videoLibrary: next.videoLibrary ?? prev.videoLibrary ?? [],
      deletedVideoLibrary: next.deletedVideoLibrary ?? prev.deletedVideoLibrary ?? [],
      coreValues: next.coreValues ?? prev.coreValues ?? [],
      locations: next.locations ?? prev.locations ?? [],
    };

    const finalProfile = { ...fixed, companyName: getDisplayName(fixed) };

    if (JSON.stringify(prev.nameDisplaySettings) !== JSON.stringify(finalProfile.nameDisplaySettings)) {
      saveNameDisplaySettings(finalProfile.nameDisplaySettings);
    }
    if (JSON.stringify(prev.contactDisplaySettings) !== JSON.stringify(finalProfile.contactDisplaySettings)) {
      saveContactDisplaySettings(finalProfile.contactDisplaySettings);
    }
    if (
      JSON.stringify(prev.videoLibrary) !== JSON.stringify(finalProfile.videoLibrary) ||
      JSON.stringify(prev.deletedVideoLibrary) !== JSON.stringify(finalProfile.deletedVideoLibrary)
    ) {
      saveVideoLibraries(finalProfile.videoLibrary, finalProfile.deletedVideoLibrary);
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
   * - Merges backend libraries with local-only items (so locally-created items aren't lost)
   */
  const refreshProfile = useCallback(async (token: string) => {
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
      console.log(
        "[refreshProfile] RAW SERVER DATA:",
        JSON.stringify(data, null, 2),
      );

      // API returns { user, videos }
      const userData = data.user ?? data.users?.[0] ?? data;
      //const serverVideos = Array.isArray(data.videos) ? data.videos : [];
      const serverVideos = Array.isArray(data.videoLibrary)
        ? data.videoLibrary
        : [];
      const serverDeletedVideos = Array.isArray(data.deletedVideoLibrary)
        ? data.deletedVideoLibrary
        : [];
      console.log("[refreshProfile] Active videos count:", serverVideos.length);
      console.log(
        "[refreshProfile] Deleted videos count:",
        serverDeletedVideos.length,
      );
      // ✅ Avatar: use url if present, else key if present, else empty
      const serverAvatarVideo =
        (typeof userData.avatar_video_url === "string" &&
          userData.avatar_video_url.trim()) ||
        (typeof userData.avatar_video_key === "string" &&
          userData.avatar_video_key.trim()) ||
        "";

      const serverAvatarImage =
        (typeof userData.avatar_image_url === "string" &&
          userData.avatar_image_url.trim()) ||
        (typeof userData.avatar_image_key === "string" &&
          userData.avatar_image_key.trim()) ||
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
            source: (v.source ?? "camera-roll") as
              | "recording-studio"
              | "camera-roll",
            createdAt:
              typeof v.createdAt === "number" ? v.createdAt : Date.now(),
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
            source: (v.source ?? "camera-roll") as
              | "recording-studio"
              | "camera-roll",
            createdAt:
              typeof v.createdAt === "number" ? v.createdAt : Date.now(),
          };
        })
        .filter((x: LibraryVideo) => !!x.url);

      console.log(
        "[refreshProfile] Mapped active library:",
        mappedLibrary.length,
      );
      console.log(
        "[refreshProfile] Mapped deleted library:",
        mappedDeletedLibrary.length,
      );

      // Profile slots: hydrate from explicit backend slot assignment (1..5)
      const bySlot = new Map<number, LibraryVideo>();
      for (const v of mappedLibrary) {
        const slot = Number((v as any).slot);
        if (
          Number.isInteger(slot) &&
          slot >= 1 &&
          slot <= 5 &&
          !bySlot.has(slot)
        ) {
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
      //updated to match all profile variables so they persist when company user logs in
      //unsure if contact display settings need to persist - loads from async
      const mappedProfile: Partial<Profile> = {
        companyName: userData.company_name || "",
        companyEmail: userData.company_email || "",
        companyPhone: userData.company_phone || "",
        headquarters: userData.headquarters || "",
        industry: Array.isArray(userData.industry) ? (userData.industry[0] ?? "") : (userData.industry || ""),
        businessAge: userData.business_age || "",
        workType: userData.work_type || "",
        locations: Array.isArray(userData.locations) ? userData.locations : [],
        missionStatement: userData.mission_statement || "",
        companyCulture: userData.companyCulture || "",
        coreValues: Array.isArray(userData.core_values) ? userData.core_values : [],
        openRoles: Array.isArray(userData.open_roles) ? userData.open_roles: [],
        currentEmployees: Array.isArray(userData.current_employees) ? userData.current_employees: [],
        benefitsSummary: userData.benefits_summary || "",
        customBackgroundColor: userData.custom_background_color || "",
        contactUrl1: userData.contact_url_1 || "",
        contactUrl2: userData.contact_url_2 || "",
        contactUrl1Label: userData.contact_url_1_label || "URL 1",
        contactUrl2Label: userData.contact_url_2_label || "URL 2",
        media: finalMedia,
        videoLibrary: mappedLibrary,
        deletedVideoLibrary: mappedDeletedLibrary,
      };

      updateProfileState((prev) => {
        // ✅ Merge backend libraries with local libraries (prefer local for videos created locally)
        const backendIds = new Set([
          ...mappedLibrary.map((v) => v.id),
          ...mappedDeletedLibrary.map((v) => v.id),
        ]);

        const localOnlyActive = prev.videoLibrary.filter(
          (v) => !backendIds.has(v.id),
        );
        const localOnlyDeleted = prev.deletedVideoLibrary.filter(
          (v) => !backendIds.has(v.id),
        );

        const mergedLibrary = [...mappedLibrary, ...localOnlyActive];
        const mergedDeletedLibrary = [
          ...mappedDeletedLibrary,
          ...localOnlyDeleted,
        ];

        return {
          ...prev,
          ...mappedProfile,
          videoLibrary: mergedLibrary,
          deletedVideoLibrary: mergedDeletedLibrary,
          avatarVideoUri: serverAvatarVideo ? serverAvatarVideo : prev.avatarVideoUri,
          avatarImageUri: serverAvatarImage ? serverAvatarImage : prev.avatarImageUri,
        };
      });
    } catch (error) {
      console.error("[refreshProfile] Network/Logic error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setProfile: updateProfileState,
      refreshProfile,
      isLoading,
    }),
    [profile, isLoading],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
