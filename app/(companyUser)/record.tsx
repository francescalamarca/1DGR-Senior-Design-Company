/**
 * Camera Tab Launcher
 * - Acts as a prompt hub for recording flows.
 * - Each prompt button deep-links into camera-ui at a specific question.
 */

import KeyboardScreen from "@/src/components/KeyboardScreen";
import { useDynColors } from "@/src/state/theme-colors";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  CAMERA_PROMPTS,
  CAMERA_PROMPT_DESCRIPTIONS,
} from "../../constants/camera-prompts"; //moved this to constants because that is what they are - modular

const FONTS = {
  LEXEND_REGULAR: "Lexend-Regular",
  DMMONO_LIGHT: "DMMono-Light",
} as const;

export default function CameraScreen() {
  const COLORS = useDynColors();
  const [showTips, setShowTips] = useState(false);
  const promptDescriptions = CAMERA_PROMPT_DESCRIPTIONS ?? [];

  return (
    <KeyboardScreen
      scroll
      backgroundColor={COLORS.bg}
      safeAreaEdges={["top", "left", "right"]}
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FONTS.LEXEND_REGULAR,
              fontSize: 32,
              color: COLORS.text,
            }}
          >
            Recording Studio
          </Text>
          <Text
            style={{
              fontFamily: FONTS.DMMONO_LIGHT,
              fontSize: 20,
              color: COLORS.subtext,
              marginTop: 6,
            }}
          >
            Pick a prompt to start.
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(companyUser)/video-library",
              params: { returnTo: "/(companyUser)/record" },
            })
          }
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: COLORS.text,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 8,
            alignItems: "center",
            backgroundColor: COLORS.card,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.LEXEND_REGULAR,
              fontSize: 12,
              color: COLORS.text,
            }}
          >
            Video Library
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: 16 }}>
        <Pressable
          onPress={() => setShowTips((v) => !v)}
          style={{
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 12,
            backgroundColor: COLORS.card,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.LEXEND_REGULAR,
              fontSize: 13,
              color: COLORS.text,
            }}
          >
            Guidance & Advice
          </Text>
          <Text
            style={{
              fontFamily: FONTS.LEXEND_REGULAR,
              fontSize: 16,
              color: COLORS.subtext,
            }}
          >
            {showTips ? "▾" : "▸"}
          </Text>
        </Pressable>

        {showTips ? (
          <View
            style={{
              marginTop: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 12,
              backgroundColor: COLORS.card,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 6,
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.DMMONO_LIGHT,
                fontSize: 11,
                color: COLORS.subtext,
              }}
            >
              1. Sit up straight and frame yourself from chest-up with your face
              centered.
            </Text>
            <Text
              style={{
                fontFamily: FONTS.DMMONO_LIGHT,
                fontSize: 11,
                color: COLORS.subtext,
              }}
            >
              2. Use bright front lighting and reduce background noise.
            </Text>
            <Text
              style={{
                fontFamily: FONTS.DMMONO_LIGHT,
                fontSize: 11,
                color: COLORS.subtext,
              }}
            >
              3. Keep answers focused: intro, one example, clear takeaway.
            </Text>
            <Text
              style={{
                fontFamily: FONTS.DMMONO_LIGHT,
                fontSize: 11,
                color: COLORS.subtext,
              }}
            >
              4. Speak naturally, pause between points, and smile at the end.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: 10, gap: 8 }}>
        {CAMERA_PROMPTS.map(
          (
            prompt,
            idx, //called from the camera-prompts.ts file
          ) => (
            <Pressable
              key={`${idx}_${prompt}`}
              onPress={() =>
                router.push({
                  pathname: "/(companyUser)/camera-ui",
                  params: {
                    promptIndex: String(idx),
                    returnTo: "/(companyUser)/record",
                  },
                })
              }
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                backgroundColor: COLORS.card,
                paddingHorizontal: 12,
                paddingVertical: 9,
                gap: 5,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.DMMONO_LIGHT,
                  fontSize: 11,
                  color: COLORS.accent,
                }}
              >
                PROMPT {idx + 1}
              </Text>

              <Text
                numberOfLines={2}
                style={{
                  fontFamily: FONTS.LEXEND_REGULAR,
                  fontSize: 13.5,
                  color: COLORS.text,
                }}
              >
                {prompt}
              </Text>

              <Text
                style={{
                  fontFamily: FONTS.DMMONO_LIGHT,
                  fontSize: 10.5,
                  color: COLORS.subtext,
                  lineHeight: 15,
                }}
              >
                {promptDescriptions[idx] ?? "Tap to record."}
              </Text>

              <Text
                style={{
                  fontFamily: FONTS.DMMONO_LIGHT,
                  fontSize: 10.5,
                  color: COLORS.subtext,
                }}
              >
                Tap to record
              </Text>
            </Pressable>
          ),
        )}
      </View>
    </KeyboardScreen>
  );
}
