/**
 * VideoLibraryScreen
 * - Displays the user’s `profile.videoLibrary` as a 3-column grid with pull-to-refresh (GET /profile).
 * - Ensures each library item has a thumbnail (uses stored thumbnail when available, otherwise generates/caches one).
 * - Lets the user select ONE video, optionally edit its caption, choose a target slot (0=avatar, 1–5=profile slots),
 *   and persist that selection to backend/profile via POST /save-video-metadata.
 * - Supports deleting the selected video via POST /delete-video (with a separate Recovery screen for restores).
 * - UI: sticky header + bottom slot bar via KeyboardScreen; hides bottom bar when keyboard is open; caption editor
 *   floats above the keyboard using a local keyboard-height hook.
 */
import { aws_config } from "@/constants/aws-config";
import { useProfile } from "@/src/features/profile/profile.store";
import type { LibraryVideo } from "@/src/features/profile/profile.types";
import { useSession } from "@/src/state/session";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

// ✅ IMPORTANT: Update this import path to match YOUR project
import KeyboardScreen from "@/src/components/KeyboardScreen";

/** ======================
 *  Fonts
 *  ====================== */
const FONT_LEXEND_REGULAR = "Lexend-Regular";
const FONT_DM_MONO_LIGHT = "DMMono-Light";
const FONT_CRIMSON_REGULAR = "CrimsonText-Regular";
const FONT_LEXEND_LIGHT = "Lexend-Light";

type LibraryItem = {
  id: string;
  url: string; // CloudFront URL
  s3Key: string; // REQUIRED for backend (fallback derived from url if missing)
  thumbnailUrl: string; // required for UI consistency
  thumbnailS3Key?: string;
  caption: string; // "" allowed
  source: "recording-studio" | "camera-roll";
  createdAt: number;
};

// Convert an S3 key into a CloudFront URL (pass-through if already a URL).
function toCloudFrontUrl(urlOrKey: string): string {
  if (!urlOrKey) return "";
  if (urlOrKey.includes("://")) return urlOrKey;
  if (aws_config.cloudFrontDomain) {
    return `https://${aws_config.cloudFrontDomain}/${urlOrKey}`;
  }
  return urlOrKey;
}

// Renders one square tile in the 3-column grid and lazily ensures a thumbnail exists when the tile is focused.
function VideoTile({
  item,
  size,
  selected,
  onPress,
  getThumbIfNeeded,
  thumbUri,
  loading,
}: {
  item: LibraryItem;
  size: number;
  selected: boolean;
  onPress: () => void;
  getThumbIfNeeded: (item: LibraryItem) => void;
  thumbUri?: string;
  loading?: boolean;
}) {
  useFocusEffect(
    useCallback(() => {
      getThumbIfNeeded(item);
    }, [getThumbIfNeeded, item])
  );

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        height: size,
        backgroundColor: "#000",
      }}
    >
      {thumbUri && thumbUri.trim().length > 0 ? (
        <Image
          source={{ uri: thumbUri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {loading ? <ActivityIndicator /> : null}
        </View>
      )}

      {selected ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: 6,
              bottom: 6,
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.85)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#202020", fontSize: 12, fontWeight: "900", lineHeight: 12 }}>
              ✓
            </Text>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

// Minimal "person" glyph used for slot 0 (avatar) in the bottom slot picker.
function ProfileGlyph({ color }: { color: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          backgroundColor: color,
          marginBottom: 2,
        }}
      />
      <View
        style={{
          width: 14,
          height: 6,
          borderTopLeftRadius: 999,
          borderTopRightRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// Extract an S3 key from a full URL path (fallback for older records that only store URLs).
function deriveS3KeyFromUrl(urlOrKey: string) {
  if (!urlOrKey) return "";
  if (!urlOrKey.includes("://")) return urlOrKey;
  try {
    const u = new URL(urlOrKey);
    return (u.pathname || "").replace(/^\/+/, "");
  } catch {
    return "";
  }
}

// Track keyboard height so the floating caption editor can sit above the keyboard.
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      setHeight(typeof h === "number" ? h : 0);
    });

    const hideSub = Keyboard.addListener(hideEvt, () => setHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

export default function VideoLibraryScreen() {
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = typeof params.returnTo === "string" ? params.returnTo : "/(companyUser)/record";

  const { profile, setProfile } = useProfile();
  const { accessToken } = useSession();

  const [refreshing, setRefreshing] = useState(false);

  // ✅ Source of truth: profile.videoLibrary (NOT profile.media)
  const libraryItems: LibraryItem[] = useMemo(() => {
    const list = (profile.videoLibrary ?? [])
      .map((v: LibraryVideo, idx: number) => ({
        id: v.id ?? `lv_${idx}`,
        url: (v.url ?? "").trim(),
        s3Key: (v.s3Key ?? "").trim(),
        thumbnailUrl: (v.thumbnailUrl ?? "").trim(),
        // Map the raw key from your store if available
        thumbnailS3Key: (v as any).thumbnailS3Key ?? (v as any).thumbnail_key,
        caption: (v.caption ?? "").trim(),
        source: v.source ?? "camera-roll",
        createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.now(),
      }))
      .filter((x) => x.url.length > 0);

    // de-dupe by url
    const seen = new Set<string>();
    return list.filter((x) => {
      if (seen.has(x.url)) return false;
      seen.add(x.url);
      return true;
    });
  }, [profile.videoLibrary]);

  const screenW = Dimensions.get("window").width;
  const tileSize = Math.floor(screenW / 3);

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null); // 0..5
  const [saving, setSaving] = useState(false);

  // thumbs cache by video URL
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [thumbLoading, setThumbLoading] = useState<Record<string, boolean>>({});

  // caption editor state
  const [selectedCaption, setSelectedCaption] = useState("");

  const thumbsRef = useRef(thumbs);
  const loadingRef = useRef(thumbLoading);
  thumbsRef.current = thumbs;
  loadingRef.current = thumbLoading;

  // ✅ only for caption editor placement
  const keyboardHeight = useKeyboardHeight();

// Refresh library by fetching the latest profile payload and normalizing the backend video schema into `videoLibrary`.
  const fetchVideoLibraryFromBackend = useCallback(async () => {
    if (!accessToken) throw new Error("Missing access token");

    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/profile`;

    // normalize once (prevents "Bearer Bearer xxx")
    const normalizedToken = accessToken.replace(/^Bearer\s+/i, "");

    const doFetch = async (authHeader: string) => {
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: authHeader },
      });
      const text = await res.text().catch(() => "");
      return { res, text };
    };

    // try Bearer then raw
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
      throw new Error(`Refresh failed (${res.status}). ${msg || "No response body"}`);
    }

    const data = text ? JSON.parse(text) : {};
    const remoteList = (data?.videoLibrary ?? data?.videos ?? []) as any[];

    const normalized: LibraryVideo[] = remoteList
      .map((v: any, idx: number) => {
        const rawUrl = String(v?.url ?? v?.videoUrl ?? v?.video_url ?? v?.s3_key ?? "").trim();
        const rawThumb = String(v?.thumbnailUrl ?? v?.thumbnail_url ?? v?.thumbnail_key ?? "").trim();
        const rawThumbKey = String(v?.thumbnail_key ?? v?.thumbnailS3Key ?? "").trim();
        const rawS3Key = String(v?.s3Key ?? v?.s3_key ?? "").trim();

        const urlFinal = toCloudFrontUrl(rawUrl);
        const thumbFinal = toCloudFrontUrl(rawThumb);
        const s3KeyFinal = rawS3Key || deriveS3KeyFromUrl(urlFinal);

        return {
          id: String(v?.id ?? `lv_remote_${idx}`),
          url: urlFinal,
          s3Key: s3KeyFinal,
          thumbnailUrl: thumbFinal,
          thumbnailS3Key: rawThumbKey,
          caption: String(v?.caption ?? v?.title ?? "").trim(),
          source: (v?.source as any) ?? "camera-roll",
          createdAt: typeof v?.createdAt === "number" ? v.createdAt : Date.now(),
        } as LibraryVideo;
      })
      .filter((x) => (x.url ?? "").trim().length > 0);

    setProfile((p: any) => ({
      ...p,
      videoLibrary: normalized,
    }));

    // Clear thumb caches so UI re-evaluates fresh items
    setThumbs({});
    setThumbLoading({});
  }, [accessToken, setProfile]);

  // Pull-to-refresh handler that wraps backend fetch + error alerts.
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchVideoLibraryFromBackend();
    } catch (e: any) {
      Alert.alert("Couldn’t refresh", e?.message ?? "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, [fetchVideoLibraryFromBackend]);

  // Ensure a thumbnail exists for a library item:
// - If backend provided one, cache it locally.
// - Otherwise generate one from the video and write it back into the store for future sessions.
  const getThumbIfNeeded = useCallback(
    async (item: LibraryItem) => {
      const url = item.url;
      if (!url) return;

      // If library already has a thumbnailUrl, cache it and stop.
      if (item.thumbnailUrl && item.thumbnailUrl.trim().length > 0) {
        if (!thumbsRef.current[url]) {
          setThumbs((p) => ({ ...p, [url]: item.thumbnailUrl }));
        }
        return;
      }

      // If already generating / cached, stop.
      if (thumbsRef.current[url] || loadingRef.current[url]) return;

      setThumbLoading((p) => ({ ...p, [url]: true }));
      try {
        const res = await VideoThumbnails.getThumbnailAsync(url, { time: 300 });
        const newThumb = (res?.uri ?? "").trim();
        if (newThumb.length > 0) {
          // cache
          setThumbs((p) => ({ ...p, [url]: newThumb }));

          // ✅ write back into profile.videoLibrary so it survives screen refresh
          setProfile((p: any) => {
            const next = (p.videoLibrary ?? []).map((v: LibraryVideo) => {
              if ((v.url ?? "").trim() !== url) return v;
              return { ...v, thumbnailUrl: newThumb };
            });
            return { ...p, videoLibrary: next };
          });
        }
      } catch {
        // ok
      } finally {
        setThumbLoading((p) => ({ ...p, [url]: false }));
      }
    },
    [setProfile]
  );

  const libraryItemsRef = useRef(libraryItems);
libraryItemsRef.current = libraryItems;

useFocusEffect(
  useCallback(() => {
    let cancelled = false;

    (async () => {
      for (const item of libraryItemsRef.current.slice(0, 30)) {
        if (cancelled) return;
        await getThumbIfNeeded(item);
      }
    })();

    return () => {
      cancelled = true;
      setSelectedVideoUrl(null);
      setSelectedSlot(null);
      setSelectedCaption("");
      setSaving(false);
    };
  }, [getThumbIfNeeded]) // ✅ removed libraryItems, reads via ref instead
);

  const canSave = !!selectedVideoUrl && selectedSlot !== null && !saving;
  const canDelete = !!selectedVideoUrl && !saving;

  // Map a UI slot number to the correct profile field:
// 0 => avatarVideoUri, 1–5 => media[0..4].
  const getTargetFromSlot = useCallback((slot: number) => {
    if (slot === 0) return { type: "avatar" as const };
    return { type: "media" as const, index: Math.max(0, Math.min(4, slot - 1)) };
  }, []);

  // Persist a slot assignment (video + thumbnail + caption/title) to backend via POST /save-video-metadata.
  async function saveVideoMetadataToBackend(args: {
    slot: number;
    s3Key: string;
    thumbnailKey: string;
    title?: string;
  }) {
    if (!accessToken) throw new Error("Missing access token");

    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/save-video-metadata`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        slot: args.slot,
        s3_key: args.s3Key,
        thumbnail_key: args.thumbnailKey,
        title: args.title ?? "",
      }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      let msg = text;
      try {
        const parsed = text ? JSON.parse(text) : null;
        msg = parsed?.message ?? parsed?.error ?? parsed?.Message ?? msg;
      } catch {}
      throw new Error(`Upload failed (${res.status}). ${msg || "No response body"}`);
    }

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  // Delete a library item via backend (POST /delete-video). The Recovery screen can restore later.
  async function deleteVideoFromBackend(args: { videoId: string }) {
    if (!accessToken) throw new Error("Missing access token");

    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/delete-video`;

    const normalizedToken = accessToken.replace(/^Bearer\s+/i, "");

    const doFetch = async (authHeader: string) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          video_id: args.videoId, // ✅ IMPORTANT
        }),
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
      throw new Error(`Delete failed (${res.status}). ${msg || "No response body"}`);
    }

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  // Save the currently-selected video into the chosen slot:
// - Optimistically updates local profile store for immediate UI feedback.
// - Confirms replacement if the target slot already has a different video.
// - Rolls back on backend failure.
 async function saveSelectedToProfile() {
    if (!selectedVideoUrl || selectedSlot === null) return;
    if (saving) return;

    const slot = selectedSlot; // ✅ Type narrowing: now TypeScript knows it's number, not null
    const isAvatar = slot === 0;
    const selected = libraryItems.find((x) => x.url === selectedVideoUrl);
    
    if (!selected) {
      Alert.alert("Missing video", "Couldn't find that video in your library.");
      return;
    }

    // ✅ DEFINE performSave FIRST so it's accessible in the Alert callback
    const performSave = async () => {
      // ✅ Re-check to satisfy TypeScript (closure safety)
      if (!selected) return;
      
      const finalCaption = isAvatar ? "" : selectedCaption.trim();

      let thumbKey = selected.thumbnailS3Key;

      if (!thumbKey) {
        const remoteThumbUrl = (selected.thumbnailUrl ?? "").trim();
        thumbKey = deriveS3KeyFromUrl(remoteThumbUrl);
      }

      if (!thumbKey) thumbKey = "";

      const s3Key = (selected.s3Key ?? "").trim() || deriveS3KeyFromUrl(selected.url);

      // No-auth / local-only path: skip backend, just update local profile state
      if (!accessToken || !s3Key) {
        const target = getTargetFromSlot(slot);
        setProfile((p: any) => {
          const media = [...(p.media ?? [])];
          for (let i = 0; i < 5; i++) {
            if (!media[i]) media[i] = { id: String(i + 1), imageUri: "", videoUri: "", caption: "" };
          }
          if (target.type === "avatar") return { ...p, avatarVideoUri: selected.url };
          media[target.index] = {
            ...media[target.index],
            videoUri: selected.url,
            imageUri: selected.thumbnailUrl ?? "",
            caption: finalCaption,
          };
          return { ...p, media };
        });
        setSelectedVideoUrl(null);
        setSelectedSlot(null);
        setSelectedCaption("");
        router.replace(returnTo as any);
        return;
      }

      setSaving(true);

      const target = getTargetFromSlot(slot);
      const prevProfile = profile;

      setProfile((p: any) => {
        const media = [...(p.media ?? [])];
        for (let i = 0; i < 5; i++) {
          if (!media[i]) media[i] = { id: String(i + 1), imageUri: "", videoUri: "", caption: "" };
        }

        if (target.type === "avatar") {
          return { ...p, avatarVideoUri: selected.url };
        }

        media[target.index] = {
          ...media[target.index],
          videoUri: selected.url,
          imageUri: thumbKey,
          caption: finalCaption,
        };

        return { ...p, media };
      });

      try {
        await saveVideoMetadataToBackend({
          slot: slot,
          s3Key,
          thumbnailKey: thumbKey,
          title: finalCaption,
        });

        setSelectedVideoUrl(null);
        setSelectedSlot(null);
        setSelectedCaption("");
        router.replace(returnTo as any);
      } catch (e: any) {
        setProfile(prevProfile);
        Alert.alert("Couldn't save", e?.message ?? "Unknown error");
        setSaving(false);
      }
    };

    // ✅ CHECK: Is there already a video in this slot?
    const existingVideoInSlot = (() => {
      if (slot === 0) {
        // Avatar slot
        return profile.avatarVideoUri ? { url: profile.avatarVideoUri } : null;
      } else {
        // Media slots 1-5
        const mediaIndex = slot - 1;
        const mediaItem = profile.media?.[mediaIndex];
        return mediaItem?.videoUri ? { url: mediaItem.videoUri } : null;
      }
    })();

    // ✅ If slot has a video AND it's different from the one we're saving, warn user
    if (existingVideoInSlot && existingVideoInSlot.url !== selectedVideoUrl) {
      Alert.alert(
        "Replace existing video?",
        `Slot ${slot === 0 ? "Avatar" : slot} already has a video. This will replace it and move the old video back to your library.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            style: "destructive",
            onPress: () => performSave(),
          },
        ]
      );
      return;
    }

    // No conflict, save directly
    performSave();
  }

// Confirm + delete the currently-selected video, then refresh the library from backend on success.
  const deleteSelectedVideo = useCallback(() => {
    if (!selectedVideoUrl) return;

    const selected = libraryItems.find((x) => x.url === selectedVideoUrl);
    if (!selected) return;

    const videoId = selected.id;
    if (!videoId) {
      Alert.alert("Can't delete", "Missing video ID.");
      return;
    }

    Alert.alert(
      "Delete video?",
      "This will remove it from your library now. You can recover it later from Recovery.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (saving || refreshing) return;
            setSaving(true);

            try {
              await deleteVideoFromBackend({ videoId });

              setSelectedVideoUrl(null);
              setSelectedSlot(null);
              setSelectedCaption("");
              await fetchVideoLibraryFromBackend();
            } catch (e: any) {
              console.log("[video-library] delete failed - backend auth likely AWS_IAM:", e);
              Alert.alert("Delete failed", e?.message ?? "Unknown error");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [libraryItems, saving, refreshing, selectedVideoUrl, fetchVideoLibraryFromBackend]);

  const BAR_BG = "#202020";
  const ICON_COLOR = "#FEFEFE";
  const ICON_BG_SELECTED = "rgba(255,255,255,0.22)";
  const ICON_BG_UNSELECTED = "#202020";
  const slots = [0, 1, 2, 3, 4, 5];

  const captionBottom = keyboardHeight > 0 ? keyboardHeight + 12 : Platform.OS === "ios" ? 90 : 84;
  const gridBottomPad = selectedVideoUrl
    ? Platform.OS === "ios"
      ? 230
      : 214
    : Platform.OS === "ios"
      ? 104
      : 96;

  const renderItem = ({ item }: { item: LibraryItem }) => {
    const isSelected = selectedVideoUrl === item.url;
    const thumbUri = (thumbs[item.url] ?? "").trim() || (item.thumbnailUrl ?? "").trim() || "";

    return (
      <VideoTile
        item={item}
        size={tileSize}
        selected={isSelected}
        onPress={() => {
          if (saving || refreshing) return;

          setSelectedVideoUrl((prev) => {
            const next = prev === item.url ? null : item.url;
            if (next) setSelectedCaption(item.caption ?? "");
            else setSelectedCaption("");
            return next;
          });
        }}
        getThumbIfNeeded={getThumbIfNeeded}
        thumbUri={thumbUri}
        loading={thumbLoading[item.url]}
      />
    );
  };

  // ✅ Keep your empty view, but we will render it via ListEmptyComponent so pull-to-refresh works.
  const ListEmpty = (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ opacity: 0.6, fontFamily: FONT_DM_MONO_LIGHT }}>No videos yet.</Text>
    </View>
  );

  const Header = (
    <View style={{ height: 52, justifyContent: "center", paddingHorizontal: 12 }}>
      <Pressable
        onPress={() => router.replace(returnTo as any)}
        hitSlop={10}
        style={{
          position: "absolute",
          left: 15,
          top: 0,
          bottom: 0,
          justifyContent: "center",
          paddingHorizontal: 6,
          zIndex: 999,
          elevation: 999,
        }}
      >
        <Text
          onPress={() => router.replace((returnTo || "/(companyUser)/profile") as any)}
          style={{
            fontFamily: FONT_LEXEND_LIGHT,
            fontSize: 16,
            opacity: saving || refreshing ? 0.5 : 1,
          }}
        >
          ‹ Back
        </Text>
      </Pressable>

      <Text
        style={{
          fontFamily: FONT_LEXEND_REGULAR,
          textAlign: "center",
          fontSize: 14,
          opacity: 0.7,
        }}
      >
        Video Library
      </Text>

      <View style={{ position: "absolute", right: 12, flexDirection: "row", gap: 10 }}>
        <Pressable
          hitSlop={10}
          disabled={saving || refreshing}
          onPress={onRefresh}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 8,
            opacity: saving || refreshing ? 0.35 : 1,
          }}
        >
          <Text style={{ fontSize: 16, color: "#202020" }}>{refreshing ? "…" : "⟳"}</Text>
        </Pressable>

        <Pressable
          hitSlop={10}
          disabled={saving || refreshing}
          onPress={() => {
            if (saving || refreshing) return;
            router.push("/(companyUser)/video-recovery");
          }}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 8,
            opacity: saving || refreshing ? 0.35 : 1,
          }}
        >
          <Text style={{ fontSize: 16, color: "#202020" }}>↩︎</Text>
        </Pressable>

        <Pressable
          hitSlop={10}
          disabled={!canDelete || refreshing}
          onPress={() => {
            console.log("Delete button pressed!");
            deleteSelectedVideo();
          }}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 8,
            opacity: canDelete && !refreshing ? 1 : 0.35,
          }}
        >
          <Text style={{ fontSize: 16, color: "#202020" }}>🗑</Text>
        </Pressable>
      </View>
    </View>
  );

  const BottomBar = (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Platform.OS === "ios" ? 18 : 14,
        height: 62,
        borderRadius: 999,
        backgroundColor: BAR_BG,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        gap: 10,
      }}
    >
      <Text
        style={{
          fontFamily: FONT_CRIMSON_REGULAR,
          color: "#FEFEFE",
          opacity: 0.9,
          fontSize: 12,
        }}
      >
        Media:
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        {slots.map((slotIdx) => {
          const active = selectedSlot === slotIdx;

          return (
            <Pressable
              key={slotIdx}
              disabled={saving || refreshing}
              onPress={() => setSelectedSlot((prev) => (prev === slotIdx ? null : slotIdx))}
              hitSlop={10}
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? ICON_BG_SELECTED : ICON_BG_UNSELECTED,
                opacity: saving || refreshing ? 0.6 : 1,
              }}
            >
              {slotIdx === 0 ? (
                <ProfileGlyph color={ICON_COLOR} />
              ) : (
                <Text
                  style={{
                    fontFamily: FONT_CRIMSON_REGULAR,
                    color: ICON_COLOR,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {slotIdx}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={saveSelectedToProfile}
        disabled={!canSave || refreshing}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: canSave && !refreshing ? "#FEFEFE" : "rgba(255,255,255,0.25)",
        }}
      >
        <Text
          style={{
            fontFamily: FONT_LEXEND_REGULAR,
            color: canSave && !refreshing ? "#202020" : "rgba(255,255,255,0.6)",
            fontWeight: "800",
            fontSize: 12,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <KeyboardScreen
      backgroundColor="#fff"
      header={Header}
      bottomBar={BottomBar}
      hideBottomBarOnKeyboard
      safeAreaEdges={["top", "left", "right"]}
      enableKeyboardAvoidingView={false} // ✅ FIX: prevents the big white gap + top-jump
    >
      {/* ✅ Grid: ALWAYS render FlatList so pull-to-refresh works even when empty */}
      <View style={{ flex: 1 }}>
        <FlatList
          data={libraryItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={ListEmpty}
          // ✅ THE FIX: make the list fill the screen so you can pull even with 0 items
          contentContainerStyle={{ paddingBottom: gridBottomPad + 20, flexGrow: 1 }}
          // ✅ helpful on iOS so you can always drag down
          alwaysBounceVertical
          // ✅ helpful on Android (won’t hurt iOS)
          overScrollMode="always"
          getItemLayout={(_, index) => ({
            length: tileSize,
            offset: tileSize * Math.floor(index / 3),
            index,
          })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>

      {/* Caption editor: moves above keyboard */}
      {selectedVideoUrl ? (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: captionBottom,
            backgroundColor: "white",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#E6E6E6",
            padding: 12,
            opacity: selectedSlot === 0 ? 0.5 : 1,
          }}
          pointerEvents={selectedSlot === 0 ? "none" : "auto"}
        >
          <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
            Caption (shows on your profile)
          </Text>

          <TextInput
            value={selectedCaption}
            onChangeText={setSelectedCaption}
            placeholder="Add a caption…"
            placeholderTextColor="#999"
            editable={!saving && selectedSlot !== 0}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              backgroundColor: "white",
            }}
            maxLength={80}
            returnKeyType="done"
          />

          <Text style={{ marginTop: 6, fontSize: 11, opacity: 0.5 }}>
            {selectedCaption.length}/80
          </Text>

          {selectedSlot === 0 ? (
            <Text style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
              Avatar slot doesn’t use captions.
            </Text>
          ) : null}
        </View>
      ) : null}
    </KeyboardScreen>
  );
}
