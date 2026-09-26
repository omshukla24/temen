import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import type { Stratum as StratumT } from 'ground-memory';

import { useT } from '@/i18n';
import { bandColor } from '@/setpieces/CoreDrawing';
import { color, motion, space } from '@/theme';

import { Glyph } from './Glyph';
import { HatchFill } from './Hatch';
import { PressableScale } from './PressableScale';
import { ReadingCounter } from './ReadingCounter';
import { ConfidenceTicks, SourceChip } from './SourceChip';
import { T } from './T';


function counterProps(s: StratumT): { value: number; format: 'int' | 'signed'; suffix: string; digits: number } | null {
  if (s.value === null || s.status !== 'ok') return null;
  if (s.reading.endsWith(' mm')) return { value: s.value, format: 'int', suffix: ' mm', digits: 0 };
  if (s.reading.endsWith(' m')) return { value: s.value, format: 'signed', suffix: ' m', digits: 1 };
  if (s.reading.endsWith('%')) return { value: s.value, format: 'int', suffix: '%', digits: 0 };
  return { value: s.value, format: 'int', suffix: '', digits: 0 };
}

/**
 * One band of the Core. Left: the column itself (fill + hatch). Right: index,
 * reading, headline, detail, source. Height follows significance.
 */
export function StratumBand({
  s,
  order,
  sealed,
  onUnlock,
  animate,
}: {
  s: StratumT;
  order: number;
  sealed: boolean;
  onUnlock?: () => void;
  animate: boolean;
}) {
  const { tl, t } = useT();
  const [h, setH] = useState(0);
  const [open, setOpen] = useState(false);
  const onLayout = (e: LayoutChangeEvent) => setH(Math.round(e.nativeEvent.layout.height));
  const idx = String(s.index).padStart(2, '0');
  const counter = counterProps(s);
  const isEgg = s.key === 'egg';
  const fill = bandColor({ hatch: s.hatch, significance: s.significance, status: s.status });
  const minH = 92 + s.significance * 70;
  const label = `${idx} ${tl(s.title)}. ${sealed ? t('check.sealedBand') : `${s.reading} ${s.unit}. ${tl(s.headline)}. ${s.detail}`}`;

  return (
    <Animated.View
      entering={animate ? FadeInDown.springify().damping(motion.spring.settle.damping).stiffness(motion.spring.settle.stiffness).mass(1).delay(order * motion.stagger) : undefined}
      layout={LinearTransition.duration(motion.dur.ui)}
      onLayout={onLayout}
      style={[styles.band, { minHeight: minH }]}
    >
      <View style={[styles.column, { backgroundColor: isEgg ? color.crimsonEgg : fill }]}>
        {h > 0 ? <HatchFill kind={s.hatch} width={18} height={h} tint={s.hatch === 'lostWater' ? 'rgba(29,90,122,0.5)' : 'rgba(242,237,228,0.45)'} /> : null}
      </View>
      <PressableScale
        onPress={sealed ? onUnlock : () => setOpen((o) => !o)}
        scaleTo={0.99}
        accessibilityLabel={label}
        accessibilityHint={sealed ? t('stratum.hintSealed') : t('stratum.hint')}
        style={styles.body}
      >
        <View style={styles.head}>
          <T kind="mono" color={isEgg ? color.crimsonEgg : color.ink}>
            {idx} {tl(s.title).toUpperCase()}
          </T>
          {!sealed && s.status === 'ok' ? <ConfidenceTicks level={s.confidence} /> : null}
        </View>

        {sealed ? (
          <View style={styles.sealed}>
            <Glyph name="lock" size={18} color={color.laterite} />
            <T kind="bodyMedium" color={color.laterite}>
              {t('check.sealedBand')}
            </T>
          </View>
        ) : (
          <>
            <View style={styles.readingRow}>
              {counter ? (
                <ReadingCounter
                  value={counter.value}
                  format={counter.format}
                  suffix={counter.suffix}
                  digits={counter.digits}
                  delay={order * motion.stagger + 120}
                  run={animate}
                  style={isEgg ? { color: color.crimsonEgg } : undefined}
                />
              ) : (
                <T kind="display" color={isEgg ? color.crimsonEgg : color.ink}>
                  {s.reading}
                </T>
              )}
              <T kind="mono" style={{ flexShrink: 1 }}>
                {s.unit}
              </T>
            </View>
            <T kind="heading" color={isEgg ? color.crimsonEgg : color.ink}>
              {tl(s.headline)}
            </T>
            <T kind="small">{s.detail}</T>
            {s.flag ? (
              <View style={styles.flag}>
                <Glyph name="pin" size={16} color={color.laterite} />
                <T kind="small" color={color.laterite} style={{ flex: 1 }}>
                  {s.flag}
                </T>
              </View>
            ) : null}
            {open && s.facts.length ? (
              <Animated.View entering={FadeInDown.duration(motion.dur.ui)} style={styles.facts}>
                {s.facts.map((f) => (
                  <View key={f.label} style={styles.fact}>
                    <T kind="mono" style={styles.factLabel}>
                      {f.label}
                    </T>
                    <T kind="caption" color={color.ink} style={{ flex: 1 }}>
                      {f.value}
                    </T>
                  </View>
                ))}
              </Animated.View>
            ) : null}
            <View style={styles.foot}>
              <SourceChip source={s.source} />
              {s.facts.length ? <Glyph name={open ? 'close' : 'plus'} size={14} color={color.inkMuted} /> : null}
            </View>
          </>
        )}
      </PressableScale>
    </Animated.View>
  );
}

/** The bottom stratum of every core: dashed, never sealed. */
export function CantSeeBand({ items, order, animate }: { items: string[]; order: number; animate: boolean }) {
  const { t } = useT();
  return (
    <Animated.View
      entering={animate ? FadeInDown.springify().damping(16).stiffness(170).delay(order * motion.stagger) : undefined}
      style={styles.cantSee}
      accessibilityLabel={`${t('check.cantSee')}. ${items.join(' ')}`}
    >
      <T kind="mono" color={color.ink}>
        {String(order + 1).padStart(2, '0')} {t('check.cantSee').toUpperCase()}
      </T>
      {items.map((x, i) => (
        <View key={i} style={styles.fact}>
          <T kind="mono" style={styles.factLabel}>
            {String(i + 1).padStart(2, '0')}
          </T>
          <T kind="small" color={color.ink} style={{ flex: 1 }}>
            {x}
          </T>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.hairline },
  column: { width: 18, overflow: 'hidden', borderLeftWidth: 1, borderRightWidth: 1, borderColor: color.ink },
  body: { flex: 1, paddingVertical: space.md, paddingLeft: space.lg, gap: 4, justifyContent: 'flex-start' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readingRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  sealed: { flexDirection: 'row', gap: space.sm, alignItems: 'center', paddingVertical: space.md },
  flag: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', marginTop: space.xs },
  facts: { marginTop: space.sm, gap: 6 },
  fact: { flexDirection: 'row', gap: space.md },
  factLabel: { width: 112 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  cantSee: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.lg,
  },
});
