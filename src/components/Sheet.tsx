import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '@/i18n';
import { makeStyles, motion, radius, space, useTheme } from '@/theme';

import { T } from './T';
import { useReducedMotion } from '@/theme/reduced';

const OFFSCREEN = 900;

/**
 * A bottom sheet: slides up on the sheet spring, drags down to close, closes on
 * the backdrop and the back button. The parent owns `visible`; the sheet plays
 * its exit before it unmounts.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  /** Mono caption at the top of the sheet. */
  title?: string;
  children: ReactNode;
  /** Wrap the content in a ScrollView (default). */
  scroll?: boolean;
}) {
  const { c } = useTheme();
  const { t } = useT();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const [h, setH] = useState(0);
  const y = useSharedValue(OFFSCREEN);

  useEffect(() => {
    if (visible) setMounted(true);
    else if (mounted) {
      y.value = withTiming(h || OFFSCREEN, { duration: reduced ? 0 : motion.dur.exit, easing: motion.ease.in }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (visible && mounted && h) y.value = reduced ? 0 : withSpring(0, motion.spring.sheet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted, h]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > h * 0.25 || e.velocityY > 900) scheduleOnRN(onClose);
      else y.value = withSpring(0, motion.spring.sheet);
    });

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, h || OFFSCREEN], [1, 0], 'clamp') }));

  if (!mounted) return null;
  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent animationType="none">
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} accessibilityRole="button" />
        </Animated.View>
        <Animated.View
          onLayout={(e) => setH(e.nativeEvent.layout.height)}
          style={[styles.panel, { paddingBottom: insets.bottom + space.lg }, panel]}
          accessibilityViewIsModal
        >
          <GestureDetector gesture={pan}>
            <View style={styles.grab}>
              <View style={styles.handle} />
              {title ? (
                <T kind="mono" color={c.ink} style={styles.title} accessibilityRole="header">
                  {title}
                </T>
              ) : null}
            </View>
          </GestureDetector>
          {scroll ? (
            <ScrollView contentContainerStyle={styles.content} bounces={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1, justifyContent: 'flex-end' },
  panel: {
    maxHeight: '88%',
    backgroundColor: c.paper,
    borderTopLeftRadius: radius.md + 4,
    borderTopRightRadius: radius.md + 4,
    borderTopWidth: 1,
    borderColor: c.hairline,
  },
  grab: { alignItems: 'center', paddingTop: space.sm, paddingBottom: space.sm, paddingHorizontal: space.gutter },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.line },
  title: { alignSelf: 'flex-start', marginTop: space.md },
  content: { paddingHorizontal: space.gutter, gap: space.md },
}));
