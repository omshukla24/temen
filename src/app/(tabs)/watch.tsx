import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FORECAST_SOURCE, RAIN_RULES, hourlyStrip } from 'ground-memory';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Glyph } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { PressableScale } from '@/components/PressableScale';
import { ProBadge } from '@/components/ProBadge';
import { RollingNumber } from '@/components/RollingNumber';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { RegMarks } from '@/components/Staff';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { Toggle } from '@/components/Toggle';
import { useShareCard } from '@/features/card/useShareCard';
import { placeLabel } from '@/features/placeLabel';
import { useT } from '@/i18n';
import { openSaved } from '@/services/nav';
import {
  enableBackgroundWatch,
  isBackgroundWatchOn,
  lastReadings,
  mutedPlaces,
  runWatch,
  setMuted,
  setupNotifications,
  watchedPlaces,
} from '@/services/watch';
import { useIsPro } from '@/state/entitlements';
import { reports, useCores } from '@/state/reports';
import { haptic, makeStyles, motion, radius, space, useTheme } from '@/theme';

/** Monsoon Watch: next-24 h rain at every saved place, with a local alert past 64.5 mm. */
export default function Watch() {
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const isPro = useIsPro();
  const cores = useCores(); // re-render when saved places change
  const places = watchedPlaces();
  const card = useShareCard();
  const [last, setLast] = useState(lastReadings);
  const [busy, setBusy] = useState(false);
  const [bg, setBg] = useState(false);
  const [muted, setMutedIds] = useState(mutedPlaces);
  const [adding, setAdding] = useState(false);
  const addable = cores.filter((x) => !x.saved);

  useEffect(() => {
    isBackgroundWatchOn().then(setBg);
  }, []);

  const toggleMute = async (id: string, name: string) => {
    const off = !muted.includes(id);
    setMutedIds(await setMuted(id, off));
    haptic.tick();
    toast(off ? t('watch.mutedToast', { place: name }) : t('watch.unmutedToast', { place: name }), off ? 'bellOff' : 'bell');
  };
  const unwatch = (id: string, name: string) => {
    reports.setSaved(id, false);
    haptic.tick();
    toast(t('watch.removed', { place: name }), 'save');
  };

  const check = async () => {
    setBusy(true);
    await setupNotifications().catch(() => false);
    const r = await runWatch(true);
    setLast({ ...r });
    setBusy(false);
    haptic[Object.values(r).some((x) => x.reading?.heavy) ? 'warn' : 'tick']();
  };

  return (
    <Screen seed={23}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Header
          variant="large"
          eyebrow={isPro ? t('watch.next24') : t('common.pro')}
          title={t('watch.title')}
          measure={['NOW', '+12 H', '+24 H']}
          right={
            isPro ? (
              <View style={styles.headRight}>
                <IconButton glyph="plus" label={t('watch.add')} onPress={() => setAdding(true)} />
                <IconButton glyph="refresh" label={t('watch.check')} disabled={busy || places.length === 0} onPress={check} />
              </View>
            ) : (
              <ProBadge />
            )
          }
        />
        <View style={styles.body}>
          <T kind="small">{t('watch.lede')}</T>

          {!isPro ? (
            <Animated.View entering={FadeInDown.duration(motion.dur.ui)} style={styles.card}>
              <RegMarks />
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
                const reading = r?.reading ?? null;
                const mm = reading?.next24hMm ?? null;
                const heavy = !!reading?.heavy;
                const tint = heavy ? c.lateriteText : c.ink;
                const strip = reading && r ? hourlyStrip(reading, new Date(r.at)) : null;
                const peak = strip ? Math.max(...strip) : 0;
                const status = r?.error ? r.error : mm === null ? t('watch.notChecked') : heavy ? t('watch.heavy') : mm > 0 ? t('watch.calm') : t('watch.dry');
                const quiet = muted.includes(p.id);
                const meta = [
                  r ? t('watch.checked', { time: clock(r.at) }) : null,
                  reading?.updatedAt ? t('watch.run', { time: clock(reading.updatedAt) }) : null,
                  peak > 0 ? t('watch.peak', { mm: mmText(peak) }) : null,
                ].filter(Boolean);
                return (
                  <Animated.View key={p.id} entering={FadeInDown.delay(i * motion.stagger).duration(motion.dur.ui)}>
                    <PressableScale
                      onPress={() => openSaved(p.id)}
                      scaleTo={0.985}
                      style={styles.row}
                      accessibilityLabel={`${p.name}. ${status}. ${mm === null ? '' : t('watch.mmA11y', { n: mmText(mm) })}`}
                    >
                      <View style={styles.rowTop}>
                        <Glyph name={heavy ? 'wave' : 'pin'} color={heavy ? c.lateriteText : c.inkMuted} />
                        <View style={styles.flex}>
                          <T kind="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.place}>
                            {p.name}
                          </T>
                          <T kind="small" color={heavy ? c.lateriteText : c.inkMuted}>
                            {status}
                          </T>
                        </View>
                        <View style={styles.mm}>
                          {mm === null ? <T kind="display">—</T> : <RollingNumber value={mmText(mm)} kind="display" color={tint} />}
                          <T kind="mono">MM · 24 H</T>
                        </View>
                      </View>
                      {strip ? <RainStrip hours={strip} heavy={heavy} label={t('watch.stripA11y', { mm: mmText(peak) })} /> : null}
                      {meta.length || quiet ? (
                        <T kind="mono" numberOfLines={2} style={styles.meta}>
                          {[...meta, quiet ? t('watch.muted') : null].filter(Boolean).join(' · ')}
                        </T>
                      ) : null}
                    </PressableScale>
                    <View style={styles.rowKeys}>
                      <IconButton
                        glyph={quiet ? 'bellOff' : 'bell'}
                        size={19}
                        color={quiet ? c.inkMuted : c.ink}
                        label={`${quiet ? t('watch.unmute') : t('watch.mute')}, ${p.name}`}
                        onPress={() => toggleMute(p.id, p.name)}
                      />
                      <IconButton glyph="card" size={19} label={`${t('places.card')}, ${p.name}`} onPress={() => card.share(p.id)} />
                      <IconButton glyph="arrow" size={19} label={`${t('places.openHint')}, ${p.name}`} onPress={() => openSaved(p.id)} />
                      <View style={styles.grow} />
                      <IconButton glyph="close" size={17} color={c.inkMuted} label={`${t('watch.remove')}, ${p.name}`} onPress={() => unwatch(p.id, p.name)} />
                    </View>
                    <Hairline />
                  </Animated.View>
                );
              })}
            </View>
          )}

          <View style={styles.note}>
            <View style={styles.noteMark} />
            <T kind="small" color={c.ink} style={styles.flex}>
              {t('watch.lookAhead')} {t('watch.notPrediction')}
            </T>
          </View>

          {isPro ? <Button label={t('watch.add')} glyph="plus" variant="secondary" onPress={() => setAdding(true)} /> : null}
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
            {t('watch.footnote', { mm: RAIN_RULES.heavyMm })} {FORECAST_SOURCE.name} · {FORECAST_SOURCE.licence}.
          </T>
        </View>
      </ScrollView>

      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('watch.addTitle')}>
        <View style={styles.addList}>
          <T kind="small">{t('watch.addBody')}</T>
          <View>
            {addable.slice(0, 8).map((x, i) => (
              <View key={x.id}>
                {i ? <Hairline /> : null}
                <ListRow
                  glyph="plus"
                  title={placeLabel(x).title}
                  subtitle={placeLabel(x).subtitle}
                  chevron={false}
                  onPress={() => {
                    reports.setSaved(x.id, true);
                    haptic.success();
                    toast(t('watch.added', { place: placeLabel(x).title }), 'bell');
                    setAdding(false);
                  }}
                />
              </View>
            ))}
            {!addable.length ? <T kind="caption">{t('watch.addNone')}</T> : null}
            <Hairline />
            <ListRow
              glyph="search"
              title={t('watch.searchNew')}
              onPress={() => {
                setAdding(false);
                router.navigate('/');
              }}
            />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

/** 0.3 under 10 mm, whole millimetres above. */
function mmText(mm: number): string {
  return mm > 0 && mm < 10 ? mm.toFixed(1) : String(Math.round(mm));
}

/** Local HH:MM, without leaning on Intl. */
function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Full height at 10 mm in an hour (a downpour). */
const STRIP_FULL_MM = 10;

/** The next 24 hours as rain bars: a baseline tick for a dry hour, a bar for a wet one. */
function RainStrip({ hours, heavy, label }: { hours: number[]; heavy: boolean; label: string }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.strip} accessible accessibilityLabel={label}>
      {hours.map((mm, i) => (
        <View key={i} style={styles.hour}>
          <View
            style={[
              styles.bar,
              mm > 0
                ? { height: Math.max(3, Math.min(1, mm / STRIP_FULL_MM) * 34), backgroundColor: heavy ? c.laterite : c.lake }
                : { height: i % 6 === 0 ? 6 : 2, backgroundColor: c.inkMuted },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1, gap: 2 },
  scroll: { paddingBottom: space.xxxl },
  body: { paddingHorizontal: space.gutter, gap: space.lg },
  card: { borderWidth: 1.5, borderColor: c.ink, borderRadius: radius.none, padding: space.lg, gap: space.md, backgroundColor: c.paper },
  row: { paddingTop: space.md, gap: space.sm },
  rowKeys: { flexDirection: 'row', alignItems: 'center', marginLeft: -10, paddingBottom: space.xs },
  grow: { flex: 1 },
  headRight: { flexDirection: 'row', alignItems: 'center' },
  addList: { gap: space.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  place: { fontSize: 20, lineHeight: 25 },
  mm: { alignItems: 'flex-end' },
  strip: { flexDirection: 'row', alignItems: 'flex-end', height: 38, gap: 2, borderBottomWidth: 1.5, borderBottomColor: c.ink },
  hour: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%' },
  // small mono sets its own tracking
  meta: { fontSize: 8.5, lineHeight: 13, letterSpacing: 1.1 },
  note: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md, paddingVertical: space.xs },
  noteMark: { width: 8, height: 8, marginTop: 6, backgroundColor: c.accent, borderWidth: 1, borderColor: c.ink },
}));
