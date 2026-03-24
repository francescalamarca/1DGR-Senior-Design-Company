// src/features/profile/edit/profileEdit.media.ts
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { File, Paths } from "expo-file-system";
import { aws_config } from "@/constants/aws-config";

const REMOVE_BG_API_KEY = "17BU2EgBRKZX1jwpF7VYnfBv";

type AlertFn = (title: string, msg: string) => void;

const defaultAlert: AlertFn = (title, msg) => Alert.alert(title, msg);

export function buildCdnUrlFromKey(keyOrUrl: string) {
  if (!keyOrUrl) return "";
  if (keyOrUrl.includes("://")) return keyOrUrl;

  const domain =
    (aws_config as any)?.cloudFrontDomain ||
    (aws_config as any)?.cloudfrontDomain ||
    (aws_config as any)?.cdnBaseUrl ||
    "";

  if (!domain) return keyOrUrl;
  const base = domain.includes("://") ? domain : `https://${domain}`;
  return `${base.replace(/\/$/, "")}/${keyOrUrl.replace(/^\/+/, "")}`;
}

export async function ensureMediaLibraryPermission(alertFn: AlertFn = defaultAlert) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    alertFn("Permission needed", "Please allow photo library access to pick media.");
    return false;
  }
  return true;
}

export async function pickVideoFromLibrary(alertFn: AlertFn = defaultAlert): Promise<string | null> {
  const ok = await ensureMediaLibraryPermission(alertFn);
  if (!ok) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsEditing: false,
    quality: 1,
  });

  if (res.canceled) return null;
  return res.assets?.[0]?.uri ?? null;
}

export async function pickImageFromLibrary(alertFn: AlertFn = defaultAlert): Promise<string | null> {
  const ok = await ensureMediaLibraryPermission(alertFn);
  if (!ok) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 1,
  });

  if (res.canceled) return null;
  return res.assets?.[0]?.uri ?? null;
}

export async function generateThumbnails(videoUri: string) {
  const seconds = [0, 0.5, 1.0, 1.5, 2.0, 3.0];
  const out: string[] = [];

  for (const t of seconds) {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: Math.floor(t * 1000) });
      if (uri) out.push(uri);
    } catch {}
  }

  return Array.from(new Set(out));
}

/**
 * Calls the remove.bg API with either a local file URI or a remote image URL,
 * saves the processed PNG to the device cache, and returns the local URI.
 * Pass the returned URI straight into uploadToS3.
 */
export async function removeBackgroundAndSave(args: {
  localUri?: string;
  imageUrl?: string;
}): Promise<string | null> {
  const { localUri, imageUrl } = args;

  const formData = new FormData();
  if (localUri) {
    // React Native FormData accepts a plain object for file parts
    formData.append("image_file", { uri: localUri, type: "image/png", name: "logo.png" } as any);
  } else if (imageUrl) {
    formData.append("image_url", imageUrl);
  } else {
    return null;
  }
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": REMOVE_BG_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`remove.bg failed: ${response.statusText}`);
  }

  // Convert response to base64 so expo-file-system can write it
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const base64 = btoa(binary);

  const tempFile = new File(Paths.cache, `logo_nobg_${Date.now()}.png`);
  tempFile.write(base64, { encoding: "base64" });
  return tempFile.uri;
}

export async function uploadToS3(args: {
  localUri: string;
  type: "image" | "video";
  accessToken: string;
}): Promise<string | null> {
  const { localUri, type, accessToken } = args;

  try {
    if (!accessToken) throw new Error("No access token");

    const ext = localUri.split(".").pop()?.toLowerCase();
    let contentType = type === "video" ? "video/mp4" : "image/jpeg";
    if (type === "video" && ext === "mov") contentType = "video/quicktime";
    if (type === "image" && ext === "png") contentType = "image/png";
    if (type === "image" && ext === "heic") contentType = "image/heic";

    const urlRes = await fetch(
      `${aws_config.apiBaseUrl}/upload-video?contentType=${encodeURIComponent(contentType)}`,
      { headers: { Authorization: accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}` } }
    );
    if (!urlRes.ok) throw new Error("Failed to get upload URL");

    const { uploadUrl, key } = await urlRes.json();

    const fileRes = await fetch(localUri);
    const blob = await fileRes.blob();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });

    if (uploadRes.status !== 200) throw new Error("Failed to upload to S3");
    return key;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}