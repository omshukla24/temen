import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FORECAST_SOURCE, RAIN_RULES } from 'ground-memory';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Glyph } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { Header } from '@/components/Header';
import { ListRow } from '@/components/ListRow';
import { PressableScale } from '@/components/PressableScale';
import { ProBadge } from '@/components/ProBadge';
import { RollingNumber } from '@/components/RollingNumber';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { Toggle } from '@/components/Toggle';
import { useT } from '@/i18n';
import { openSaved } from '@/services/nav';
import { enableBackgroundWatch, lastReadings, runWatch, setupNotifications, watchedPlaces } from '@/services/watch';
import { useIsPro } from '@/state/entitlements';
import { useCores } from '@/state/reports';
import { haptic, makeStyles, motion, radius, space, useTheme } from '@/theme';

/** Monsoon Watch: next-24 h rain at every saved place, with a local alert past 64.5 mm. */
export default function Watch() {
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const isPro = useIsPro();
  useCores(); // re-render when saved places change
  const places = watchedPlaces();
  const [last, setLast] = useState(lastReadings);
  const [busy, setBusy] = useState(false);
  const [bg, setBg] = useState(false);

  const check = async () => {
    setBusy(true);
    await setupNotifications().catch(() => false);
    const r = await runWatch(true);
    setLast({ ...r });
    setBusy(false);
    haptic[Object.values(r).some((x) => x.reading?.heavy) ? 'warn' : 'tick']();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Header variant="large" eyebrow={isPro ? t('watch.next24') : t('common.pro')} title={t('watch.title')} right={!isPro ? <ProBadge /> : null} />
        <View style={styles.body}>
          <T kind="small">{t('watch.lede')}</T>

          {!isPro ? (
            <Animated.View entering={FadeInDown.duration(motion.dur.ui)} style={styles.card}>
              <T kind="heading">{t('watch.pro')}</T>
              <Button label={t('common.seePro')} glyph="star" onPress={() => router.push('/paywall')} />
            </Animated.View>
          ) : null}

          {places.length === 0 ? (
            <EmptyState glyph="bell" title={t('watch.emptyTitle')} body={t('watch.empty')} action={t('places.goHome')} onAction={() => router.navigate('/')} />
          ) : (
            <View>
              <Hairline strong />
              {places.map((p, i) => {
                const r = last[p.id];
                const mm = r?.reading?.next24hMm ?? null;
                const heavy = !!r?.reading?.heavy;
                const share = mm === null ? 0 : Math.min(1, mm / (RAIN_RULES.heavyMm * 1.5));
                const tint = heavy ? c.lateriteText : c.ink;
                return (
                  <Animated.View key={p.id} entering={FadeInDown.delay(i * motion.stagger).duration(motion.dur.ui)}>
                    <PressableScale
                      onPress={() => openSaved(p.id)}
                      scaleTo={0.985}
                      style={styles.row}
                      accessibilityLabel={`${p.name}. ${mm === null ? t('watch.notChecked') : t('watch.mmA11y', { n: Math.round(mm) })}`}
                    >
                      <View style={styles.rowTop}>
                        <Glyph name={heavy ? 'wave' : 'pin'} color={heavy ? c.lateriteText : c.inkMuted} />
                        <View style={styles.flex}>
                          <T kind="heading" numberOfLines={1}>
                            {p.name}
                          </T>
                          <T kind="small" color={heavy ? c.lateriteText : c.inkMuted}>
                            {r?.error ? r.error : mm === null ? t('watch.notChecked') : heavy ? t('watch.heavy') : t('watch.calm')}
                          </T>
                        </View>
                        <View style={styles.mm}>
                          {mm === null ? (
                            <T kind="title">—</T>
                          ) : (
                            <RollingNumber value={`${Math.round(mm)}`} kind="title" color={tint} />
                          )}
                          <T kind="mono">MM</T>
                        </View>
                      </View>
                      {/* rain gauge: fills towards the IMD heavy line */}
                      <View style={styles.gauge}>
                        <View style={[styles.gaugeFill, { width: `${share * 100}%`, backgroundColor: heavy ? c.laterite : c.lake }]} />
                        <View style={styles.gaugeMark} />
                      </View>
                    </PressableScale>
                    <Hairline />
                  </Animated.View>
                );
              })}
            </View>
          )}

          <Button label={t('watch.check')} glyph="refresh" loading={busy} onPress={check} disabled={busy || places.length === 0 || !isPro} />
          <ListRow
            glyph="bell"
            title={t('watch.background')}
            right={
              <Toggle
                value={bg}
                disabled={!isPro}
                label={t('watch.background')}
                onValueChange={async (v) => {
                  setBg(v);
                  if (v) await setupNotifications();
                  await enableBackgroundWatch(v);
                }}
              />
            }
          />
          <T kind="caption">
            {t('watch.footnote', { mm: RAIN_RULES.heavyMm })} {FORECAST_SOURCE.name} · {FORECAST_SOURCE.licence}. {t('watch.notPrediction')}
          </T>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1, gap: 2 },
  scroll: { paddingBottom: space.xxxl },
  body: { paddingHorizontal: space.gutter, gap: space.lg },
  card: { borderWidth: 1, borderColor: c.dark ? c.line : c.ink, borderRadius: radius.sm, padding: space.lg, gap: space.md, backgroundColor: c.paper },
  row: { paddingVertical: space.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mm: { alignItems: 'flex-end' },
  gauge: { height: 3, backgroundColor: c.hairline, marginTop: space.sm },
  gaugeFill: { height: 3 },
  gaugeMark: { position: 'absolute', left: `${(1 / 1.5) * 100}%`, top: -3, width: 1, height: 9, backgroundColor: c.ink },
}));
