import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

export const motion = {
  dur: { micro: 140, ui: 260, exit: 200, count: 900, corePull: 1100, rising: 1400, fade: 180 },
  ease: {
    out: Easing.bezier(0.22, 1, 0.36, 1),
    in: Easing.bezier(0.64, 0, 0.78, 0),
    inOut: Easing.bezier(0.65, 0, 0.35, 1),
  },
  // One spring family. press = touch-down response; sheet = drawers; settle = sediment landing.
  spring: {
    press: { damping: 18, stiffness: 420, mass: 0.6 },
    sheet: { damping: 24, stiffness: 260, mass: 1 },
    settle: { damping: 16, stiffness: 170, mass: 1 },
  },
  stagger: 45,
  pressScale: 0.97,
} as const;

// Fire-and-forget; haptics must never throw into the UI path.
const safe = (p: Promise<void>) => {
  p.catch(() => {});
};

export const haptic = {
  /** One detent on the Year Dial or a picker. */
  tick: () =>
    safe(
      Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
        : Haptics.selectionAsync(),
    ),
  /** The core seats after the pull. */
  seat: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  /** The Rising swells. */
  swell: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Unlock / purchase succeeded. */
  success: () =>
    safe(
      Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),
  /** A buffer flag appeared. */
  warn: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Something failed. */
  fail: () =>
    safe(
      Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    ),
};
