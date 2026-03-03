/**
 * Recording Studio Screen
 * - Displays a recorded video preview and lightweight “edit” controls (filter overlay + tool modes).
 * - Lets user set a caption and choose a thumbnail (auto-generate from video or pick a custom image).
 * - Uploads video + thumbnail to S3 via backend signed URL, then saves metadata to the API.
 * - On success, prepends the new item into local profile.videoLibrary and routes to Video Library.
 */
import { useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import Slider from "@react-native-community/slider";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useProfile } from "@/src/features/profile/profile.store";
import { useSession } from "@/src/state/session";
import { aws_config } from "../../constants/aws-config";
import type { LibraryVideo } from "@/src/features/profile/profile.types";

type CategoryKey = "none" | "filter" | "tools";
type FilterKey = "default" | "f2" | "f3" | "f4";
type ToolKey = "none" | "blur" | "crop" | "sharpen";
type BlurMode = "off" | "circle" | "rect" | "spotlight";

// ✅ Fonts (must match the names you registered in your font loader)
const FONT_LEXEND_REGULAR = "Lexend-Regular" as const;
const FONT_CRIMSON_REGULAR = "CrimsonText-Regular" as const; // <-- change if your name differs

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "f2", label: "Filter 2" },
  { key: "f3", label: "Filter 3" },
  { key: "f4", label: "Filter 4" },
];

const TOOLS: { key: Exclude<ToolKey, "none">; label: string }[] = [
  { key: "blur", label: "Blur" },
  { key: "crop", label: "Crop" },
  { key: "sharpen", label: "Sharpen" },
];

// Extract an S3 object key from either a raw key string or a full URL.
function extractS3KeyFromMaybeUrl(urlOrKey: string) {
  if (!urlOrKey) return "";
  if (!urlOrKey.includes("://")) return urlOrKey;
  try {
    const u = new URL(urlOrKey);
    return (u.pathname || "").replace(/^\/+/, "");
  } catch {
    return "";
  }
}

// Convert an S3 key into a CDN URL (or pass-through if already a URL).
function buildCdnUrlFromKey(keyOrUrl: string) {
  if (!keyOrUrl) return "";
  if (keyOrUrl.includes("://")) return keyOrUrl;

  const base =
    (aws_config as any)?.cloudfrontBaseUrl ||
    (aws_config as any)?.cdnBaseUrl ||
    (aws_config as any)?.mediaBaseUrl ||
    "";

  if (!base) return keyOrUrl;
  return `${String(base).replace(/\/$/, "")}/${String(keyOrUrl).replace(
    /^\/+/,
    ""
  )}`;
}

export default function RecordingStudioScreen() {
  const params = useLocalSearchParams<{ uri?: string; prompt?: string }>();
  const uriStr = typeof params.uri === "string" ? params.uri : "";

  const { accessToken } = useSession();
  const { setProfile } = useProfile();
  const videoRef = useRef<Video>(null);

  const promptText = useMemo(() => {
    const p = typeof params.prompt === "string" ? params.prompt : "";
    return p.trim();
  }, [params.prompt]);

  const [category, setCategory] = useState<CategoryKey>("none");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("default");
  const [activeTool, setActiveTool] = useState<ToolKey>("none");
  const [filterStrength, setFilterStrength] = useState(0.5);
  const [sharpen, setSharpen] = useState(0);
  const [blurMode, setBlurMode] = useState<BlurMode>("off");

  const [caption, setCaption] = useState(promptText);
  const [uploading, setUploading] = useState(false);

  // ✅ Thumbnail state
  const [thumbLocalUri, setThumbLocalUri] = useState<string>("");
  const [thumbPicked, setThumbPicked] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);

  // ✅ True-to-size video
  const [videoAspect, setVideoAspect] = useState<number>(9 / 16); // fallback

  // ✅ Scroll-to-caption support
  const scrollRef = useRef<ScrollView>(null);
  const [captionY, setCaptionY] = useState(0);
  const { height: SCREEN_H } = Dimensions.get("window");

  // ✅ Reset thumbnail whenever this screen becomes active again
  // (fixes the "old thumbnail still showing" issue when you record again)
  useFocusEffect(
    useCallback(() => {
      setThumbLocalUri("");
      setThumbPicked(false);
      setThumbBusy(false);
      return () => {};
    }, [uriStr])
  );

  const overlayStyle = useMemo(() => {
    if (category !== "filter" || activeFilter === "default") {
      return { backgroundColor: "transparent", opacity: 0 };
    }

    switch (activeFilter) {
      case "f2":
        return {
          backgroundColor: "rgba(255, 220, 120, 0.18)",
          opacity: filterStrength,
        };
      case "f3":
        return {
          backgroundColor: "rgba(120, 200, 255, 0.16)",
          opacity: filterStrength,
        };
      case "f4":
        return {
          backgroundColor: "rgba(40, 40, 40, 0.18)",
          opacity: filterStrength,
        };
      default:
        return { backgroundColor: "transparent", opacity: 0 };
    }
  }, [category, activeFilter, filterStrength]);

  // Toggle between Filter/Tools categories; resets tool state when closing or switching.
  function toggleCategory(next: Exclude<CategoryKey, "none">) {
    setCategory((prev) => {
      const nextVal = prev === next ? "none" : next;

      if (nextVal === "none") {
        setActiveTool("none");
        setBlurMode("off");
      } else {
        setActiveTool("none");
      }

      return nextVal;
    });
  }

  // Save a local video file to the device camera roll (best-effort).
  async function saveToCameraRoll(localUri: string) {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission denied for Photos / Media Library.");
    }
    await MediaLibrary.saveToLibraryAsync(localUri);
  }

  // Ask for photo library permission (needed for picking a custom thumbnail).
  async function ensureMediaPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return false;
    }
    return true;
  }

// Generate a thumbnail frame from the recorded video and store it as the selected thumbnail.
  const generateThumbFromVideo = useCallback(async () => {
    if (!uriStr) return;
    try {
      setThumbBusy(true);
      const res = await VideoThumbnails.getThumbnailAsync(uriStr, {
        time: 1000,
        quality: 0.7,
      });
      if (res?.uri) {
        setThumbLocalUri(res.uri);
        setThumbPicked(false);
      }
    } catch (e) {
      console.error("[thumb] generate error:", e);
      Alert.alert("Thumbnail failed", "Could not generate a thumbnail.");
    } finally {
      setThumbBusy(false);
    }
  }, [uriStr]);

// Open the image picker to let user choose a custom thumbnail.
  const pickCustomThumb = useCallback(async () => {
    const ok = await ensureMediaPermission();
    if (!ok) return;

    try {
      setThumbBusy(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (res.canceled) return;

      const picked = res.assets?.[0]?.uri ?? "";
      if (!picked) return;

      setThumbLocalUri(picked);
      setThumbPicked(true);
    } finally {
      setThumbBusy(false);
    }
  }, []);

  // ✅ Shared button styles (rounded)
  const buttonBox = (active: boolean) => ({
    borderWidth: 1,
    borderColor: active ? "#222" : "#777",
    backgroundColor: active ? "white" : "transparent",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minWidth: 80,
  });

  // ✅ Back-arrow button box (same height as buttons)
  const iconButtonBox = {
    borderWidth: 1,
    borderColor: "#777",
    backgroundColor: "transparent",
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  // ✅ Text helpers
  const crimson = (extra?: any) => ({
    fontFamily: FONT_CRIMSON_REGULAR,
    color: "#202020",
    ...extra,
  });

  const lexend = (extra?: any) => ({
    fontFamily: FONT_LEXEND_REGULAR,
    color: "#202020",
    ...extra,
  });


// Scroll the view so the caption input is comfortably visible above the keyboard.
  function onCaptionFocus() {
    const targetY = Math.max(0, captionY - SCREEN_H * 0.25);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }

  // Upload video + thumbnail to S3, then POST metadata to backend and update local store.
  async function handleUpload() {
    try {
      setUploading(true);
      if (!accessToken) throw new Error("No access token found.");

      const uploadToS3 = async (localUri: string, type: "video" | "image") => {
        const ext = localUri.split(".").pop()?.toLowerCase();

        let contentType = "application/octet-stream";
        if (type === "video") {
          contentType = ext === "mov" ? "video/quicktime" : "video/mp4";
        } else {
          contentType = "image/jpeg";
        }

        const urlRes = await fetch(
          `${aws_config.apiBaseUrl}/upload-video?contentType=${contentType}`,
          { headers: { Authorization: accessToken } }
        );

        if (!urlRes.ok)
          throw new Error(`Get Upload URL Failed: ${urlRes.status}`);

        const { uploadUrl, key } = await urlRes.json();
        const fileData = await fetch(localUri);
        const blob = await fileData.blob();

        const s3Res = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: blob,
        });

        if (!s3Res.ok) throw new Error(`Failed to upload ${type} to S3`);
        return key as string;
      };

      // Save to camera roll (best-effort)
      if (uriStr) {
        try {
          await saveToCameraRoll(uriStr);
        } catch {}
      }

      // Ensure we have a thumbnail
      let thumbUriToUpload = thumbLocalUri;
      if (!thumbUriToUpload) {
        const res = await VideoThumbnails.getThumbnailAsync(uriStr, {
          time: 1000,
          quality: 0.7,
        });
        thumbUriToUpload = res?.uri ?? "";
      }
      if (!thumbUriToUpload)
        throw new Error("Could not generate a thumbnail. Try again.");

      // Upload both
      const [videoKey, thumbKey] = await Promise.all([
        uploadToS3(uriStr, "video"),
        uploadToS3(thumbUriToUpload, "image"),
      ]);

      if (!videoKey || !thumbKey)
        throw new Error("Failed to upload video or thumbnail to S3");

      // Save Metadata
      const titleToSend = caption.trim() || promptText || "New video";

      const saveRes = await fetch(
        `${aws_config.apiBaseUrl}/save-video-metadata`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken,
          },
          body: JSON.stringify({
            s3_key: videoKey,
            thumbnail_key: thumbKey,
            title: titleToSend,
          }),
        }
      );

      if (!saveRes.ok)
        throw new Error(`Failed to save metadata: ${saveRes.status}`);

      const saveData = await saveRes.json();
      const backendVideo = saveData.video;

      const newLibraryItem: LibraryVideo = {
        id: backendVideo.id || String(Date.now()),
        url: backendVideo.url || buildCdnUrlFromKey(videoKey),
        s3Key: backendVideo.s3_key || extractS3KeyFromMaybeUrl(videoKey),
        thumbnailUrl: backendVideo.thumbnailUrl || buildCdnUrlFromKey(thumbKey),
        thumbnailS3Key:
          backendVideo.thumbnail_s3_key || extractS3KeyFromMaybeUrl(thumbKey),
        caption: titleToSend,
        source: "recording-studio",
        createdAt: Date.now(),
      };

      setProfile((p) => ({
        ...p,
        videoLibrary: [newLibraryItem, ...(p.videoLibrary ?? [])],
      }));

      Alert.alert("Uploaded", "Video + thumbnail saved successfully!");
      router.replace("/(companyUser)/video-library");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Upload failed", e?.message ?? "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  if (!uriStr) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f3f3" }}>
        <View style={{ padding: 16 }}>
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={lexend({ fontSize: 14, letterSpacing: 1.2 })}>
              VIDEO EDIT STUDIO
            </Text>
          </View>

          <Text style={crimson({ marginTop: 10 })}>
            No video URI was provided. Go back and record a video first.
          </Text>

          <Pressable
            onPress={() => router.replace("/(companyUser)/camera-ui")}
            style={{
              marginTop: 14,
              borderWidth: 1,
              borderColor: "#222",
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: "white",
            }}
          >
            <Text style={lexend({ fontSize: 16 })}>Back to Camera</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#eeeeee" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 18,
            paddingBottom: 140,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ Centered header */}
          <View
            style={{ alignItems: "center", paddingTop: 6, paddingBottom: 8 }}
          >
            <Text
              style={lexend({
                fontSize: 14,
                letterSpacing: 1.2,
                opacity: 0.9,
              })}
            >
              VIDEO EDIT STUDIO
            </Text>
          </View>

          {/* Video */}
          <View
            style={{
              marginTop: 6,
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#cfcfcf",
              padding: 10,
              borderRadius: 14,
            }}
          >
            {/* ✅ MUCH smaller, centered preview */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 200, // 🔥 HARD SIZE (small)
                  maxWidth: 260,
                  aspectRatio: videoAspect,
                  backgroundColor: "#000",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <Video
                  ref={videoRef}
                  source={{ uri: uriStr }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  isLooping
                  onPlaybackStatusUpdate={(status: any) => {
                    if (!status?.isLoaded) return;

                    const w = status?.naturalSize?.width;
                    const h = status?.naturalSize?.height;

                    if (
                      typeof w === "number" &&
                      typeof h === "number" &&
                      h > 0
                    ) {
                      const ar = w / h;
                      setVideoAspect((prev) =>
                        Math.abs(prev - ar) > 0.01 ? ar : prev
                      );
                    }
                  }}
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    ...overlayStyle,
                  }}
                />
              </View>
            </View>
          </View>

          {/* ✅ NEW BUTTON FLOW: single row that swaps based on category / tool */}
          <View style={{ marginTop: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ width: "100%" }}
              contentContainerStyle={{
                gap: 10,
                alignItems: "center",
                paddingHorizontal: 12,
                justifyContent: category === "none" ? "center" : "flex-start",
                flexGrow: 1,
              }}
            >
              {category === "none" ? (
                <>
                  <Pressable
                    onPress={() => toggleCategory("filter")}
                    style={buttonBox(false)}
                  >
                    <Text style={lexend({ fontSize: 13 })}>Filter</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => toggleCategory("tools")}
                    style={buttonBox(false)}
                  >
                    <Text style={lexend({ fontSize: 13 })}>Tools</Text>
                  </Pressable>
                </>
              ) : category === "filter" ? (
                <>
                  <Pressable
                    onPress={() => {
                      setCategory("none");
                      setActiveTool("none");
                      setBlurMode("off");
                    }}
                    style={iconButtonBox}
                  >
                    <Text style={lexend({ fontSize: 18, lineHeight: 18 })}>
                      ‹
                    </Text>
                  </Pressable>

                  {FILTERS.map((f) => {
                    const active = f.key === activeFilter;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => setActiveFilter(f.key)}
                        style={buttonBox(active)}
                      >
                        <Text style={lexend({ fontSize: 13 })}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : activeTool === "blur" ? (
                <>
                  <Pressable
                    onPress={() => {
                      setActiveTool("none");
                      setBlurMode("off");
                    }}
                    style={iconButtonBox}
                  >
                    <Text style={lexend({ fontSize: 18, lineHeight: 18 })}>
                      ‹
                    </Text>
                  </Pressable>

                  {(["off", "circle", "rect", "spotlight"] as const).map(
                    (mode) => {
                      const label =
                        mode === "off"
                          ? "Off"
                          : mode === "rect"
                          ? "Rectangle"
                          : mode === "circle"
                          ? "Circle"
                          : "Spotlight";

                      const active = blurMode === mode;

                      return (
                        <Pressable
                          key={mode}
                          onPress={() => setBlurMode(mode)}
                          style={buttonBox(active)}
                        >
                          <Text style={lexend({ fontSize: 13 })}>{label}</Text>
                        </Pressable>
                      );
                    }
                  )}
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      setCategory("none");
                      setActiveTool("none");
                      setBlurMode("off");
                    }}
                    style={iconButtonBox}
                  >
                    <Text style={lexend({ fontSize: 18, lineHeight: 18 })}>
                      ‹
                    </Text>
                  </Pressable>

                  {TOOLS.map((t) => {
                    const active = t.key === activeTool;
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() =>
                          setActiveTool((prev) =>
                            prev === t.key ? "none" : t.key
                          )
                        }
                        style={buttonBox(active)}
                      >
                        <Text style={lexend({ fontSize: 13 })}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>

          {/* Filter strength (unchanged) */}
          {category === "filter" && activeFilter !== "default" && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={crimson({
                  fontSize: 13,
                  opacity: 0.7,
                  marginBottom: 6,
                })}
              >
                Filter Strength: {Math.round(filterStrength * 100)}
              </Text>
              <Slider
                value={filterStrength}
                onValueChange={setFilterStrength}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
              />
            </View>
          )}

          {/* Tools: Sharpen slider (unchanged) */}
          {category === "tools" && activeTool === "sharpen" && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={crimson({
                  fontSize: 13,
                  opacity: 0.7,
                  marginBottom: 6,
                })}
              >
                Sharpen: {sharpen}
              </Text>
              <Slider
                value={sharpen}
                onValueChange={setSharpen}
                minimumValue={0}
                maximumValue={100}
                step={1}
              />
            </View>
          )}

          {/* Tools: Blur helper text + Crop helper text */}
          {category === "tools" && activeTool === "blur" && (
            <Text
              style={crimson({
                marginTop: 10,
                fontSize: 13,
                opacity: 0.6,
                textAlign: "center",
              })}
            >
              (Next step) Drag the blur shape on top of the video preview.
            </Text>
          )}

          {category === "tools" && activeTool === "crop" && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={crimson({
                  fontSize: 13,
                  opacity: 0.7,
                  textAlign: "center",
                })}
              >
                Crop mode will show a resizable frame over the video.
              </Text>
            </View>
          )}

          {/* ✅ THUMBNAIL CONTROLS */}
          <View
            style={{
              marginTop: 14,
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#cfcfcf",
              padding: 12,
              borderRadius: 14,
            }}
          >
            <Text
              style={crimson({
                fontSize: 13,
                opacity: 0.7,
                marginBottom: 10,
              })}
            >
              Thumbnail
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={pickCustomThumb}
                disabled={thumbBusy || uploading}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#222",
                  backgroundColor: "white",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  opacity: thumbBusy || uploading ? 0.6 : 1,
                  alignItems: "center",
                }}
              >
                <Text style={lexend({ fontSize: 15 })}>
                  {thumbBusy ? "Working..." : "Pick thumbnail"}
                </Text>
              </Pressable>

              <Pressable
                onPress={generateThumbFromVideo}
                disabled={thumbBusy || uploading}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#222",
                  backgroundColor: "white",
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  opacity: thumbBusy || uploading ? 0.6 : 1,
                  alignItems: "center",
                }}
              >
                <Text style={lexend({ fontSize: 15 })}>
                  {thumbBusy ? "Working..." : "Auto thumbnail"}
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 12 }}>
              {thumbLocalUri ? (
                <>
                  <Image
                    source={{ uri: thumbLocalUri }}
                    style={{
                      width: "100%",
                      height: 160,
                      backgroundColor: "#eee",
                      borderRadius: 12,
                    }}
                    resizeMode="cover"
                  />
                  <Text
                    style={crimson({
                      marginTop: 8,
                      fontSize: 12,
                      opacity: 0.6,
                    })}
                  >
                    {thumbPicked
                      ? "Custom thumbnail selected"
                      : "Auto thumbnail selected"}
                  </Text>
                </>
              ) : (
                <Text style={crimson({ opacity: 0.6, fontSize: 13 })}>
                  No thumbnail selected yet — upload will auto-generate one.
                </Text>
              )}
            </View>
          </View>

          {/* Caption */}
          <View
            onLayout={(e) => setCaptionY(e.nativeEvent.layout.y)}
            style={{
              marginTop: 14,
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: "#cfcfcf",
              padding: 12,
              minHeight: 90,
              borderRadius: 14,
            }}
          >
            <Text
              style={crimson({
                fontSize: 13,
                opacity: 0.7,
                marginBottom: 8,
              })}
            >
              Caption
            </Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              onFocus={onCaptionFocus}
              placeholder="Write a caption…"
              placeholderTextColor="#888"
              multiline
              style={{
                fontFamily: FONT_CRIMSON_REGULAR,
                fontSize: 16,
                minHeight: 60,
                textAlignVertical: "top",
                color: "#202020",
              }}
            />
          </View>
        </ScrollView>

        {/* Sticky bottom bar */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: Platform.OS === "ios" ? 22 : 12,
            backgroundColor: "#eeeeee",
            borderTopWidth: 1,
            borderTopColor: "#d6d6d6",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => router.replace("/(companyUser)/camera-ui")}
              disabled={uploading}
              style={{
                borderWidth: 1,
                borderColor: "#222",
                backgroundColor: "white",
                paddingVertical: 14,
                paddingHorizontal: 22,
                borderRadius: 16,
                opacity: uploading ? 0.7 : 1,
                minWidth: 130,
                alignItems: "center",
              }}
            >
              <Text style={lexend({ fontSize: 16 })}>Back</Text>
            </Pressable>

            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              style={{
                borderWidth: 1,
                borderColor: "#222",
                backgroundColor: "white",
                paddingVertical: 14,
                paddingHorizontal: 22,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                opacity: uploading ? 0.7 : 1,
                minWidth: 130,
                justifyContent: "center",
              }}
            >
              {uploading ? <ActivityIndicator /> : null}
              <Text style={lexend({ fontSize: 16 })}>
                {uploading ? "Uploading..." : "Upload"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}