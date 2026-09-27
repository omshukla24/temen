import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CoreSliver } from '@/components/CoreSliver';
import { EmptyState } from '@/components/EmptyState';
import { Hairline } from '@/components/Hairline';
import { Header } from '@/components/Header';
import { ProBadge } from '@/components/ProBadge';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { initialPick, MAX_COMPARE, toggleIn } from '@/features/compare/pick';
import { notable, ROWS } from '@/features/compare/rank';
import { placeLabel } from '@/features/placeLabel';
import { useT } from '@/i18n';
import { CoreCylinder } from '@/setpieces/CoreCylinder';
import { useIsPro } from '@/state/entitlements';
import { reports, useCores } from '@/state/reports';
import { haptic, makeStyles, motion, radius, space, useTheme } from '@/theme';

const COL = 148;
const ROW_H = 78;

/** The core tray: 2–5 cores side by side, strata aligned, the most notable reading per row marked. */
export default function Compare() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const insets = useSafeAreaInsets();
  const { t, tl } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const isPro = useIsPro();
  const cores = useCores();
  const [picked, setPicked] = useState<readonly string[]>(() => initialPick(cores, ids));
  const full = useMemo(() => picked.map((id) => reports.get(id)?.report).filter((r): r is NonNullable<typeof r> => !!r), [picked]);
  const marks = useMemo(() => notable(full), [full]);

  const toggle = (id: string) => {
    haptic.tick();
    setPicked((p) => toggleIn(p, id));
  };

  return (
    <Screen seed={29}>
      <Header title={t('compare.title')} subtitle={`${picked.length}/${MAX_COMPARE}`} right={!isPro ? <ProBadge style={styles.badge} /> : null} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl, gap: space.lg }}>
        {cores.length < 2 ? (
          <EmptyState glyph="tray" title={t('compare.emptyTitle')} body={t('compare.emptyBody')} action={t('places.goHome')} onAction={() => router.navigate('/')} />
        ) : !isPro ? (
          <View style={[styles.pad, styles.card]}>
            <T kind="heading">{t('compare.proTitle')}</T>
            <T kind="small">{t('compare.proBody')}</T>
            <Button label={t('common.seePro')} glyph="star" onPress={() => router.push('/paywall')} />
          </View>
        ) : full.length >= 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.gutter }}>
            <View style={{ flexDirection: 'row' }}>
              {/* row labels */}
              <View style={{ width: 64, paddingTop: 168 }}>
                {ROWS.map((k, i) => (
                  <View key={k} style={[styles.cell, { height: ROW_H }]}>
                    <T kind="mono" color={c.ink}>
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
                    <T kind="heading" numberOfLines={2} style={styles.colTitle}>
                      {placeLabel({ placeName: r.placeName, lat: r.lat, lon: r.lon }).title}
                    </T>
                  </View>
                  {ROWS.map((k) => {
                    const s = r.strata.find((x) => x.key === k);
                    const mark = marks[k] === r.id;
                    return (
                      <View key={k} style={[styles.cell, { height: ROW_H }, mark && styles.marked]} accessibilityLabel={`${r.placeName}, ${k}: ${s?.reading ?? t('compare.none')}. ${mark ? t('compare.notable') : ''}`}>
                        <T kind="title" color={mark ? c.lateriteText : c.ink} numberOfLines={1}>
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
            {t('compare.pickTwo')}
          </T>
        )}

        {cores.length >= 2 ? (
          <View>
            <T kind="mono" color={c.ink} style={styles.pad}>
              {t('compare.pick').toUpperCase()}
            </T>
            <Hairline />
            {cores.map((core) => (
              <Animated.View key={core.id} entering={FadeIn}>
                <CoreSliver core={core} onPress={toggle} selecting selected={picked.includes(core.id)} />
                <Hairline />
              </Animated.View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  pad: { paddingHorizontal: space.gutter },
  card: { gap: space.md, marginHorizontal: space.gutter, paddingVertical: space.lg, borderWidth: 1.5, borderColor: c.ink, borderRadius: radius.none, backgroundColor: c.paper },
  badge: { marginRight: space.md },
  colTitle: { marginTop: space.sm },
  head: { height: 168, justifyContent: 'flex-end', paddingRight: space.md, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: c.ink },
  cell: { borderBottomWidth: 1, borderBottomColor: c.hairline, paddingVertical: space.sm, paddingRight: space.md, justifyContent: 'center' },
  marked: { borderLeftWidth: 3, borderLeftColor: c.laterite, paddingLeft: space.sm, backgroundColor: c.groundDeep },
}));
