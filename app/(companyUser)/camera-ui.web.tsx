/**
 * CameraUIScreen — Web
 * Uses browser MediaRecorder + getUserMedia instead of expo-camera.
 * Metro automatically picks this file over camera-ui.tsx on web builds.
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { CAMERA_PROMPTS } from "../../constants/camera-prompts";

const FONT_LEXEND_REGULAR = "Lexend-Regular" as const;
const { width } = Dimensions.get("window");
const PROMPTS = CAMERA_PROMPTS;

const MAX_SECONDS = 120;
const MAX_MS = MAX_SECONDS * 1000;

const RING_SIZE = 92;
const RING_STROKE = 4;
const R = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// Strip the `collapsable` prop that Animated adds — invalid on SVG DOM elements.
const SafeCircle = forwardRef<any, any>(({ collapsable: _c, ...props }, ref) => (
  <Circle {...props} ref={ref} />
));
const AnimatedCircle = Animated.createAnimatedComponent(SafeCircle);

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function CameraUIScreen() {
  const params = useLocalSearchParams<{
    returnTo?: string;
    promptIndex?: string;
  }>();

  const returnTo =
    typeof params.returnTo === "string" ? params.returnTo : undefined;

  const startPromptIndex = useMemo(() => {
    const raw =
      typeof params.promptIndex === "string" ? Number(params.promptIndex) : 0;
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(PROMPTS.length - 1, Math.floor(raw)));
  }, [params.promptIndex]);

  const [promptIndex, setPromptIndex] = useState(startPromptIndex);
  const prompt = PROMPTS[promptIndex];

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedPrompt, setRecordedPrompt] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Browser media refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Stable ref so the timer interval can call stopRecording without stale closure
  const stopRecordingRef = useRef<(() => void) | null>(null);

  // Animation
  const progress = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartMsRef = useRef<number | null>(null);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  function clearTimer() {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    recordingStartMsRef.current = null;
    setElapsedSec(0);
  }

  function stopProgressAnimation(resetToZero = false) {
    progressAnimRef.current?.stop();
    progressAnimRef.current = null;
    progress.stopAnimation();
    if (resetToZero) progress.setValue(0);
  }

  function startVisualTimer() {
    clearTimer();
    recordingStartMsRef.current = Date.now();
    setElapsedSec(0);

    tickIntervalRef.current = setInterval(() => {
      const start = recordingStartMsRef.current;
      if (!start) return;
      const ms = Date.now() - start;
      const sec = Math.min(MAX_SECONDS, ms / 1000);
      setElapsedSec(sec);
      if (ms >= MAX_MS) stopRecordingRef.current?.();
    }, 250);

    stopProgressAnimation(true);
    progressAnimRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: MAX_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressAnimRef.current.start();
  }

  function endVisualTimer({ reset }: { reset: boolean }) {
    clearTimer();
    stopProgressAnimation(reset);
  }

  // Start browser camera on mount
  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        if (mounted) setPermDenied(true);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Reset state when screen gains focus
  useFocusEffect(
    useCallback(() => {
      setIsRecording(false);
      setRecordedUri(null);
      setRecordedPrompt(null);
      setPromptIndex(startPromptIndex);
      endVisualTimer({ reset: true });

      return () => {
        if (recorderRef.current?.state !== "inactive") {
          recorderRef.current?.stop();
        }
        recorderRef.current = null;
        endVisualTimer({ reset: true });
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startPromptIndex])
  );

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    endVisualTimer({ reset: false });
  }

  // Keep ref in sync so the interval can call it
  stopRecordingRef.current = stopRecording;

  function startRecording() {
    if (!streamRef.current) {
      Alert.alert("Camera not ready", "Please wait for the camera to start.");
      return;
    }

    // Pick the best supported MIME type (Safari needs mp4)
    const mimeType =
      [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

    chunksRef.current = [];

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined
    );

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const type = mimeType.split(";")[0] || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      // Store MIME type in the URL hash so recording-studio can read it
      const url = URL.createObjectURL(blob) + "#" + encodeURIComponent(type);
      setRecordedUri(url);
    };

    recorderRef.current = recorder;
    recorder.start(100);

    setRecordedUri(null);
    setRecordedPrompt(prompt);
    setIsRecording(true);
    startVisualTimer();
  }

  function onRecordPress() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  function goBack() {
    router.replace((returnTo ?? "/(companyUser)/record") as any);
  }

  function nextPrompt() {
    if (isRecording || recordedUri) return;
    setPromptIndex((i) => Math.min(i + 1, PROMPTS.length - 1));
  }

  function prevPrompt() {
    if (isRecording || recordedUri) return;
    setPromptIndex((i) => Math.max(i - 1, 0));
  }

  function onRerecord() {
    if (isRecording) return;
    setRecordedUri(null);
    setRecordedPrompt(null);
    endVisualTimer({ reset: true });
  }

  function onContinuePress() {
    if (!recordedUri) {
      Alert.alert("No video yet", "Record a video first, then press Continue.");
      return;
    }
    router.push({
      pathname: "/(companyUser)/recording-studio",
      params: { uri: recordedUri, prompt: recordedPrompt ?? prompt },
    });
  }

  const lockedPrompt = recordedPrompt ?? prompt;

  if (permDenied) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{
            color: "white",
            fontFamily: FONT_LEXEND_REGULAR,
            fontSize: 16,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Camera and microphone access was denied.{"\n\n"}Please allow access
          in your browser settings and reload the page.
        </Text>
        <Pressable onPress={goBack} style={{ marginTop: 14, alignItems: "center" }}>
          <Text
            style={{
              color: "white",
              fontFamily: FONT_LEXEND_REGULAR,
              opacity: 0.8,
            }}
          >
            Back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ flex: 1 }}>
        {/* Browser camera preview via native <video> element */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          {createElement("video", {
            ref: (el: HTMLVideoElement | null) => {
              videoPreviewRef.current = el;
              if (el && streamRef.current && !el.srcObject) {
                el.srcObject = streamRef.current;
                el.play().catch(() => {});
              }
            },
            style: {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              // Mirror so it looks like a front camera
              transform: "scaleX(-1)",
              display: "block",
              backgroundColor: "#000",
            },
            muted: true,
            autoPlay: true,
            playsInline: true,
          })}
        </View>

        {/* Loading indicator while camera starts */}
        {!cameraReady && (
          <View
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "black",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontFamily: FONT_LEXEND_REGULAR,
                fontSize: 14,
              }}
            >
              Starting camera…
            </Text>
          </View>
        )}

        {/* Prompt + record ring */}
        <View
          style={{
            position: "absolute",
            bottom: 68,
            width,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          {/* Ring + button */}
          <View style={{ width: RING_SIZE, height: RING_SIZE, marginBottom: 10 }}>
            <Svg
              width={RING_SIZE}
              height={RING_SIZE}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                transform: [{ rotate: "-90deg" }],
              }}
            >
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={RING_STROKE}
                fill="transparent"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                stroke="white"
                strokeWidth={RING_STROKE}
                fill="transparent"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </Svg>

            <Pressable
              onPress={onRecordPress}
              style={{
                position: "absolute",
                top: (RING_SIZE - 76) / 2,
                left: (RING_SIZE - 76) / 2,
                width: 76,
                height: 76,
                borderRadius: 38,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: isRecording ? 28 : 56,
                  height: isRecording ? 28 : 56,
                  borderRadius: isRecording ? 6 : 28,
                  backgroundColor: "red",
                }}
              />
            </Pressable>
          </View>

          <Text
            style={{
              color: isRecording ? "white" : "rgba(255,255,255,0.75)",
              fontFamily: FONT_LEXEND_REGULAR,
              fontSize: 12,
              marginBottom: 10,
              letterSpacing: 0.4,
            }}
          >
            {isRecording
              ? `${formatTime(elapsedSec)} / ${formatTime(MAX_SECONDS)}`
              : `Max ${formatTime(MAX_SECONDS)}`}
          </Text>

          <Text
            style={{
              color: "white",
              fontFamily: FONT_LEXEND_REGULAR,
              fontSize: 16,
              textAlign: "center",
              marginBottom: 8,
              paddingHorizontal: 8,
            }}
          >
            {lockedPrompt}
          </Text>

          <View style={{ flexDirection: "row", gap: 18, alignItems: "center" }}>
            <Pressable
              onPress={prevPrompt}
              disabled={promptIndex === 0 || isRecording || !!recordedUri}
              hitSlop={10}
            >
              <Text
                style={{
                  color:
                    promptIndex === 0 || isRecording || recordedUri
                      ? "#555"
                      : "white",
                  fontSize: 18,
                }}
              >
                ◀
              </Text>
            </Pressable>
            <Pressable
              onPress={nextPrompt}
              disabled={
                promptIndex === PROMPTS.length - 1 || isRecording || !!recordedUri
              }
              hitSlop={10}
            >
              <Text
                style={{
                  color:
                    promptIndex === PROMPTS.length - 1 || isRecording || recordedUri
                      ? "#555"
                      : "white",
                  fontSize: 18,
                }}
              >
                ▶
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom controls */}
        <View
          style={{
            position: "absolute",
            bottom: 28,
            left: 0,
            right: 0,
            paddingHorizontal: 24,
            height: 44,
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={goBack}
            disabled={isRecording}
            style={{ position: "absolute", left: 24 }}
          >
            <Text
              style={{
                color: isRecording ? "#555" : "white",
                fontFamily: FONT_LEXEND_REGULAR,
                fontSize: 16,
              }}
            >
              Back
            </Text>
          </Pressable>

          {recordedUri && !isRecording ? (
            <Pressable
              onPress={onRerecord}
              hitSlop={6}
              style={{
                alignSelf: "center",
                paddingHorizontal: 6,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontFamily: FONT_LEXEND_REGULAR,
                  fontSize: 16,
                  opacity: 0.9,
                }}
              >
                Re-record
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onContinuePress}
            disabled={!recordedUri || isRecording}
            style={{ position: "absolute", right: 24 }}
          >
            <Text
              style={{
                color: !recordedUri || isRecording ? "#555" : "white",
                fontFamily: FONT_LEXEND_REGULAR,
                fontSize: 16,
              }}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
