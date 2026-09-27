import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import type { Stratum as StratumT } from 'ground-memory';

import { useT } from '@/i18n';
import { bandColor } from '@/setpieces/CoreDrawing';
import { makeStyles, motion, space, useTheme } from '@/theme';

import { Glyph } from './Glyph';
import { HatchFill } from './Hatch';
import { PressableScale } from './PressableScale';
import { ProBadge } from './ProBadge';
import { ReadingCounter } from './ReadingCounter';
import { ConfidenceTicks, SourceChip } from './SourceChip';
import { T } from './T';

/** Width of the core column beside each stratum. */
const COL = 34;

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
  const { c, fills } = useTheme();
  const styles = useStyles();
  const [h, setH] = useState(0);
  const [open, setOpen] = useState(false);
  const onLayout = (e: LayoutChangeEvent) => setH(Math.round(e.nativeEvent.layout.height));
  const idx = String(s.index).padStart(2, '0');
  const counter = counterProps(s);
  const isEgg = s.key === 'egg';
  const fill = bandColor({ hatch: s.hatch, significance: s.significance, status: s.status }, fills);
  const minH = 92 + s.significance * 70;
  const label = `${idx} ${tl(s.title)}. ${sealed ? t('check.sealedBand') : `${s.reading} ${s.unit}. ${tl(s.headline)}. ${s.detail}`}`;

  return (
    <Animated.View
      entering={animate ? FadeInDown.springify().damping(motion.spring.settle.damping).stiffness(motion.spring.settle.stiffness).mass(1).delay(order * motion.stagger) : undefined}
      layout={LinearTransition.duration(motion.dur.ui)}
      onLayout={onLayout}
      style={[styles.band, { minHeight: minH }]}
    >
      <View style={[styles.column, { backgroundColor: isEgg ? c.crimsonEgg : fill }]}>
        {h > 0 ? <HatchFill kind={s.hatch} width={COL} height={h} tint={s.hatch === 'lostWater' ? 'rgba(27,110,168,0.55)' : c.dark ? 'rgba(12,23,25,0.45)' : 'rgba(247,248,244,0.5)'} /> : null}
        {/* the core-box label: which stratum this is */}
        <View style={styles.boxLabel}>
          <T kind="mono" color={c.ink} style={styles.boxIndex}>
            {idx}
          </T>
        </View>
      </View>
      <PressableScale
        onPress={sealed ? onUnlock : () => setOpen((o) => !o)}
        scaleTo={0.99}
        accessibilityLabel={label}
        accessibilityHint={sealed ? t('stratum.hintSealed') : t('stratum.hint')}
        style={styles.body}
      >
        <View style={styles.head}>
          <T kind="mono" color={isEgg ? c.crimsonEgg : c.ink}>
            {tl(s.title).toUpperCase()}
          </T>
          {!sealed && s.status === 'ok' ? <ConfidenceTicks level={s.confidence} /> : null}
        </View>

        {sealed ? (
          <View style={styles.sealed}>
            <Glyph name="lock" size={18} color={c.ink} />
            <T kind="bodyMedium" color={c.ink} style={styles.flex}>
              {t('check.sealedBand')}
            </T>
            <ProBadge variant="outline" />
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
                  style={isEgg ? { color: c.crimsonEgg } : undefined}
                />
              ) : s.status !== 'ok' ? (
                <View style={[styles.stamp, s.status === 'error' && styles.stampError]}>
                  <T kind="mono" color={s.status === 'error' ? c.lateriteText : c.ink} style={styles.stampText}>
                    {s.status === 'error' ? t('stratum.noReading') : t('stratum.notModelled')}
                  </T>
                </View>
              ) : (
                <T kind="display" color={isEgg ? c.crimsonEgg : c.ink}>
                  {s.reading}
                </T>
              )}
              {s.status === 'ok' ? (
                <T kind="mono" style={{ flexShrink: 1 }}>
                  {s.unit}
                </T>
              ) : null}
            </View>
            <T kind="heading" color={isEgg ? c.crimsonEgg : c.ink}>
              {tl(s.headline)}
            </T>
            <T kind="small">{s.detail}</T>
            {s.flag ? (
              <View style={styles.flag}>
                <Glyph name="pin" size={16} color={c.lateriteText} />
                <T kind="small" color={c.lateriteText} style={{ flex: 1 }}>
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
                    <T kind="caption" color={c.ink} style={{ flex: 1 }}>
                      {f.value}
                    </T>
                  </View>
                ))}
              </Animated.View>
            ) : null}
            <View style={styles.foot}>
              <SourceChip source={s.source} />
              {s.facts.length ? <Glyph name={open ? 'close' : 'plus'} size={14} color={c.inkMuted} /> : null}
            </View>
          </>
        )}
      </PressableScale>
    </Animated.View>
  );
}

/** The bottom stratum of every core: dashed, never sealed. Two lines until tapped. */
export function CantSeeBand({ items, order, animate }: { items: string[]; order: number; animate: boolean }) {
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <Animated.View
      entering={animate ? FadeInDown.springify().damping(16).stiffness(170).delay(order * motion.stagger) : undefined}
      layout={LinearTransition.duration(motion.dur.ui)}
      style={styles.cantSee}
    >
      <PressableScale
        onPress={() => setOpen((o) => !o)}
        scaleTo={0.99}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${t('check.cantSee')}. ${items.join(' ')}`}
        style={styles.cantHead}
      >
        <T kind="mono" color={c.ink} style={styles.flex}>
          {String(order + 1).padStart(2, '0')} {t('check.cantSee').toUpperCase()}
        </T>
        <Glyph name={open ? 'close' : 'plus'} size={14} color={c.inkMuted} />
      </PressableScale>
      {!open ? (
        <T kind="small" color={c.ink} numberOfLines={2}>
          {items.join(' · ')}
        </T>
      ) : null}
      {(open ? items : []).map((x, i) => (
        <View key={i} style={styles.fact}>
          <T kind="mono" style={styles.factLabel}>
            {String(i + 1).padStart(2, '0')}
          </T>
          <T kind="small" color={c.ink} style={{ flex: 1 }}>
            {x}
          </T>
        </View>
      ))}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  cantHead: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  band: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.hairline },
  // the column stretches the band's full height, however far the facts open
  column: { width: COL, alignSelf: 'stretch', overflow: 'hidden', borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: c.ink },
  boxLabel: { position: 'absolute', top: 8, left: 3, right: 3, backgroundColor: c.paper, borderWidth: 1, borderColor: c.ink, alignItems: 'center', paddingVertical: 1 },
  boxIndex: { fontSize: 9, lineHeight: 13, letterSpacing: 0.5 },
  body: { flex: 1, paddingVertical: space.md, paddingLeft: space.lg, gap: 4, justifyContent: 'flex-start' },
  stamp: { borderWidth: 1.5, borderColor: c.ink, borderStyle: 'dashed', paddingHorizontal: space.sm, paddingVertical: 4, marginVertical: 6 },
  stampError: { borderColor: c.lateriteText },
  stampText: { letterSpacing: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readingRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  sealed: { flexDirection: 'row', gap: space.sm, alignItems: 'center', paddingVertical: space.md },
  flag: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', marginTop: space.xs },
  facts: { marginTop: space.sm, gap: 6 },
  fact: { flexDirection: 'row', gap: space.md },
  factLabel: { width: 112 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  cantSee: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.ink,
    padding: space.lg,
    gap: space.sm,
    marginTop: space.lg,
    backgroundColor: c.paper,
  },
}));
