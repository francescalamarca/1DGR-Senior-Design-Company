import { router, useFocusEffect } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Platform, ScrollView } from "react-native";

import { aws_config } from "@/constants/aws-config";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import { updateUserProfile } from "@/src/utils/update_api";

import { hasProfileChanged, type DraftProfile } from "./profileEdit.compare";
import type { OpenRole } from "@/src/features/profile/profile.types";
import { INDUSTRIES } from "./profileEdit.constants";
import { mapDraftToApiPayload } from "./profileEdit.data";
import { filterCitiesByQuery, mapCitiesFromJson } from "./profileEdit.mappers"; //label is defined in this map function
import { buildCdnUrlFromKey, downloadImageToCache, pickImageFromLibrary, pickVideoFromLibrary, uploadToS3 } from "./profileEdit.media";
import {type CityRow, type IndustryRow } from "./profileEdit.ui";



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

  const [coreValuePicker, setCoreValuePicker] = useState(false);
  const [coreValuesPickerVisible, setCoreValuesPickerVisible] = useState(false);

  const [roleFormVisible, setRoleFormVisible] = useState(false);



  const avatarPreviewUri = useMemo(() => {
    if (avatarLocalUri) return avatarLocalUri;

    const remote = buildCdnUrlFromKey(draft.avatarImageUri ?? draft.logoImageURI ?? "");
    if (remote && remote.startsWith("http")) {
      return `${remote}${remote.includes("?") ? "&" : "?"}v=${Date.now()}`;
    }
    return remote;
  }, [avatarLocalUri, draft.avatarImageUri, draft.logoImageURI]);

  const hasAvatar = !!(avatarLocalUri || (draft.avatarImageUri ?? draft.logoImageURI ?? "").trim());

  const changed = hasProfileChanged((profile as any) as DraftProfile, draft);

  const canUploadToLibrary =
    !!mediaVideoUri && !!mediaThumbUri && mediaCaption.trim().length > 0 && !addingLibraryVideo && !isSaving;


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

  //this is a call to get the cities in their city row form from the UI section so they present well
  const cities: CityRow[] = useMemo(() => {
    try {
      const raw = require("@/src/data/uscities.json");
      return mapCitiesFromJson(raw);
    } catch {
      return [];
    }
  }, []);

  const filteredCities = useMemo(() => filterCitiesByQuery(cities, citySearch), [cities, citySearch]);

  
  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Only reset draft on first mount, not on every focus (picker modals cause re-focus).
  useEffect(() => {
    const p = profileRef.current;
    setDraft((p as any) as DraftProfile);
    setAvatarLocalUri(null);
    setMediaVideoUri(null);
    setMediaThumbUri(null);
    setMediaCaption("");
    setThumbOptions([]);
    setGeneratingThumbs(false);
    setAddingLibraryVideo(false);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function handleCancel() {
    router.navigate("/(companyUser)/profile");
  }

  function handleSave() {
    const apiPayload = mapDraftToApiPayload(draft);

    // Navigate first — always, regardless of token state.
    if (Platform.OS === "web") {
      router.replace("/(companyUser)/web-profile" as any);
    } else {
      router.navigate("/(companyUser)/profile" as any);
    }

    // Update local store — use CDN URL if upload succeeded, local URI as fallback, else keep existing.
    setProfile((p: any) => ({
      ...p,
      ...draft,
      avatarImageUri:
        // If the user explicitly cleared the avatar, keep it cleared.
        draft.avatarImageUri === "" && !avatarLocalUri
          ? ""
          : buildCdnUrlFromKey(draft.avatarImageUri ?? "") || avatarLocalUri || (p as any).avatarImageUri,
    }));

    // Backend sync only if we have a token.
    if (accessToken) {
      updateUserProfile(apiPayload as any, accessToken)
        .catch((err) => console.warn("[handleSave] backend sync failed:", err));
    } else {
      console.warn("[handleSave] No access token — local save only.");
    }
  }

  function openSingleSelectPicker(args: { title: string; options: string[]; value: string; onSelect: (val: string) => void }) {
    setSinglePickerTitle(args.title);
    setSinglePickerOptions(args.options);
    setSinglePickerTempValue(args.value ?? "");
    setSinglePickerOnSelect(() => args.onSelect);
    setSinglePickerVisible(true);
  }

  function summarizeIndustries(industry: string) {
    const clean = (industry ?? "").trim();
    return clean.length > 0 ? clean : "None selected";
  }

  function openIndustryPicker() {
    const current = draft.industry ? new Set<string>([draft.industry]) : new Set<string>();
    setIndustryTempSelected(current);
    setIndustryCustomInput("");
    setIndustrySearch("");
    setIndustryPickerVisible(true);
  }

  function toggleIndustry(val: string) {
    setIndustryTempSelected((prev) => {
      if (prev.has(val)) return new Set<string>();
      return new Set<string>([val]);
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
    const selected = Array.from(industryTempSelected).map((s) => s.trim()).filter(Boolean)[0] ?? "";
    setDraft((p) => ({ ...p, industry: selected }));
    setIndustryPickerVisible(false);
  }

  //THESE WILL CHANGE FOR COMPANY TO ADAPT TO CHOOSING MULTIPLE LOCATIONS
  //don't need a temprorary placeholder

  //clears the search bar and opens the modal
  function openCityPicker() {
    setCitySearch("");
    setCityPickerVisible(true);
  }

  function addLocation(label: string) { //passing this in to get an instance of CityRow
    setDraft((p) => {
      //no max, infinite allowed
      const current = p.locations ?? []; //takes the current city that was tapped in the setDraft, gets current array, empty if nothing in it yet
      if (current.includes(label)){
        return {...p, locations: current.filter((v) => v !== label)}
      }// prevent duplicates, if already there and clicked again will remove
      return { ...p, locations: [...current, label] }; //appends to existing array
  });
  }

  function removeLocation(label: string) { //this is cleaner than passing in CityRow
    setDraft((p) => ({
    ...p,
    locations: (p.locations ?? []).filter((l) => l !== label),
  }));
  }

  //adding functionality for core values similar to add location with different list reference in the constants
  //referencing core_values
  function addCoreValue(value: string) {
  setDraft((p) => {
    const current = p.coreValues ?? [];
    if (current.includes(value)) {
      return { ...p, coreValues: current.filter((v) => v !== value) }; //keeps values ONLY IF they are not equal to any existing
    }
    if (current.length >= 5) return p; // enforce max
    return { ...p, coreValues: [...current, value] };
  });
}

function removeCoreValue(value: string) {
  setDraft((p) => ({
    ...p,
    coreValues: (p.coreValues ?? []).filter((v) => v !== value),
  }));
}

function openCoreValuesPicker() {
  //function will open the core values picker dropdown
  setCoreValuesPickerVisible(true);
}

function addRole(role: OpenRole) {
  setDraft((p) => ({
    ...p,
    openRoles: [...(p.openRoles ?? []), role],
  }));
}

function removeRole(id: string) {
  setDraft((p) => ({
    ...p,
    openRoles: (p.openRoles ?? []).filter((r) => r.id !== id),
  }));
}

function updateRole(role: OpenRole) {
  setDraft((p) => ({
    ...p,
    openRoles: (p.openRoles ?? []).map((r) => (r.id === role.id ? role : r)),
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

  async function onSetAvatarFromUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!accessToken) {
      Alert.alert("Error", "No access token");
      return;
    }

    try {
      setPickingAvatarImage(true);
      const localUri = await downloadImageToCache(trimmed);
      if (!localUri) {
        Alert.alert("Failed", "Could not load image from that URL.");
        return;
      }
      setAvatarLocalUri(localUri);
      const remoteKey = await uploadToS3({ localUri, type: "image", accessToken });
      if (remoteKey) setDraft((p) => ({ ...p, avatarImageUri: remoteKey }));
    } catch (e) {
      console.error(e);
      Alert.alert("Failed", "Could not load image from that URL.");
    } finally {
      setPickingAvatarImage(false);
    }
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

  const canSave = !isSaving;

  function selectBackgroundColor(color: string) {
    setDraft((p) => ({ ...p, customBackgroundColor: color }));
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
    onSetAvatarFromUrl,
    summarizeIndustries,
    openSingleSelectPicker,
    openIndustryPicker,
    openCityPicker,
    addLocation, //added for locations
    removeLocation, //added for locations
    addCoreValue,
    removeCoreValue,
    openCoreValuesPicker, //referenced in profileEdit,screen
    coreValuesPickerVisible,
    coreValuePicker,
    setCoreValuePicker,
    setCoreValuesPickerVisible,
    mediaVideoUri,
    mediaThumbUri,
    mediaCaption,
    setMediaCaption,
    generatingThumbs,
    thumbOptions,
    canUploadToLibrary,
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
    selectBackgroundColor,
    applyIndustrySelection,
    cityPickerVisible,
    setCityPickerVisible,
    citySearch,
    setCitySearch,
    filteredCities,
    singlePickerVisible,
    setSinglePickerVisible,
    singlePickerTitle,
    singlePickerOptions,
    singlePickerTempValue,
    setSinglePickerTempValue,
    singlePickerOnSelect,
    roleFormVisible,
    setRoleFormVisible,
    addRole,
    removeRole,
    updateRole,
  };
}
