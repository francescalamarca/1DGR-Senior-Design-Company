/**
 * CameraUIScreen
 * - Front-camera prompt recorder for “recording studio” intake videos.
 * - Cycles through predefined interview prompts and locks the active prompt for a given recording.
 * - Requests camera + microphone permissions, configures iOS audio mode for recording, and records up to MAX_SECONDS.
 * - Shows a circular progress ring + timer while recording; safely stops at the max duration.
 * - After recording, allows Re-record or Continue (navigates to /recording-studio with { uri, prompt }).
 * - Resets all transient state when the screen gains focus/unmounts to avoid stale recordings or animations.
 */
import { useSession } from "@/src/state/session";
import { Audio as ExpoAudio } from "expo-av";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { CAMERA_PROMPTS } from "../../constants/camera-prompts";

// ✅ Use your existing registered font name here (must match your font loader)
const FONT_LEXEND_REGULAR = "Lexend-Regular" as const;

const { width } = Dimensions.get("window");

const PROMPTS = CAMERA_PROMPTS;

// Prompt/time/ring constants: enforce a 2-minute limit and drive the circular progress UI.
const MAX_SECONDS = 120;
const MAX_MS = MAX_SECONDS * 1000;

// ✅ ring geometry
const RING_SIZE = 92; // outer size of ring
const RING_STROKE = 4;
const R = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// Wraps Circle to strip the `collapsable` prop that React Native's Animated adds,
// which is invalid on SVG DOM elements when running on web.
const SafeCircle = forwardRef<any, any>(({ collapsable: _c, ...props }, ref) => (
  <Circle {...props} ref={ref} />
));
const AnimatedCircle = Animated.createAnimatedComponent(SafeCircle);

// Formats seconds into mm:ss for the on-screen recording timer.
function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function CameraUIScreen() {
  const { accessToken } = useSession(); // keeping hook (unused)

  // One-time audio setup so recording works reliably on iOS (including silent mode).
  useEffect(() => {
    async function prepareRecording() {
      try {
        await ExpoAudio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (e) {
        console.error("Failed to set audio mode", e);
      }
    }
    prepareRecording();
  }, []);

  const params = useLocalSearchParams<{
    returnTo?: "/(companyUser)/record" | "/(companyUser)/profile";
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

  // Keep the active prompt index in state; `recordedPrompt` “locks” the prompt used for the current/last recording.
  const [promptIndex, setPromptIndex] = useState(0);
  const prompt = PROMPTS[promptIndex];

  const cameraRef = useRef<CameraView>(null);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  // ✅ locks the prompt used for THIS recording
  const [recordedPrompt, setRecordedPrompt] = useState<string | null>(null);

  const [requestingPerms, setRequestingPerms] = useState(false);

  // ✅ visual timer state
  const [elapsedSec, setElapsedSec] = useState(0);

  // ✅ Animated progress (0 → 1 over 2 minutes)
  const progress = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  // const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // found this in claud, this is a way to bypass whatever type comes out of setInterval on all systems so it will work regardless of return
  const recordingStartMsRef = useRef<number | null>(null);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0], // start empty → full ring
  });

  // Visual timer helpers:
  // - clearTimer(): stops the text tick interval + resets elapsed state
  // - stopProgressAnimation(): stops Animated.timing and optionally resets progress to 0
  // - startVisualTimer(): starts both the text tick + ring animation (0→1 over MAX_MS)
  // - endVisualTimer(): shared cleanup for stop/unmount paths
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

    // Update elapsed text ~4x/sec (smooth enough)
    tickIntervalRef.current = setInterval(() => {
      const start = recordingStartMsRef.current;
      if (!start) return;

      const ms = Date.now() - start;
      const sec = Math.min(MAX_SECONDS, ms / 1000);
      setElapsedSec(sec);

      // safety: if it reaches max, stop
      if (ms >= MAX_MS) {
        try {
          cameraRef.current?.stopRecording();
        } catch {}
      }
    }, 250);

    stopProgressAnimation(true);

    // animate ring 0 → 1 over 2 minutes
    progressAnimRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: MAX_MS,
      easing: Easing.linear,
      useNativeDriver: false, // strokeDashoffset isn't native-driven
    });

    progressAnimRef.current.start();
  }

  function endVisualTimer({ reset }: { reset: boolean }) {
    clearTimer();
    stopProgressAnimation(reset);
  }

  // Focus lifecycle: on enter/exit, stop any ongoing recording, clear the last URI/prompt, and reset the ring/timer.
  useFocusEffect(
    useCallback(() => {
      try {
        cameraRef.current?.stopRecording();
      } catch {}

      setIsRecording(false);
      setRecordedUri(null);
      setRecordedPrompt(null);
      setPromptIndex(startPromptIndex);

      endVisualTimer({ reset: true });

      return () => {
        try {
          cameraRef.current?.stopRecording();
        } catch {}
        endVisualTimer({ reset: true });
      };
    }, [endVisualTimer, startPromptIndex]),
  );

  // Navigation helpers:
  // - goBack(): returns deterministically to returnTo (if provided) or camera tab
  // - nextPrompt/prevPrompt(): prevent prompt changes while recording or after a take is captured
  function goBack() {
    router.replace(returnTo ?? "/(companyUser)/record");
  }

  function nextPrompt() {
    if (isRecording || recordedUri) return;
    setPromptIndex((i) => Math.min(i + 1, PROMPTS.length - 1));
  }

  function prevPrompt() {
    if (isRecording || recordedUri) return;
    setPromptIndex((i) => Math.max(i - 1, 0));
  }

  // Permission gate: requests camera + mic if needed and returns a boolean for startRecording().
  async function ensurePermissions() {
    try {
      setRequestingPerms(true);

      if (!camPerm?.granted) {
        const r = await requestCamPerm();
        if (!r.granted) return false;
      }

      if (!micPerm?.granted) {
        const r = await requestMicPerm();
        if (!r.granted) return false;
      }

      return true;
    } finally {
      setRequestingPerms(false);
    }
  }

  // Starts a new recording:
  // - ensures permissions
  // - clears prior take, locks the current prompt, starts timer/ring
  // - records up to MAX_SECONDS; stores recordedUri on success
  async function startRecording() {
    if (!cameraRef.current) return;

    const ok = await ensurePermissions();
    if (!ok) {
      Alert.alert(
        "Permissions needed",
        "Camera + Microphone permission is required to record.",
      );
      return;
    }

    try {
      // clear old recording
      setRecordedUri(null);
      setRecordedPrompt(null);

      // lock prompt for this recording
      setRecordedPrompt(prompt);

      setIsRecording(true);

      // ✅ start ring + timer
      startVisualTimer();

      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_SECONDS, // ✅ 2 minutes
      });

      if (video?.uri) setRecordedUri(video.uri);
    } catch (e) {
      console.error(e);
      Alert.alert("Recording failed", "Could not start/finish recording.");
      setRecordedPrompt(null);
    } finally {
      setIsRecording(false);
      // If recording ends naturally, stop timer but keep ring filled (nice feedback)
      endVisualTimer({ reset: false });
    }
  }

  // Stops recording early and freezes the ring at the current progress.
  function stopRecording() {
    try {
      cameraRef.current?.stopRecording();
    } catch (e) {
      console.error(e);
    } finally {
      // stop timer/ring (keep ring at current progress)
      endVisualTimer({ reset: false });
    }
  }

  // Clears the current take and resets timer/ring so the user can record again.
  function onRecordPress() {
    if (requestingPerms) return;
    if (isRecording) stopRecording();
    else startRecording();
  }

  // Continue flow: requires a recordedUri and pushes to /recording-studio with the recorded URI + locked prompt.
  async function onContinuePress() {
    if (!recordedUri) {
      Alert.alert("No video yet", "Record a video first, then press Continue.");
      return;
    }

    const lockedPrompt = recordedPrompt ?? prompt;

    router.push({
      pathname: "/(companyUser)/recording-studio",
      params: { uri: recordedUri, prompt: lockedPrompt },
    });
  }

  function onRerecord() {
    if (isRecording) return;
    setRecordedUri(null);
    setRecordedPrompt(null);
    endVisualTimer({ reset: true });
  }

  if (Platform.OS === "web") {
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
          Video recording is not supported in the web browser.{"\n\n"}Please
          open this app on your iOS or Android device to record videos.
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

  if (!camPerm || !micPerm) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: "black" }} />;
  }

  if (!camPerm.granted || !micPerm.granted) {
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
          We need camera + microphone permission to record your video.
        </Text>

        <Pressable
          onPress={async () => {
            const ok = await ensurePermissions();
            if (!ok) {
              Alert.alert(
                "Permission denied",
                "Please allow camera + microphone access.",
              );
            }
          }}
          style={{
            borderWidth: 1,
            borderColor: "white",
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            opacity: requestingPerms ? 0.7 : 1,
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
          }}
          disabled={requestingPerms}
        >
          {requestingPerms ? <ActivityIndicator color="white" /> : null}
          <Text
            style={{
              color: "white",
              fontFamily: FONT_LEXEND_REGULAR,
              fontSize: 16,
            }}
          >
            {requestingPerms ? "Requesting..." : "Allow access"}
          </Text>
        </Pressable>

        <Pressable
          onPress={goBack}
          style={{ marginTop: 14, alignItems: "center" }}
        >
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

  const lockedPrompt = recordedPrompt ?? prompt;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ flex: 1 }}>
        {/* CAMERA PREVIEW */}
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="front"
          mode="video"
        />

        {/*
          ✅ PROMPT + RECORD AREA
          Moved DOWN:
          - was bottom: 110
          - now bottom: 68 (closer to bottom controls)
        */}
        <View
          style={{
            position: "absolute",
            bottom: 68,
            width,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          {/* ✅ RECORD BUTTON + RING */}
          <View
            style={{ width: RING_SIZE, height: RING_SIZE, marginBottom: 10 }}
          >
            {/* Ring */}
            <Svg
              width={RING_SIZE}
              height={RING_SIZE}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                // rotate so progress starts at top (12 o'clock)
                transform: [{ rotate: "-90deg" }],
              }}
            >
              {/* Track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={R}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={RING_STROKE}
                fill="transparent"
              />
              {/* Progress */}
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

            {/* Button */}
            <Pressable
              onPress={onRecordPress}
              disabled={requestingPerms}
              style={{
                position: "absolute",
                top: (RING_SIZE - 76) / 2,
                left: (RING_SIZE - 76) / 2,
                width: 76,
                height: 76,
                borderRadius: 38,
                borderWidth: 0, // ring handles border now
                alignItems: "center",
                justifyContent: "center",
                opacity: requestingPerms ? 0.6 : 1,
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

          {/* ✅ TIMER TEXT (only while recording) */}
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

          {/* PROMPT TEXT */}
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

          {/* PROMPT NAV */}
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
                promptIndex === PROMPTS.length - 1 ||
                isRecording ||
                !!recordedUri
              }
              hitSlop={10}
            >
              <Text
                style={{
                  color:
                    promptIndex === PROMPTS.length - 1 ||
                    isRecording ||
                    recordedUri
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

        {/*
          ✅ BOTTOM CONTROLS
          Slightly lower + tighter:
          - was bottom: 40
          - now bottom: 28
        */}
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
          {/* Left: Back */}
          <Pressable
            onPress={goBack}
            disabled={isRecording || requestingPerms}
            style={{ position: "absolute", left: 24 }}
          >
            <Text
              style={{
                color: isRecording || requestingPerms ? "#555" : "white",
                fontFamily: FONT_LEXEND_REGULAR,
                fontSize: 16,
              }}
            >
              Back
            </Text>
          </Pressable>

          {/* Center: Re-record */}
          {recordedUri && !isRecording ? (
            <Pressable
              onPress={onRerecord}
              disabled={requestingPerms}
              hitSlop={6}
              style={{
                alignSelf: "center",
                paddingHorizontal: 6,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: requestingPerms ? "#555" : "white",
                  fontFamily: FONT_LEXEND_REGULAR,
                  fontSize: 16,
                  opacity: 0.9,
                }}
              >
                Re-record
              </Text>
            </Pressable>
          ) : null}

          {/* Right: Continue */}
          <Pressable
            onPress={onContinuePress}
            disabled={!recordedUri || isRecording || requestingPerms}
            style={{ position: "absolute", right: 24 }}
          >
            <Text
              style={{
                color:
                  !recordedUri || isRecording || requestingPerms
                    ? "#555"
                    : "white",
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
