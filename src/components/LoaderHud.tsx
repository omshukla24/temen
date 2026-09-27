import { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Progress } from 'ground-memory';

import { useT, type Key } from '@/i18n';
import { color, motion, space, type as roles } from '@/theme';

import { HairlineProgress } from './HairlineProgress';
import { T } from './T';
import { useReducedMotion } from '@/theme/reduced';

const AText = Animated.createAnimatedComponent(TextInput);

const SOURCES: { key: string; label: string }[] = [
  { key: 'water', label: 'WATER' },
  { key: 'edge', label: 'EDGE' },
  { key: 'bowl', label: 'GROUND' },
  { key: 'rain', label: 'RAIN' },
  { key: 'quakes', label: 'QUAKES' },
  { key: 'soil', label: 'SOIL' },
  { key: 'relief', label: 'FLOODS' },
];

const WORD: Record<string, Key> = { sounding: 'check.sounding', coring: 'check.coring', reading: 'check.reading', sealed: 'check.sealed' };

/** SOUNDING 012% → CORING 047% → READING STRATA 083% → SEALED 100% */
export function LoaderHud({ progress, done }: { progress: Progress | null; done: string[] }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const pct = useSharedValue(0);
  const bar = useSharedValue(0);
  const fraction = progress?.fraction ?? 0;
  useEffect(() => {
    // creep towards the next step so the percent never sits dead while a slow source loads
    const total = progress?.total ?? 7;
    const target = Math.min(1, fraction + (fraction < 1 ? 0.6 / total : 0));
    pct.value = withTiming(fraction * 100, { duration: reduced ? 0 : 420, easing: motion.ease.out }, () => {
      if (fraction < 1) pct.value = withTiming(target * 100, { duration: 6000 });
    });
    bar.value = withTiming(fraction, { duration: reduced ? 0 : 420, easing: motion.ease.out });
  }, [fraction, progress?.total, reduced, pct, bar]);

  const stage = progress?.stage ?? 'sounding';
  const word = t(WORD[stage]).toUpperCase();
  const props = useAnimatedProps(() => {
    const s = `${word} ${Math.round(pct.value).toString().padStart(3, '0')}%`;
    return { text: s, defaultValue: s } as object;
  });

  return (
    <View style={styles.root} accessibilityLiveRegion="polite" accessibilityLabel={`${word} ${Math.round(fraction * 100)} percent`}>
      <AText editable={false} caretHidden underlineColorAndroid="transparent" animatedProps={props} style={[roles.mono, styles.readout]} />
      <HairlineProgress progress={bar} tint={color.laterite} />
      <View style={styles.sources}>
        {SOURCES.map((s) => {
          const ok = done.includes(s.key);
          return (
            <T key={s.key} kind="mono" color={ok ? color.ink : color.inkMuted} style={{ opacity: ok ? 1 : 0.55 }}>
              {ok ? '■' : '□'} {s.label}
            </T>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  readout: { color: color.ink, fontSize: 13, letterSpacing: 13 * 0.24, padding: 0 },
  sources: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 2 },
});
