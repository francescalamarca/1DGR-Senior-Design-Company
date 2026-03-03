/**
 * IntroVideoBackground (src/components/IntroVideoBackground.tsx)
 * - Full-screen intro video overlay used on app launch (typically while logged out).
 * - Plays a bundled MP4 via expo-av and optionally enables tap-to-skip after a delay.
 * - Calls onNearEnd once when the video is within `revealUnderlayBeforeEndMs` of finishing
 *   (used to fade in the underlying UI before the video ends).
 * - Guarantees onDone fires only once (finish or skip) and cleans up playback on unmount.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";

type Props = {
  source: any; // require("...mp4")
  skipAfterMs?: number; // tap-to-skip enabled after X ms
  revealUnderlayBeforeEndMs?: number; // when to start fading UI in (e.g. 1000)
  onNearEnd?: () => void; // called once when near end
  onDone: () => void; // called when finished or skipped
};

export function IntroVideoBackground({
  source,
  skipAfterMs = 2500,
  revealUnderlayBeforeEndMs = 1000,
  onNearEnd,
  onDone,
}: Props) {
  const videoRef = useRef<Video>(null);
  const [skipEnabled, setSkipEnabled] = useState(skipAfterMs <= 0);
  const nearEndFiredRef = useRef(false);
  const doneOnceRef = useRef(false);

  /** Enables tap-to-skip after `skipAfterMs` so accidental taps don’t instantly skip. */
  useEffect(() => {
    if (skipAfterMs <= 0) {
      setSkipEnabled(true);
      return;
    }
    const t = setTimeout(() => setSkipEnabled(true), skipAfterMs);
    return () => clearTimeout(t);
  }, [skipAfterMs]);

  /** Stops/unloads the video when the component unmounts to prevent audio/background playback. */
  useEffect(() => {
    return () => {
      videoRef.current?.stopAsync?.().catch(() => {});
      videoRef.current?.unloadAsync?.().catch(() => {});
    };
  }, []);


/**
 * Ends the intro exactly once (skip or natural finish), stops playback, then notifies parent.
 * `doneOnceRef` prevents double-calls from rapid taps or status updates.
 */
  const finish = () => {
    if (doneOnceRef.current) return;
    doneOnceRef.current = true;

    videoRef.current?.stopAsync?.().catch(() => {});
    onDone?.();
  };


/**
 * Tracks playback to:
 * - fire onNearEnd once when we cross the near-end threshold (for UI fade-in timing)
 * - call finish when playback ends
 */
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const duration = status.durationMillis ?? 0;
    const position = status.positionMillis ?? 0;

    // Fire "near end" once (so your UI can fade in over the video)
    if (
      !nearEndFiredRef.current &&
      duration > 0 &&
      revealUnderlayBeforeEndMs >= 0 &&
      duration - position <= revealUnderlayBeforeEndMs
    ) {
      nearEndFiredRef.current = true;
      onNearEnd?.();
    }

    if (status.didJustFinish) finish();
  };

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={() => skipEnabled && finish()}>
      <View style={styles.container}>
        <Video
          ref={videoRef}
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
});