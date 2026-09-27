import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/tabs';

import { haptic, makeStyles, motion, space, useTheme } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';
import { PressableScale } from './PressableScale';
import { StaffBar } from './Staff';
import { T } from './T';
import { useReducedMotion } from '@/theme/reduced';

const ICONS: Record<string, GlyphName> = { index: 'home', places: 'layers', watch: 'bell', account: 'user' };
const MARK = 40;

/**
 * The app's bottom bar: survey glyphs with mono labels, and a piece of
 * levelling staff that slides to the open tab. Hides while the keyboard is up.
 */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { c } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const item = state.routes.length ? w / state.routes.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const to = state.index * item + item / 2 - MARK / 2;
    x.value = reduced || !item ? to : withSpring(to, motion.spring.sheet);
  }, [state.index, item, reduced, x]);

  const mark = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  if (keyboard) return null;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {item ? (
        <Animated.View style={[styles.mark, mark]}>
          <StaffBar width={MARK} height={5} />
        </Animated.View>
      ) : null}
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const focused = state.index === i;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const tint = focused ? c.ink : c.inkMuted;
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) {
            haptic.tick();
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <PressableScale
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            scaleTo={0.9}
            style={styles.item}
          >
            <View style={styles.inner}>
              <View>
                <Glyph name={ICONS[route.name] ?? 'more'} size={22} color={tint} weight={focused ? 1.9 : 1.5} />
                {options.tabBarBadge ? <View style={styles.dot} /> : null}
              </View>
              <T kind="mono" color={tint} numberOfLines={1} style={styles.label}>
                {label.toUpperCase()}
              </T>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: 'row', backgroundColor: c.ground, borderTopWidth: 1.5, borderTopColor: c.ink, paddingTop: space.sm + 2 },
  mark: { position: 'absolute', top: -1.5, left: 0, width: MARK, height: 5 },
  item: { flex: 1, alignItems: 'center' },
  inner: { alignItems: 'center', gap: 4 },
  // small mono sets its own tracking
  label: { fontSize: 8.5, lineHeight: 12, letterSpacing: 1.2 },
  dot: { position: 'absolute', top: -1, right: -4, width: 7, height: 7, borderRadius: 4, backgroundColor: c.laterite, borderWidth: 1, borderColor: c.ground },
}));
