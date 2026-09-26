import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { CoreSliver } from '@/components/CoreSliver';
import { Hairline } from '@/components/Hairline';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { notable, ROWS } from '@/features/compare/rank';
import { useT } from '@/i18n';
import { CoreCylinder } from '@/setpieces/CoreCylinder';
import { useIsPro } from '@/state/entitlements';
import { reports, useCores } from '@/state/reports';
import { color, haptic, motion, space } from '@/theme';

const COL = 148;
const ROW_H = 78;
const MAX = 5;

/** The core tray: 2–5 cores side by side, strata aligned, the most notable reading per row marked. */
export default function Compare() {
  const insets = useSafeAreaInsets();
  const { t, tl } = useT();
  const isPro = useIsPro();
  const cores = useCores();
  const [picked, setPicked] = useState<string[]>(() => cores.filter((c) => c.saved).slice(0, 3).map((c) => c.id));
  const full = useMemo(() => picked.map((id) => reports.get(id)?.report).filter((r): r is NonNullable<typeof r> => !!r), [picked]);
  const marks = useMemo(() => notable(full), [full]);

  const toggle = (id: string) => {
    haptic.tick();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));
  };

  return (
    <Screen>
      <Breadcrumb trail={['Ground', t('compare.title')]} index={`${picked.length}/${MAX}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl, gap: space.lg }}>
        <View style={styles.pad}>
          <T kind="title">{t('compare.lede')}</T>
        </View>

        {!isPro ? (
          <View style={[styles.pad, { gap: space.sm }]}>
            <T kind="small">{t('compare.pro')}</T>
            <Button label="See Pro" glyph="lock" onPress={() => router.push('/paywall')} />
          </View>
        ) : full.length >= 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter }}>
            <View style={{ flexDirection: 'row' }}>
              {/* row labels */}
              <View style={{ width: 64, paddingTop: 168 }}>
                {ROWS.map((k, i) => (
                  <View key={k} style={[styles.cell, { height: ROW_H }]}>
                    <T kind="mono" color={color.ink}>
                      {String(i + 1).padStart(2, '0')}
                    </T>
                    <T kind="mono">{tl(k === 'quakes' ? 'Quakes' : k[0].toUpperCase() + k.slice(1)).toUpperCase()}</T>
                  </View>
                ))}
              </View>
              {full.map((r, ci) => (
                <Animated.View key={r.id} entering={FadeInRight.delay(ci * motion.stagger).springify().damping(18)} layout={LinearTransition} style={{ width: COL }}>
                  <View style={styles.head}>
                    <CoreCylinder width={30} height={96} bands={r.strata.map((s) => ({ hatch: s.hatch, significance: s.significance, status: s.status }))} tilt={0.2} />
                    <T kind="heading" numberOfLines={2} style={{ marginTop: space.sm }}>
                      {r.placeName ?? r.id}
                    </T>
                  </View>
                  {ROWS.map((k) => {
                    const s = r.strata.find((x) => x.key === k);
                    const mark = marks[k] === r.id;
                    return (
                      <View key={k} style={[styles.cell, { height: ROW_H }, mark && styles.marked]} accessibilityLabel={`${r.placeName}, ${k}: ${s?.reading ?? 'none'}. ${mark ? 'Most notable in this row.' : ''}`}>
                        <T kind="title" color={mark ? color.laterite : color.ink} numberOfLines={1}>
                          {s?.status === 'ok' ? s.reading : '—'}
                        </T>
                        <T kind="caption" numberOfLines={2}>
                          {s ? tl(s.headline) : ''}
                        </T>
                      </View>
                    );
                  })}
                </Animated.View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <T kind="small" style={styles.pad}>
            {t('compare.pick')}
          </T>
        )}

        <View style={styles.pad}>
          <T kind="mono" color={color.ink}>
            {t('compare.pick').toUpperCase()}
          </T>
          <Hairline />
          {cores.map((c) => (
            <Animated.View key={c.id} entering={FadeIn}>
              <CoreSliver core={c} onPress={() => toggle(c.id)} selected={picked.includes(c.id)} />
              <Hairline />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.gutter },
  head: { height: 168, justifyContent: 'flex-end', paddingRight: space.md, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: color.ink },
  cell: { borderBottomWidth: 1, borderBottomColor: color.hairline, paddingVertical: space.sm, paddingRight: space.md, justifyContent: 'center' },
  marked: { borderLeftWidth: 3, borderLeftColor: color.laterite, paddingLeft: space.sm, backgroundColor: 'rgba(165,72,42,0.05)' },
});
