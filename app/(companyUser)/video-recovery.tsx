/**
 * VideoRecoveryScreen
 * - Displays `profile.deletedVideoLibrary` as a 3-column recovery grid (multi-select by URL).
 * - Ensures each deleted item has a thumbnail (uses stored thumbnailUrl when available, otherwise generates/caches one).
 * - Supports pull-to-refresh (GET /profile) to sync the deleted list from backend, then clears selection + thumb caches.
 * - Allows batch actions on selected videos:
 *   - Recover: calls POST /recover-video and optimistically moves items back into `profile.videoLibrary`.
 *   - Delete forever: calls DELETE /delete-video-forever and optimistically removes items from `deletedVideoLibrary`.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform,
  Image,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import { aws_config } from "@/constants/aws-config";
import type { LibraryVideo } from "@/src/features/profile/profile.types";

type RecoveryItem = {
  id: string;
  url: string;
  s3Key: string;
  thumbnailUrl: string;
  caption: string;
  source: "recording-studio" | "camera-roll";
  createdAt: number;
};

// ✅ Fonts (must match your font loader registrations)
const FONT_LEXEND_REGULAR = "Lexend-Regular" as const;
const FONT_LEXEND_LIGHT = "Lexend-Light" as const; // ✅ CHANGED: Lexend Light
const FONT_DM_MONO_LIGHT = "DMMono-Light" as const;

const lexendRegular = (extra?: any) => ({
  fontFamily: FONT_LEXEND_REGULAR,
  ...extra,
});

const lexendLight = (extra?: any) => ({
  fontFamily: FONT_LEXEND_LIGHT,
  fontWeight: "300", // ✅ helps prevent "thick" rendering
  ...extra,
});

const dmMonoLight = (extra?: any) => ({
  fontFamily: FONT_DM_MONO_LIGHT,
  ...extra,
});

// Reusable grid tile for deleted videos (lazy thumbnail + selection overlay). Supports multi-select.
function VideoTile({
  item,
  size,
  selected,
  onPress,
  getThumbIfNeeded,
  thumbUri,
  loading,
}: {
  item: RecoveryItem;
  size: number;
  selected: boolean;
  onPress: () => void;
  getThumbIfNeeded: (item: RecoveryItem) => void;
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

// Extract an S3 key from a full URL path (fallback when only a URL is stored).
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

export default function VideoRecoveryScreen() {
  const { profile, setProfile } = useProfile();
  const { accessToken } = useSession();

  // Build the Recovery list from `profile.deletedVideoLibrary` and normalize fields for the UI.
  const deletedItems: RecoveryItem[] = useMemo(() => {
    const list = (profile.deletedVideoLibrary ?? [])
      .map((v: LibraryVideo, idx: number) => ({
        id: v.id ?? `dv_${idx}`,
        url: v.url ?? "",
        s3Key: (v.s3Key ?? "").trim(),
        thumbnailUrl: v.thumbnailUrl ?? "",
        caption: (v.caption ?? "").trim(),
        source: (v.source as any) ?? "camera-roll",
        createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.now(),
      }))
      .filter((x) => x.url.length > 0);

    return list; // keep all deleted videos
  }, [profile.deletedVideoLibrary]);

  const screenW = Dimensions.get("window").width;
  const tileSize = Math.floor(screenW / 3);

  // multi-select: store urls (stable & easy)
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // thumbs cache by url
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [thumbLoading, setThumbLoading] = useState<Record<string, boolean>>({});

  const thumbsRef = useRef(thumbs);
  const loadingRef = useRef(thumbLoading);
  thumbsRef.current = thumbs;
  loadingRef.current = thumbLoading;

  // ✅ refresh state
  const [refreshing, setRefreshing] = useState(false);

// Pull latest profile from backend (GET /profile), merge into store, then clear selection + thumbnail caches.
  const refreshFromBackend = useCallback(async () => {
    if (!accessToken) return;

    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/profile`;

    const doFetch = async (authHeader: string) => {
      const res = await fetch(url, { headers: { Authorization: authHeader } });
      const text = await res.text().catch(() => "");
      return { res, text };
    };

    setRefreshing(true);
    try {
      let { res, text } = await doFetch(`Bearer ${accessToken}`);
      if (res.status === 401) ({ res, text } = await doFetch(accessToken));

      if (!res.ok) {
        let msg = text;
        try {
          const parsed = text ? JSON.parse(text) : null;
          msg = parsed?.message ?? parsed?.error ?? parsed?.Message ?? msg;
        } catch {}
        throw new Error(msg || `Refresh failed (${res.status})`);
      }

      const data = text ? JSON.parse(text) : {};
      // Accept either { profile: {...} } or direct profile object
      const nextProfile = data?.profile ?? data;

      if (nextProfile && typeof nextProfile === "object") {
        setProfile((p: any) => ({ ...p, ...nextProfile }));
      }

      // optional: clear selection + thumbs so UI feels "fresh"
      setSelectedUrls(new Set());
      setThumbs({});
      setThumbLoading({});
    } catch (e: any) {
      Alert.alert("Refresh failed", e?.message ?? "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, setProfile]);

  // Ensure a thumbnail exists for a deleted item:
// - If backend provided one, cache it.
// - Otherwise generate one and write it back into `deletedVideoLibrary` so it persists.
  const getThumbIfNeeded = useCallback(
    async (item: RecoveryItem) => {
      const url = item.url;
      if (!url) return;

      // if has thumbnailUrl -> cache it
      if (item.thumbnailUrl && item.thumbnailUrl.trim().length > 0) {
        if (!thumbsRef.current[url]) {
          setThumbs((p) => ({ ...p, [url]: item.thumbnailUrl }));
        }
        return;
      }

      // already cached / generating
      if (thumbsRef.current[url] || loadingRef.current[url]) return;

      setThumbLoading((p) => ({ ...p, [url]: true }));
      try {
        const res = await VideoThumbnails.getThumbnailAsync(url, { time: 300 });
        const newThumb = (res?.uri ?? "").trim();
        if (newThumb.length > 0) {
          setThumbs((p) => ({ ...p, [url]: newThumb }));

          // write back so it survives refresh (on deleted list)
          setProfile((p: any) => {
            const next = (p.deletedVideoLibrary ?? []).map((v: LibraryVideo) => {
              if ((v.url ?? "").trim() !== url) return v;
              return { ...v, thumbnailUrl: newThumb };
            });
            return { ...p, deletedVideoLibrary: next };
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        for (const item of deletedItems.slice(0, 30)) {
          if (cancelled) return;
          await getThumbIfNeeded(item);
        }
      })();

      return () => {
        cancelled = true;
        setSelectedUrls(new Set());
        setSaving(false);
      };
    }, [deletedItems, getThumbIfNeeded])
  );

  const selectedCount = selectedUrls.size;
  const canRecover = selectedCount > 0 && !saving;
  const canDeleteForever = selectedCount > 0 && !saving;

// Backend call: recover selected videos (moves them from deleted -> active library server-side).
  async function recoverVideosOnBackend(args: { s3Keys: string[] }) {
    if (!accessToken) throw new Error("Missing access token");
    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/recover-video`;

    const doFetch = async (authHeader: string) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ s3_keys: args.s3Keys }),
      });
      const text = await res.text().catch(() => "");
      return { res, text };
    };

    let { res, text } = await doFetch(`Bearer ${accessToken}`);
    if (res.status === 401) ({ res, text } = await doFetch(accessToken));

    if (!res.ok) {
      let msg = text;
      try {
        const parsed = text ? JSON.parse(text) : null;
        msg = parsed?.message ?? parsed?.error ?? parsed?.Message ?? msg;
      } catch {}
      throw new Error(`Recover failed (${res.status}). ${msg || "No response body"}`);
    }

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  // Backend call: permanently delete selected videos (irreversible).
  async function deleteForeverOnBackend(args: { s3Keys: string[] }) {
    if (!accessToken) throw new Error("Missing access token");
    const url = `${aws_config.apiBaseUrl.replace(/\/$/, "")}/delete-video-forever`;

    const doFetch = async (authHeader: string) => {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ s3_keys: args.s3Keys }),
      });
      const text = await res.text().catch(() => "");
      return { res, text };
    };

    let { res, text } = await doFetch(`Bearer ${accessToken}`);
    if (res.status === 401) ({ res, text } = await doFetch(accessToken));

    if (!res.ok) {
      let msg = text;
      try {
        const parsed = text ? JSON.parse(text) : null;
        msg = parsed?.message ?? parsed?.error ?? parsed?.Message ?? msg;
      } catch {}
      throw new Error(`Delete forever failed (${res.status}). ${msg || "No response body"}`);
    }

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  // Toggle selection for a deleted video by URL (multi-select stored as a Set for fast add/remove).
  const onToggle = useCallback((url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }, []);

  // Confirm + recover selected videos, then optimistically move them into `profile.videoLibrary` locally.
  const doRecover = useCallback(() => {
    if (!canRecover) return;

    const selected = deletedItems.filter((x) => selectedUrls.has(x.url));
    const s3Keys = selected
      .map((x) => (x.s3Key ?? "").trim() || deriveS3KeyFromUrl(x.url))
      .filter(Boolean);

    if (s3Keys.length === 0) {
      Alert.alert("Can't recover", "Missing s3Key for selected videos.");
      return;
    }

    Alert.alert("Recover videos?", `Recover ${selected.length} video(s) back to your library?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Recover",
        onPress: async () => {
          setSaving(true);
          try {
            await recoverVideosOnBackend({ s3Keys });

            // optimistic local move: deletedVideoLibrary -> videoLibrary
            setProfile((p: any) => {
              const deleted = p.deletedVideoLibrary ?? [];
              const keepDeleted: LibraryVideo[] = [];
              const toRestore: LibraryVideo[] = [];

              for (const v of deleted) {
                const url = (v.url ?? "").trim();
                if (selectedUrls.has(url)) toRestore.push(v);
                else keepDeleted.push(v);
              }

              const nextLibrary = [...(p.videoLibrary ?? []), ...toRestore];

              return {
                ...p,
                deletedVideoLibrary: keepDeleted,
                videoLibrary: nextLibrary,
              };
            });

            setSelectedUrls(new Set());
            Alert.alert("Recovered", "Video(s) restored to your library.");
          } catch (e: any) {
            Alert.alert("Recover failed", e?.message ?? "Unknown error");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [canRecover, deletedItems, selectedUrls, setProfile]);

  // Confirm + permanently delete selected videos, then optimistically remove them from `deletedVideoLibrary` locally.
  const doDeleteForever = useCallback(() => {
    if (!canDeleteForever) return;

    const selected = deletedItems.filter((x) => selectedUrls.has(x.url));
    const s3Keys = selected
      .map((x) => (x.s3Key ?? "").trim() || deriveS3KeyFromUrl(x.url))
      .filter(Boolean);

    if (s3Keys.length === 0) {
      Alert.alert("Can't delete", "Missing s3Key for selected videos.");
      return;
    }

    Alert.alert(
      "Delete forever?",
      `This permanently deletes ${selected.length} video(s). This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await deleteForeverOnBackend({ s3Keys });

              // optimistic local remove from deleted list
              setProfile((p: any) => {
                const nextDeleted = (p.deletedVideoLibrary ?? []).filter((v: LibraryVideo) => {
                  const url = (v.url ?? "").trim();
                  return !selectedUrls.has(url);
                });
                return { ...p, deletedVideoLibrary: nextDeleted };
              });

              setSelectedUrls(new Set());
              Alert.alert("Deleted", "Video(s) permanently deleted.");
            } catch (e: any) {
              Alert.alert("Delete failed", e?.message ?? "Unknown error");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [canDeleteForever, deletedItems, selectedUrls, setProfile]);

  const renderItem = ({ item }: { item: RecoveryItem }) => {
    const isSelected = selectedUrls.has(item.url);
    const thumbUri = thumbs[item.url] ?? item.thumbnailUrl ?? "";

    return (
      <VideoTile
        item={item}
        size={tileSize}
        selected={isSelected}
        onPress={() => {
          if (saving) return;
          onToggle(item.url);
        }}
        getThumbIfNeeded={getThumbIfNeeded}
        thumbUri={thumbUri}
        loading={thumbLoading[item.url]}
      />
    );
  };

  const ListEmpty = (
    <View style={{ height: 500, alignItems: "center", justifyContent: "center" }}>
      <Text style={dmMonoLight({ opacity: 0.6 })}>No deleted videos.</Text>
    </View>
  );

  const BAR_BG = "#202020";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Top bar: back + title + refresh icon */}
      <View style={{ height: 52, justifyContent: "center", paddingHorizontal: 12 }}>
        {/* Back */}
        <Pressable
          onPress={() => router.replace("/(homeUser)/video-library")}
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
          disabled={saving || refreshing}
        >
          <Text
            pointerEvents="none"
            style={lexendLight({
              fontSize: 16,
              opacity: saving || refreshing ? 0.5 : 1,
            })}
          >
            ‹ Back
          </Text>
        </Pressable>

        {/* Title */}
        <Text style={lexendLight({ textAlign: "center", fontSize: 14, opacity: 0.7 })}>
          Recovery
        </Text>

        {/* Refresh icon */}
        <Pressable
          onPress={() => {
            if (saving || refreshing) return;
            refreshFromBackend();
          }}
          hitSlop={10}
          style={{ position: "absolute", right: 15, paddingVertical: 8, paddingHorizontal: 8 }}
          disabled={saving || refreshing}
        >
          <Text style={lexendRegular({ fontSize: 18, opacity: saving || refreshing ? 0.4 : 0.9 })}>
            ↻
          </Text>
        </Pressable>
      </View>

      {/* ✅ Full-page pull-to-refresh (works even when list is empty) */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshFromBackend} />}
      >
        {deletedItems.length === 0 ? (
          ListEmpty
        ) : (
          <FlatList
            data={deletedItems}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            scrollEnabled={false} // ✅ FlatList becomes "content" inside ScrollView
            getItemLayout={(_, index) => ({
              length: tileSize,
              offset: tileSize * Math.floor(index / 3),
              index,
            })}
          />
        )}
      </ScrollView>

      {/* Bottom oval bar: Delete forever (left) + Recover (right) */}
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
        <Pressable
          onPress={doDeleteForever}
          disabled={!canDeleteForever}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: canDeleteForever ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
          }}
        >
          <Text
            style={lexendLight({
              color: canDeleteForever ? "#FEFEFE" : "rgba(255,255,255,0.5)",
              fontSize: 12,
            })}
          >
            {saving ? "Working..." : "Delete forever"}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={doRecover}
          disabled={!canRecover}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: canRecover ? "#FEFEFE" : "rgba(255,255,255,0.25)",
          }}
        >
          <Text
            style={lexendLight({
              color: canRecover ? "#202020" : "rgba(255,255,255,0.6)",
              fontSize: 12,
            })}
          >
            {saving ? "Working..." : `Recover${selectedCount ? ` (${selectedCount})` : ""}`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}