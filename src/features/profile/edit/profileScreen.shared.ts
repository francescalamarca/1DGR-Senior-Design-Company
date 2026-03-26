import { aws_config } from "@/constants/aws-config";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, usePathname } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

export const HIGHER_ED_ITEM_GAP = 10;

export type QualRowValue = string | string[];
export type QualRow = { label: string; value: QualRowValue };

export function parseMultiSelectString(input: any): string[] {
  const raw = String(input ?? "").trim();
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function formatWorkTypeDisplayParts(rawType: any, rawPreference: any) {
  const workTypes = parseMultiSelectString(rawType);
  const workPreferences = parseMultiSelectString(rawPreference);
  const hasAllTypes = workTypes.some((item) => /^all$/i.test(item));
  const hasCombinedPreference = workPreferences.some(
    (item) => /^both$/i.test(item) || /^remote and willing to relocate$/i.test(item)
  );

  const normalizedTypes = hasAllTypes ? ["Part-Time", "Full Time", "Contract"] : workTypes;
  const typeText = normalizedTypes.join(" · ");

  const normalizedPreferences = hasCombinedPreference
    ? ["Remote and Willing to Relocate"]
    : workPreferences;
  const preferenceText = normalizedPreferences.join(" · ");

  const parts = [typeText, preferenceText].filter(Boolean);
  if (!parts.length) return [];

  const combined = parts.join(" · ").trim();
  return [/work$/i.test(combined) ? combined : `${combined} Work`];
}

export function toCloudFrontUrl(urlOrKey: string): string {
  if (!urlOrKey) return "";
  if (urlOrKey.includes("://")) return urlOrKey;

  const domain =
    (aws_config as any).cloudFrontDomain ||
    (aws_config as any).cloudfrontDomain ||
    (aws_config as any).cdnBaseUrl;

  if (domain) return `https://${domain}/${urlOrKey}`;
  return urlOrKey;
}

export function normalizeFieldOfStudy(e: any): string {
  return String(e?.fieldOfStudy ?? e?.field_of_study ?? e?.field_of_study_name ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function degreesAsLines(e: any): string[] {
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

export function dashIfEmpty(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

export function joinOrDash(arr: any[]) {
  const a = Array.isArray(arr) ? arr.filter(Boolean).map((x) => String(x).trim()).filter(Boolean) : [];
  return a.length ? a.join(", ") : "—";
}

export function softWrapLongTokens(s: string) {
  return String(s ?? "")
    .replace(/([/_\-\.])/g, "$1\u200B")
    .replace(/([a-z])([A-Z])/g, "$1\u200B$2");
}

export function formatHigherEdLocationLine(e: any): string {
  const city = String(e?.city ?? e?.schoolCity ?? e?.school_city ?? "").trim();
  const state = String(e?.state ?? e?.region ?? e?.schoolState ?? e?.school_state ?? "").trim();
  const country = String(e?.country ?? e?.nation ?? e?.schoolCountry ?? e?.school_country ?? "").trim();

  const directLocation = String(e?.location ?? e?.schoolLocation ?? e?.school_location ?? "").trim();

  const parts = [city, state, country].filter(Boolean);
  if (parts.length) return parts.join(", ");

  if (directLocation) return directLocation;

  return "";
}

export function splitSchoolAndLocationFromLabel(label: string): { school: string; location: string } {
  const raw = String(label ?? "").trim();
  if (!raw) return { school: "", location: "" };
  const idx = raw.indexOf(",");
  if (idx === -1) return { school: raw, location: "" };
  return {
    school: raw.slice(0, idx).trim(),
    location: raw.slice(idx + 1).trim(),
  };
}

export function formatHigherEdMultiline(e: any): string {
  const rawLabel = String(e?.label ?? e?.schoolName ?? e?.school_name ?? "").trim();
  const { school: schoolFromLabel, location: locationFromLabel } = splitSchoolAndLocationFromLabel(rawLabel);

  const structuredLocation = formatHigherEdLocationLine(e);

  const finalSchool = String(schoolFromLabel || rawLabel).trim();
  const finalLocation = String(structuredLocation || locationFromLabel).trim();

  const estimated = String(
    e?.estimatedGraduation ?? e?.estimated_graduation ?? e?.gradYear ?? e?.graduation ?? ""
  ).trim();

  const lines: string[] = [];

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

export function useProfileScreenData() {
  const { accessToken } = useSession();
  const { profile, setProfile } = useProfile();
  const pathname = usePathname();

  const [refreshing, setRefreshing] = useState(false);
  const [showLegalNow, setShowLegalNow] = useState(false);
  const fetchingRef = useRef(false);
  const didFetchOnceRef = useRef(false);

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

  const liveProfileUrl = useMemo(() => {
    const base =
      (aws_config as any).liveProfileBaseUrl ||
      (aws_config as any).webBaseUrl ||
      (aws_config as any).publicBaseUrl ||
      (aws_config as any).apiBaseUrl;

    const handle = (profile as any).liveHandle || (profile as any).handle || (profile as any).username || "me";

    return `${String(base).replace(/\/$/, "")}/u/${encodeURIComponent(String(handle))}`;
  }, [profile]);

  const copyLiveAsUrl = useCallback(async () => {
    await Clipboard.setStringAsync(liveProfileUrl);
    Alert.alert("Copied", "Live profile URL copied to clipboard.");
  }, [liveProfileUrl]);

  const contactEmail = String(profile.email ?? "").trim();
  const contactPhone = String(profile.phoneNumber ?? "").trim();
  const contactUrl1 = String((profile as any).contactUrl1 ?? "").trim();
  const contactUrl2 = String((profile as any).contactUrl2 ?? "").trim();
  const contactUrl1Label = String((profile as any).contactUrl1Label ?? "URL 1").trim() || "URL 1";
  const contactUrl2Label = String((profile as any).contactUrl2Label ?? "URL 2").trim() || "URL 2";
  const showUrl1 = !!(profile as any)?.contactDisplaySettings?.showUrl1;
  const showUrl2 = !!(profile as any)?.contactDisplaySettings?.showUrl2;

  const copyEmail = useCallback(async () => {
    if (!contactEmail) return;
    await Clipboard.setStringAsync(contactEmail);
    Alert.alert("Copied", "Email copied to clipboard.");
  }, [contactEmail]);

  const copyPhone = useCallback(async () => {
    if (!contactPhone) return;
    await Clipboard.setStringAsync(contactPhone);
    Alert.alert("Copied", "Phone number copied to clipboard.");
  }, [contactPhone]);

  const copyUrl = useCallback(async (url: string) => {
    if (!url) return;
    await Clipboard.setStringAsync(url);
    Alert.alert("Copied", "URL copied to clipboard.");
  }, []);

  useEffect(() => {
    const fixMissingThumbs = async () => {
      if (!profile.media || profile.media.length === 0) return;

      const updates = await Promise.all(
        profile.media.map(async (m: any) => {
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

      const hasChanges = updates.some((u, i) => u.imageUri !== profile.media[i].imageUri);
      if (hasChanges) setProfile((prev: any) => ({ ...prev, media: updates }));
    };

    fixMissingThumbs();
  }, [profile.media, setProfile]);

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
  }, [accessToken, setProfile]);

  useFocusEffect(
    useCallback(() => {
      if (didFetchOnceRef.current) return;
      didFetchOnceRef.current = true;
      fetchLatestProfile();
    }, [fetchLatestProfile])
  );

  const hookText = (profile.bio ?? "").trim();
  const headlineText =
    String((profile as any).headline ?? (profile as any).title ?? (profile as any).tagline ?? "").trim() || "";

  const valuesItems = useMemo(() => {
    const dynamic = (profile as any).valuesSummary;
    if (!Array.isArray(dynamic) || dynamic.length === 0) return [];
    return dynamic.map((it: any, idx: number) => ({
      key: String(it?.key ?? it?.label ?? idx),
      label: String(it?.label ?? "").trim(),
      value: dashIfEmpty(it?.value),
    }));
  }, [profile]);

  const higherEd = Array.isArray((profile as any).higherEducation) ? ((profile as any).higherEducation as any[]) : [];

  const workTypeDisplay = useMemo(() => {
    const combined = formatWorkTypeDisplayParts(
      (profile as any).workType ?? (profile as any).work_type ?? (profile as any).employmentType ?? "",
      (profile as any).workPreference ?? (profile as any).work_preference ?? (profile as any).work_location_preference ?? ""
    ).join(" · ");
    if (!combined) return "—";
    return `Seeking ${combined}`;
  }, [profile]);

  const qualCol1: QualRow[] = useMemo(() => {
    const location = dashIfEmpty(profile.geographicLocation);

    const higherEdItems =
      higherEd.length > 0
        ? higherEd
            .map((e: any) => formatHigherEdMultiline(e))
            .filter((s: string) => String(s ?? "").trim() && String(s ?? "").trim() !== "—")
        : [];

    return [
      { label: "Location", value: location },
      { label: "Education", value: higherEdItems.length ? higherEdItems : "—" },
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

  const videos = useMemo(() => {
    const list = Array.isArray(profile.media) ? profile.media : [];
    return list.filter((m: any) => m?.videoUri?.trim());
  }, [profile.media]);

  const openVideo = useCallback(
    (uri: string) => {
      router.push({
        pathname: "/(homeUser)/video",
        params: {
          uri,
          returnTo: pathname,
          playId: String(Date.now()),
        },
      });
    },
    [pathname]
  );

  return {
    profile,
    refreshing,
    fetchLatestProfile,
    liveProfileUrl,
    copyLiveAsUrl,
    copyEmail,
    copyPhone,
    copyUrl,
    displayName,
    canToggleName,
    toggleDisplayName: () => {
      if (!canToggleName) return;
      setShowLegalNow((v) => !v);
    },
    headlineText,
    hookText,
    valuesItems,
    qualCol1,
    qualCol2,
    workTypeDisplay,
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
  };
}
