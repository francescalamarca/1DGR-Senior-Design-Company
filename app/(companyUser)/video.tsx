/**
 * Video
 * - Full-screen video playback screen; receives a video `uri` (and optional `returnTo` + `returnScrollY`) via route params.
 * - Prefers native caching on iOS/Android (download to FileSystem cache) with safe fallback to streaming if caching fails.
 * - Manages playback lifecycle: auto-plays when a valid source is ready, disables looping, and pauses on unmount/close.
 * - Uses a deterministic close path: if `returnTo` is provided, always `router.replace()` there (avoids tab/back-stack misrouting).
 * - Shows loading/error/debug overlays to help diagnose source/caching issues.
 */
  import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState, useCallback } from "react";
import * as FileSystem from "expo-file-system";

const { width } = Dimensions.get("window");

export default function VideoScreen() {
  const params = useLocalSearchParams();

  const uri = typeof params.uri === "string" ? params.uri : undefined;
  const returnTo = typeof params.returnTo === "string" ? params.returnTo : undefined;
  const returnScrollY =
    typeof params.returnScrollY === "string" ? params.returnScrollY : undefined;

// Build a non-empty initial source so `useVideoPlayer` never receives an empty string.
  const initialSource = useMemo(() => uri ?? "about:blank", [uri]);

  const [videoSource, setVideoSource] = useState<string>(initialSource);
  const [loading, setLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);

  // ✅ Always a valid string
  const player = useVideoPlayer(videoSource);

  // Close handler: pause playback, then navigate deterministically (returnTo > back > profile fallback).
  const close = () => {
  try { player?.pause(); } catch {}

  // ✅ if returnTo exists, ALWAYS go there (do NOT router.back)
  if (returnTo) {
    router.replace({
      pathname: returnTo as any,
      params: returnScrollY ? { returnScrollY } : undefined,
    });
    return;
  }

  // fallback
  if (router.canGoBack()) router.back();
  else router.replace("/(companyUser)/profile");
};
// Keep player configured (no loop) once it's created.
  useEffect(() => {
    if (!player) return;
    player.loop = false;
  }, [player]);

  // Auto-play whenever we have a real video source (and not the "about:blank" placeholder).
  useEffect(() => {
    if (!player) return;
    if (!videoSource || videoSource === "about:blank") return;
    player.play();
  }, [player, videoSource]);

  // Prepare playback source:
// - Web: stream directly
// - Native: reuse cached file if present, otherwise download to cache; on any failure, fall back to streaming.
  useEffect(() => {
    if (!uri) return;

    let cancelled = false;

    const prepareVideo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Web: just stream
        if (Platform.OS === "web") {
          if (cancelled) return;
          setVideoSource(uri);
          setDebugMsg("Playing (Web)");
          return;
        }

        const FS: any = FileSystem;
        const cacheDir = FS.cacheDirectory || FS.documentDirectory;

        // If FS not available, stream directly
        if (!cacheDir) {
          if (cancelled) return;
          setVideoSource(uri);
          setDebugMsg("Playing (Stream)");
          return;
        }

        // ✅ Stable unique filename
        const safeName = encodeURIComponent(uri).replace(/%/g, "_");
        const localUri = `${cacheDir}${safeName}.mp4`;

        // Cached?
        const fileInfo = await FS.getInfoAsync(localUri);
        if (fileInfo.exists) {
          if (cancelled) return;
          setVideoSource(localUri);
          setDebugMsg("Playing (Cached)");
          return;
        }

        // Download
        const downloadResult = await FS.downloadAsync(uri, localUri);

        if (downloadResult.status === 200) {
          if (cancelled) return;
          setVideoSource(downloadResult.uri);
          setDebugMsg("Playing (Downloaded)");
        } else {
          throw new Error(`Download failed with status ${downloadResult.status}`);
        }
      } catch (e: any) {
        console.error("Video prep error:", e);
        if (cancelled) return;

        setError(e?.message || "Failed to load video");
        setDebugMsg(`Error: ${e?.message || "Unknown error"} (streaming fallback)`);

        // Last resort: stream
        setVideoSource(uri);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    prepareVideo();

    return () => {
      cancelled = true;
    };
  }, [uri]);

// Cleanup: ensure playback is paused when leaving the screen (prevents background audio).
  useEffect(() => {
    return () => {
      try {
        player?.pause();
      } catch {}
    };
  }, [player]);

  if (!uri) {
    return <ErrorView msg="No video URL provided" onClose={close} />;
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.debugText}>{debugMsg}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Text style={styles.debugText}>Trying to play anyway...</Text>
        </View>
      )}

      {/* ✅ Only render VideoView when we have a real source */}
      {videoSource && videoSource !== "about:blank" && (
        <VideoView
          style={styles.video}
          player={player}
          //allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />
      )}

      <Pressable onPress={close} style={styles.closeBtn}>
        <Text style={styles.btnText}>✕ Close</Text>
      </Pressable>

      <View style={styles.debugOverlay}>
        <Text style={styles.debugText}>{debugMsg}</Text>
        <Text style={[styles.debugText, { fontSize: 10, marginTop: 4 }]}>
          Status: {player?.status || "N/A"}
        </Text>
      </View>
    </View>
  );
}

// Small error-only UI used when route params are missing or invalid.
function ErrorView({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={{ color: "white", fontSize: 16, marginBottom: 20 }}>{msg}</Text>
      <Pressable onPress={onClose} style={styles.btn}>
        <Text style={styles.btnText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  video: { width: width, height: "100%" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  errorOverlay: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255,0,0,0.3)",
    padding: 15,
    borderRadius: 8,
    zIndex: 15,
  },
  errorText: { color: "white", fontSize: 14, fontWeight: "bold" },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 20,
  },
  btn: {
    marginTop: 20,
    backgroundColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "600" },
  debugOverlay: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 5,
  },
  debugText: { color: "yellow", fontSize: 12, fontWeight: "bold" },
});