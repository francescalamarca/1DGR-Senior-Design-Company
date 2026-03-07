import { router, useFocusEffect } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, ScrollView } from "react-native";

import { aws_config } from "@/constants/aws-config";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import { updateUserProfile } from "@/src/utils/update_api";

import { hasProfileChanged, type DraftProfile } from "./profileEdit.compare";
import { INDUSTRIES } from "./profileEdit.constants";
import { mapDraftToApiPayload } from "./profileEdit.data";
import { filterCitiesByQuery, filterUniversitiesByQuery, mapCitiesFromJson, mapUniversitiesFromJson } from "./profileEdit.mappers";
import { buildCdnUrlFromKey, pickImageFromLibrary, pickVideoFromLibrary, uploadToS3 } from "./profileEdit.media";
import { type UniversityRow } from "./profileEdit.search";
import { type CityRow, type IndustryRow } from "./profileEdit.ui";

const MAX_HIGHER_ED = 8;

type ValueSummaryRow = { key?: string; label?: string; value?: string };

function parseValuesSummaryFromInput(input: string): ValueSummaryRow[] {
  const lines = String(input ?? "").split(/\r?\n/);

  return lines
    .map((line, idx) => {
      if (!line.trim()) return null;

      const colonIdx = line.indexOf(":");
      if (colonIdx >= 0) {
        const label = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1);
        if (!label && !value) return null;
        return {
          key: `value_${idx + 1}`,
          label,
          value: value || label,
        };
      }

      return {
        key: `value_${idx + 1}`,
        label: "",
        value: line,
      };
    })
    .filter(Boolean) as ValueSummaryRow[];
}

function formatValuesSummaryForInput(valuesSummary: unknown): string {
  if (!Array.isArray(valuesSummary)) return "";

  return valuesSummary
    .map((item) => {
      const label = String((item as any)?.label ?? "").trim();
      const value = String((item as any)?.value ?? "").trim();
      if (!label && !value) return "";
      return value || label;
    })
    .filter(Boolean)
    .join("\n");
}

export function useProfileEditController() {
  const { profile, setProfile, refreshProfile } = useProfile();
  const { accessToken } = useSession();

  const scrollRef = useRef<ScrollView | null>(null);

  const [draft, setDraft] = useState<DraftProfile>(() => (profile as any) as DraftProfile);
  const [isSaving, setIsSaving] = useState(false);

  const [avatarLocalUri, setAvatarLocalUri] = useState<string | null>(null);
  const [pickingAvatarImage, setPickingAvatarImage] = useState(false);

  const [industryPickerVisible, setIndustryPickerVisible] = useState(false);
  const [industrySearch, setIndustrySearch] = useState("");
  const [industryTempSelected, setIndustryTempSelected] = useState<Set<string>>(new Set());
  const [industryCustomInput, setIndustryCustomInput] = useState("");
  const [industryCustomOptions, setIndustryCustomOptions] = useState<string[]>([]);

  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityTempSelected, setCityTempSelected] = useState<string>("");

  const [singlePickerVisible, setSinglePickerVisible] = useState(false);
  const [singlePickerTitle, setSinglePickerTitle] = useState("");
  const [singlePickerOptions, setSinglePickerOptions] = useState<string[]>([]);
  const [singlePickerTempValue, setSinglePickerTempValue] = useState("");
  const [singlePickerOnSelect, setSinglePickerOnSelect] = useState<(val: string) => void>(() => () => {});

  const [mediaVideoUri, setMediaVideoUri] = useState<string | null>(null);
  const [mediaThumbUri, setMediaThumbUri] = useState<string | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [generatingThumbs, setGeneratingThumbs] = useState(false);
  const [thumbOptions, setThumbOptions] = useState<string[]>([]);
  const [addingLibraryVideo, setAddingLibraryVideo] = useState(false);

  const [higherEdPickerVisible, setHigherEdPickerVisible] = useState(false);
  const [higherEdSearch, setHigherEdSearch] = useState("");
  const higherEdListRef = useRef<FlatList<UniversityRow> | null>(null);

  const [degreePickerVisible, setDegreePickerVisible] = useState(false);
  const [degreePickerUniversity, setDegreePickerUniversity] = useState<{ unitid: string; label: string } | null>(null);

  const [degreeTempSelected, setDegreeTempSelected] = useState<Set<string>>(new Set());
  const [degreeTempFields, setDegreeTempFields] = useState<Record<string, string>>({});
  const [degreeTempGraduation, setDegreeTempGraduation] = useState("");
  const [valuesInputText, setValuesInputText] = useState("");

  const avatarPreviewUri = useMemo(() => {
    if (avatarLocalUri) return avatarLocalUri;

    const remote = buildCdnUrlFromKey(draft.avatarImageUri ?? "");
    if (remote && remote.startsWith("http")) {
      return `${remote}${remote.includes("?") ? "&" : "?"}v=${Date.now()}`;
    }
    return remote;
  }, [avatarLocalUri, draft.avatarImageUri]);

  const hasAvatar = !!(avatarLocalUri || (draft.avatarImageUri ?? "").trim());

  const changed = hasProfileChanged((profile as any) as DraftProfile, draft);
  const legalMiddleName = (draft as any).legalMiddleName;

  const canSave = useMemo(() => {
    const preferredOk = (draft.preferredName ?? "").trim().length > 0;
    const legalOk =
      (draft.legalFirstName?.trim().length ?? 0) > 0 ||
      (legalMiddleName?.trim().length ?? 0) > 0 ||
      (draft.legalLastName?.trim().length ?? 0) > 0;

    return (preferredOk || legalOk) && changed;
  }, [draft.preferredName, draft.legalFirstName, legalMiddleName, draft.legalLastName, changed]);


  const canUploadToLibrary =
    !!mediaVideoUri && !!mediaThumbUri && mediaCaption.trim().length > 0 && !addingLibraryVideo && !isSaving;

  const valuesText = valuesInputText;

  const predefinedIndustrySet = useMemo(() => {
    const s = new Set<string>();
    for (const cat of INDUSTRIES) {
      for (const opt of cat.options) s.add(opt);
    }
    return s;
  }, []);

  const industryRows: IndustryRow[] = useMemo(() => {
    const q = industrySearch.trim().toLowerCase();
    const sortedCats = [...INDUSTRIES].sort((a, b) => a.title.localeCompare(b.title));
    const rows: IndustryRow[] = [];

    for (const cat of sortedCats) {
      const opts = [...cat.options].sort((a, b) => a.localeCompare(b));
      const filtered = q ? opts.filter((opt) => opt.toLowerCase().includes(q)) : opts;
      if (filtered.length === 0) continue;

      rows.push({ type: "header", title: cat.title });
      for (const label of filtered) rows.push({ type: "option", category: cat.title, label, key: `${cat.title}__${label}` });
    }
    return rows;
  }, [industrySearch]);

  const cities: CityRow[] = useMemo(() => {
    try {
      const raw = require("@/src/data/uscities.json");
      return mapCitiesFromJson(raw);
    } catch {
      return [];
    }
  }, []);

  const filteredCities = useMemo(() => filterCitiesByQuery(cities, citySearch), [cities, citySearch]);

  const universities: UniversityRow[] = useMemo(() => {
    const raw = require("@/src/data/usuniversities.json");
    return mapUniversitiesFromJson(raw);
  }, []);

  const filteredUniversities: UniversityRow[] = useMemo(
    () => filterUniversitiesByQuery(universities, higherEdSearch),
    [universities, higherEdSearch]
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      higherEdListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    });
  }, [higherEdSearch]);

  const profileRef = useRef(profile);
  profileRef.current = profile;
  
  useFocusEffect(
    useCallback(() => {
      const p = profileRef.current;
      setDraft((p as any) as DraftProfile);
      setAvatarLocalUri(null);
      setMediaVideoUri(null);
      setMediaThumbUri(null);
      setMediaCaption("");
      setThumbOptions([]);
      setGeneratingThumbs(false);
      setAddingLibraryVideo(false);
      setHigherEdPickerVisible(false);
      setDegreePickerVisible(false);
      setHigherEdSearch("");
      setValuesInputText(formatValuesSummaryForInput((p as any).valuesSummary));
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo?.({ y: 0, animated: false });
      });
    }, []) // ✅ empty deps - safe because we read profile via ref
  );
  function handleCancel() {
    if (!changed) {
      router.replace("/(companyUser)/profile");
      return;
    }
    Alert.alert("Discard changes?", "You have unsaved edits.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.replace("/(companyUser)/profile") },
    ]);
  }

  async function handleSave() {
    if (!accessToken) return Alert.alert("Error", "No access token found. Please log in again.");

    setIsSaving(true);
    try {
      const apiPayload = mapDraftToApiPayload(draft);
      const json = JSON.stringify(apiPayload);
      if (json.length > 200_000) {
        Alert.alert(
          "Error",
          "Payload too large. Higher Ed data may be saving the full university row object instead of just {unitid,label,degrees,...}."
        );
        return;
      }

      await updateUserProfile(apiPayload as any, accessToken);
      setProfile((p: any) => ({ ...p, ...draft }));
      router.replace("/(companyUser)/profile");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  function openSingleSelectPicker(args: { title: string; options: string[]; value: string; onSelect: (val: string) => void }) {
    setSinglePickerTitle(args.title);
    setSinglePickerOptions(args.options);
    setSinglePickerTempValue(args.value ?? "");
    setSinglePickerOnSelect(() => args.onSelect);
    setSinglePickerVisible(true);
  }

  function summarizeIndustries(list: string[]) {
    const clean = (list ?? []).map((s) => s.trim()).filter(Boolean);
    if (clean.length === 0) return "None selected";
    if (clean.length <= 2) return clean.join(", ");
    return `${clean.slice(0, 2).join(", ")} +${clean.length - 2} more`;
  }

  function openIndustryPicker() {
    const current = new Set<string>((draft.industryInterests ?? []).map((s) => s.trim()).filter(Boolean));
    setIndustryTempSelected(current);
    setIndustryCustomInput("");
    setIndustrySearch("");
    setIndustryPickerVisible(true);
  }

  function toggleIndustry(val: string) {
    setIndustryTempSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  function addCustomIndustry() {
    const raw = industryCustomInput.trim();
    if (!raw || raw.length < 2) return;

    setIndustryCustomOptions((prev) => Array.from(new Set([...prev, raw])).sort((a, b) => a.localeCompare(b)));
    setIndustryTempSelected((prev) => new Set(prev).add(raw));
    setIndustryCustomInput("");
  }

  function applyIndustrySelection() {
    const selected = Array.from(industryTempSelected).map((s) => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
    setDraft((p) => ({ ...p, industryInterests: selected }));
    setIndustryPickerVisible(false);
  }

  function openCityPicker() {
    setCitySearch("");
    setCityTempSelected(draft.geographicLocation ?? "");
    setCityPickerVisible(true);
  }

  function applyCity() {
    setDraft((p) => ({ ...p, geographicLocation: cityTempSelected }));
    setCityPickerVisible(false);
  }

  function clearCity() {
    setDraft((p) => ({ ...p, geographicLocation: "" }));
  }

  function onChangeValuesText(input: string) {
    setValuesInputText(input);
    setDraft((p: any) => ({
      ...p,
      valuesSummary: parseValuesSummaryFromInput(input),
    }));
  }

  async function onPickAvatarImage() {
    try {
      setPickingAvatarImage(true);

      const uri = await pickImageFromLibrary();
      if (!uri) return;

      setAvatarLocalUri(uri);

      if (!accessToken) {
        Alert.alert("Error", "No access token");
        return;
      }

      const remoteKey = await uploadToS3({ localUri: uri, type: "image", accessToken });
      if (remoteKey) setDraft((p) => ({ ...p, avatarImageUri: remoteKey }));
    } catch (e) {
      console.error(e);
      Alert.alert("Avatar upload failed", "Please try again.");
    } finally {
      setPickingAvatarImage(false);
    }
  }

  function onRemoveAvatarImage() {
    Alert.alert("Remove avatar image?", "This will clear the selected avatar image.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setAvatarLocalUri(null);
          setDraft((p) => ({ ...p, avatarImageUri: "" }));
        },
      },
    ]);
  }

  

  function scrollToBottomSoon() {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 50);
    });
  }

  async function generateThumbnails(videoUri: string) {
    try {
      setGeneratingThumbs(true);
      setThumbOptions([]);
      setMediaThumbUri(null);

      const seconds = [0, 0.5, 1.0, 1.5, 2.0, 3.0];
      const out: string[] = [];

      for (const t of seconds) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: Math.floor(t * 1000) });
          if (uri) out.push(uri);
        } catch {}
      }

      const uniq = Array.from(new Set(out));
      setThumbOptions(uniq);
      if (!mediaThumbUri && uniq[0]) setMediaThumbUri(uniq[0]);
    } finally {
      setGeneratingThumbs(false);
    }
  }

  async function onPickMediaVideo() {
    const uri = await pickVideoFromLibrary();
    if (!uri) return;
    setMediaVideoUri(uri);
    await generateThumbnails(uri);
    scrollToBottomSoon();
  }

  async function onPickMediaThumb() {
    const uri = await pickImageFromLibrary();
    if (!uri) return;

    setThumbOptions((prev) => {
      const next = [uri, ...prev].filter(Boolean);
      return Array.from(new Set(next));
    });

    setMediaThumbUri(uri);
    scrollToBottomSoon();
  }

  function selectThumbnail(uri: string) {
    setMediaThumbUri(uri);
    scrollToBottomSoon();
  }

  async function onUploadSelectedMediaToLibrary() {
    if (!accessToken) return Alert.alert("Error", "No access token");
    if (!mediaVideoUri || !mediaThumbUri || !mediaCaption.trim()) return;

    setAddingLibraryVideo(true);
    try {
      const videoKey = await uploadToS3({ localUri: mediaVideoUri, type: "video", accessToken });
      if (!videoKey) throw new Error("Video upload failed");

      const thumbKey = await uploadToS3({ localUri: mediaThumbUri, type: "image", accessToken });
      if (!thumbKey) throw new Error("Thumbnail upload failed");

      const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/save-video-metadata`;
      const normalizedToken = accessToken.replace(/^Bearer\s+/i, "");
      const body = JSON.stringify({
        s3_key: videoKey,
        thumbnail_key: thumbKey,
        title: mediaCaption.trim(),
      });

      const doFetch = async (authHeader: string) => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body,
        });
        const text = await res.text().catch(() => "");
        return { res, text };
      };

      let { res, text } = await doFetch(`Bearer ${normalizedToken}`);
      if (res.status === 401) {
        ({ res, text } = await doFetch(normalizedToken));
      }

      if (!res.ok) {
        let msg = text;
        try {
          const parsed = text ? JSON.parse(text) : null;
          msg = parsed?.message ?? parsed?.error ?? parsed?.Message ?? msg;
        } catch {}
        throw new Error(msg || "Failed to add to library");
      }

      Alert.alert("Uploaded", "Video added to your Video Library.");

      setMediaVideoUri(null);
      setMediaThumbUri(null);
      setMediaCaption("");
      setThumbOptions([]);

      // Refresh profile so Video Library and slot state stay in sync with backend.
      await refreshProfile(accessToken);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
    } finally {
      setAddingLibraryVideo(false);
    }
  }

  async function clearSlotOnBackend(slot: number) {
    if (!accessToken) throw new Error("Missing access token");

    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/save-video-metadata`;
    const normalizedToken = accessToken.replace(/^Bearer\s+/i, "");
    const body = JSON.stringify({ slot, s3_key: " " }); // backend clears slot when trimmed key is empty

    const doFetch = async (authHeader: string) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body,
      });
      const text = await res.text().catch(() => "");
      return { res, text };
    };

    let { res, text } = await doFetch(`Bearer ${normalizedToken}`);
    if (res.status === 401) {
      ({ res, text } = await doFetch(normalizedToken));
    }

    if (!res.ok) {
      let msg = text;
      try {
        const parsed = text ? JSON.parse(text) : null;
        msg = parsed?.message ?? parsed?.error ?? parsed?.Message ?? msg;
      } catch {}
      throw new Error(`Slot ${slot} reset failed (${res.status}). ${msg || "No response body"}`);
    }
  }

  function resetProfileMediaOnly() {
    Alert.alert(
      "Reset profile videos?",
      "This clears your profile video slots only and keeps all videos in your library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            if (!accessToken) {
              Alert.alert("Error", "No access token found. Please log in again.");
              return;
            }

            setIsSaving(true);
            try {
              // Slots 1..5 are profile media slots. This does not delete library videos.
              for (let slot = 1; slot <= 5; slot += 1) {
                await clearSlotOnBackend(slot);
              }

              setProfile((p: any) => ({
                ...p,
                media: Array.from({ length: 5 }, (_, i) => ({
                  id: String(i + 1),
                  imageUri: "",
                  videoUri: "",
                  caption: "",
                })),
              }));

              setDraft((p: any) => ({
                ...p,
                media: Array.from({ length: 5 }, (_, i) => ({
                  id: String(i + 1),
                  imageUri: "",
                  videoUri: "",
                  caption: "",
                })),
              }));

              await refreshProfile(accessToken);
              Alert.alert("Reset complete", "Your profile video slots were cleared.");
            } catch (e: any) {
              console.error(e);
              Alert.alert("Reset failed", e?.message ?? "Please try again.");
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  }

  return {
    MAX_HIGHER_ED,
    scrollRef,
    draft,
    setDraft,
    isSaving,
    setIsSaving,
    canSave,
    handleCancel,
    handleSave,
    avatarPreviewUri,
    pickingAvatarImage,
    hasAvatar,
    onPickAvatarImage,
    onRemoveAvatarImage,
    summarizeIndustries,
    openSingleSelectPicker,
    openIndustryPicker,
    openCityPicker,
    clearCity,
    mediaVideoUri,
    mediaThumbUri,
    mediaCaption,
    setMediaCaption,
    generatingThumbs,
    thumbOptions,
    canUploadToLibrary,
    valuesText,
    onChangeValuesText,
    addingLibraryVideo,
    onPickMediaVideo,
    onPickMediaThumb,
    selectThumbnail,
    onUploadSelectedMediaToLibrary,
    resetProfileMediaOnly,
    industryPickerVisible,
    setIndustryPickerVisible,
    industrySearch,
    setIndustrySearch,
    industryRows,
    industryCustomOptions,
    industryCustomInput,
    setIndustryCustomInput,
    addCustomIndustry,
    industryTempSelected,
    toggleIndustry,
    predefinedIndustrySet,
    applyIndustrySelection,
    cityPickerVisible,
    setCityPickerVisible,
    citySearch,
    setCitySearch,
    filteredCities,
    cityTempSelected,
    setCityTempSelected,
    applyCity,
    singlePickerVisible,
    setSinglePickerVisible,
    singlePickerTitle,
    singlePickerOptions,
    singlePickerTempValue,
    setSinglePickerTempValue,
    singlePickerOnSelect,
  };
}
