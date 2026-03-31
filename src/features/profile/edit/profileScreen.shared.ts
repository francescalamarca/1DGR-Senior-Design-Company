import { aws_config } from "@/constants/aws-config";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, usePathname } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

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


export function useCompanyProfileScreenData() {
    const { accessToken } = useSession();
    const { profile, setProfile } = useProfile();
    const pathname = usePathname();
  
    const [refreshing, setRefreshing] = useState(false);
    const fetchingRef = useRef(false);
    const didFetchOnceRef = useRef(false);
  
    const displayName = String(profile.companyName ?? "").trim() || "Company";
  
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
        if (res.status === 401) ({ res, text } = await doFetch(accessToken));
        if (!res.ok) { console.error("Failed to fetch profile:", res.status, text); return; }
  
        const data = text ? JSON.parse(text) : {};
        const user = data?.user ?? data?.users?.[0] ?? null;
        const videoLibrary = data?.videoLibrary ?? data?.videos ?? [];
  
        setProfile((prev: any) => ({
          ...prev,
          companyName: user?.company_name || user?.companyName || prev.companyName || "",
          email: user?.email || prev.email || "",
          phoneNumber: user?.phone_number || prev.phoneNumber || "",
          missionStatement: user?.mission_statement || user?.missionStatement || prev.missionStatement || "",
          companyCulture: user?.company_culture || user?.companyCulture || prev.companyCulture || "",
          benefitsSummary: user?.benefits_summary || user?.benefitsSummary || prev.benefitsSummary || "",
          coreValues: Array.isArray(user?.core_values) ? user.core_values : (Array.isArray(user?.coreValues) ? user.coreValues : prev.coreValues ?? []),
          openRoles: Array.isArray(user?.open_roles) ? user.open_roles : (Array.isArray(user?.openRoles) ? user.openRoles : prev.openRoles ?? []),
          industry: user?.industry || prev.industry || "",
          locations: Array.isArray(user?.locations) ? user.locations : prev.locations ?? [],
          workType: user?.work_type || user?.workType || prev.workType || "",
          businessAge: user?.business_age || user?.businessAge || prev.businessAge || "",
          avatarImageUri: toCloudFrontUrl(user?.avatar_image_url ?? user?.avatar_image_key ?? ""),
          avatarVideoUri: toCloudFrontUrl(user?.avatar_video_url ?? user?.avatar_video_key ?? ""),
          media: (Array.isArray(videoLibrary) ? videoLibrary : [])
            .filter((v: any) => v.slot !== null && v.slot !== undefined)
            .sort((a: any, b: any) => (a.slot ?? 0) - (b.slot ?? 0))
            .map((v: any, index: number) => ({
              id: v.id || `vid_${index}`,
              videoUri: toCloudFrontUrl(v.url || v.s3_key),
              imageUri: toCloudFrontUrl(v.thumbnailUrl || v.thumbnail_key || ""),
              caption: (v.caption ?? v.title ?? "").trim?.() ? (v.caption ?? v.title).trim() : "Untitled",
              slot: v.slot,
            })),
        }));
      } catch (error) {
        console.error("Error fetching company profile:", error);
      } finally {
        fetchingRef.current = false;
        setRefreshing(false);
      }
    }, [accessToken, setProfile]);
  
    useFocusEffect(
      useCallback(() => {
        fetchLatestProfile();
      }, [fetchLatestProfile])
    );
  
    // Company info sections
    const missionStatement = String(profile.missionStatement ?? "").trim();
    const benefitsSummary = String(profile.benefitsSummary ?? "").trim();
    const companyCulture = String(profile.companyCulture ?? "").trim();
    const coreValues: string[] = Array.isArray(profile.coreValues) ? profile.coreValues : [];
    const openRoles: any[] = Array.isArray(profile.openRoles) ? profile.openRoles : [];
    const industry = String(profile.industry ?? "").trim();
    const locations: string[] = Array.isArray(profile.locations) ? profile.locations : [];
  
    const videos = useMemo(() => {
      const list = Array.isArray(profile.media) ? profile.media : [];
      return list.filter((m: any) => m?.videoUri?.trim());
    }, [profile.media]);
  
    const openVideo = useCallback(
      (uri: string) => {
        router.push({
          pathname: "/(companyUser)/video",
          params: { uri, returnTo: pathname, playId: String(Date.now()) },
        });
      },
      [pathname]
    );
  
    return {
      profile,
      refreshing,
      fetchLatestProfile,
      copyEmail,
      copyPhone,
      copyUrl,
      displayName,
      missionStatement,
      benefitsSummary,
      companyCulture,
      coreValues,
      openRoles,
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
    };
  }