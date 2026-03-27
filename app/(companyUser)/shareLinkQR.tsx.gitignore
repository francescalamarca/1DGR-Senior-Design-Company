/**
 * ShareLinkQRCode
 * - Renders a QR code for a share-link URL (react-native-qrcode-svg).
 * - Optional "card" wrapper (border/padding/background) can be disabled via `borderless`.
 * - Optional tap-to-copy behavior can be disabled via `pressable=false`.
 */
import React, { useCallback, useEffect, useRef } from "react";
import { View, Pressable, Alert, Platform } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";

type Props = {
  url: string;
  size?: number;
  disabled?: boolean;

  /** Removes the border/padding/background wrapper around the QR. */
  borderless?: boolean;

  /** If false, QR renders as non-tappable (no copy). Default true. */
  pressable?: boolean;
  /** Optional token; when it changes, auto-copies the QR image. */
  copyOnToken?: number;
};

export function shareLinkQR({
  url,
  size = 72,
  disabled,
  borderless = false,
  pressable = true,
  copyOnToken,
}: Props) {
  const qrRef = useRef<any>(null);

  const copyQrToClipboard = useCallback(async () => {
    if (disabled) return;

    if (Platform.OS === "web") {
      try {
        await Clipboard.setStringAsync(url);
        Alert.alert("Copied", "QR link copied to clipboard.");
      } catch {
        Alert.alert("Error", "Could not copy QR link.");
      }
      return;
    }

    try {
      qrRef.current?.toDataURL(async (base64: string) => {
        await Clipboard.setImageAsync(base64); // expects raw base64
        Alert.alert("Copied", "QR code copied as image.");
      });
    } catch {
      Alert.alert("Error", "Could not copy QR code.");
    }
  }, [disabled, url]);

  const Wrapper = pressable ? Pressable : View;
  const wrapperProps = pressable
    ? { onPress: copyQrToClipboard, disabled }
    : {};

  useEffect(() => {
    if (copyOnToken === undefined || disabled) return;
    const timer = setTimeout(() => {
      void copyQrToClipboard();
    }, 30);
    return () => clearTimeout(timer);
  }, [copyOnToken, disabled, copyQrToClipboard]);

  return (
    <Wrapper {...(wrapperProps as any)}>
      <View
        style={[
          !borderless && {
            padding: 6,
            borderWidth: 1,
            borderRadius: 8,
            backgroundColor: "white",
          },
          { opacity: disabled ? 0.4 : 1 },
        ]}
      >
        <QRCode value={url} size={size} getRef={(ref) => (qrRef.current = ref)} />
      </View>
    </Wrapper>
  );
}
