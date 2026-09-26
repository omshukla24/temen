import { Camera, Map } from '@maplibre/maplibre-react-native';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHemisphere, formatMetres, summarise, type GroundReport } from 'ground-memory';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Glyph, type GlyphName } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { LoaderHud } from '@/components/LoaderHud';
import { PressableScale } from '@/components/PressableScale';
import { ReadingCounter } from '@/components/ReadingCounter';
import { Screen } from '@/components/Screen';
import { CantSeeBand, StratumBand } from '@/components/Stratum';
import { T } from '@/components/T';
import { useCheck } from '@/features/check/useCheck';
import { useContours, useWaterMask } from '@/features/check/useGroundLayers';
import { useT } from '@/i18n';
import { MAP_ATTRIBUTION, MAP_STYLE } from '@/services/map';
import { CorePull } from '@/setpieces/corepull/CorePull';
import { LiveContours } from '@/setpieces/contours/LiveContours';
import { centreShare } from '@/setpieces/rising/mask';
import { Rising } from '@/setpieces/rising/Rising';
import { SurveySeal } from '@/setpieces/seal/SurveySeal';
import { canSeeFull, placeKey, useIsPro, useUnlocks } from '@/state/entitlements';
import { reports, useCores } from '@/state/reports';
import { useSettings } from '@/state/settings';
import { color, haptic, motion, space } from '@/theme';

const ZOOM = 15.5;
const FREE_STRATA = 2; // water + ground are free; the rest is sealed without a report or Pro

type CheckParams = { id: string; lat?: string; lon?: string; label?: string; egg?: string };

/** A new pin on an open check screen (a link or a second share) drills afresh. */
export default function CheckRoute() {
  const params = useLocalSearchParams<CheckParams>();
  return <Check key={`${params.id}:${params.lat ?? ''}:${params.lon ?? ''}`} params={params} />;
}

function Check({ params }: { params: CheckParams }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const { t, tl, lang } = useT();
  const { speak } = useSettings();
  const check = useCheck(params);
  const { report } = check;
  const lat = report?.lat ?? Number(params.lat);
  const lon = report?.lon ?? Number(params.lon);
  const mask = useWaterMask(lat, lon);
  const contours = useContours(lat, lon);
  const isPro = useIsPro();
  const unlocks = useUnlocks();
  const cores = useCores();
  const saved = !!report && cores.find((c) => c.id === report.id)?.saved;

  const mapH = Math.round(Math.min(380, height * 0.42));
  const [mapReady, setMapReady] = useState(false);
  const rise = useSharedValue(0);
  const drain = useSharedValue(0);
  const [risen, setRisen] = useState(false);
  const [rising, setRising] = useState(false);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(false);
  const [pulled, setPulled] = useState(params.id !== 'new');
  const [stamp, setStamp] = useState(0);
  const [sealUp, setSealUp] = useState(false);
  const pulling = check.phase === 'done' && !pulled && (risen || !mask) && !reduced;
  const share = useMemo(() => (mask ? centreShare(mask) : { pct: 0, gone: false }), [mask]);

  // The Rising: once the map and the mask are both in.
  useEffect(() => {
    if (!mask || !mapReady || rising || risen) return;
    setRising(true);
    setLive(true);
    if (reduced) {
      rise.value = 1;
      setRisen(true);
      return;
    }
    haptic.swell();
    rise.value = withTiming(1, { duration: motion.dur.rising, easing: motion.ease.out });
    const done = setTimeout(() => {
      setRisen(true);
      haptic.tick();
    }, motion.dur.rising);
    const still = setTimeout(() => setLive(false), motion.dur.rising + 6000);
    return () => {
      clearTimeout(done);
      clearTimeout(still);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mask, mapReady]);

  // No mask (offline, or the map failed): don't hold the core back.
  useEffect(() => {
    if (check.phase !== 'done' || risen) return;
    const t = setTimeout(() => setRisen(true), 2500);
    return () => clearTimeout(t);
  }, [check.phase, risen]);

  useEffect(() => {
    if (reduced && check.phase === 'done') setPulled(true);
  }, [reduced, check.phase]);

  useEffect(() => {
    if (pulled && report) {
      const t = setTimeout(() => haptic.seat(), report.strata.length * motion.stagger + 450);
      if (report.flags.buffer) setTimeout(() => haptic.warn(), report.strata.length * motion.stagger + 900);
      return () => clearTimeout(t);
    }
  }, [pulled, report]);

  useEffect(() => {
    if (pulled && report && speak) sayIt(report, lang === 'hi', tl);
    return () => {
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulled, report?.id]);

  const toggleNow = () => {
    haptic.tick();
    const next = !now;
    setNow(next);
    setLive(true);
    drain.value = withTiming(next ? 1 : 0, { duration: reduced ? 0 : 600, easing: motion.ease.inOut });
    setTimeout(() => setLive(false), 4000);
  };

  const full = report ? canSeeFull(placeKey(report.lat, report.lon), report.flags.relief, isPro, unlocks) : false;
  const openPaywall = () =>
    report &&
    router.push({ pathname: '/paywall', params: { place: placeKey(report.lat, report.lon), teaser: report.teaser, id: report.id } });

  const onSave = () => {
    if (!report) return;
    reports.setSaved(report.id, !saved);
    if (!saved) {
      setStamp((s) => s + 1);
      setSealUp(true);
      setTimeout(() => setSealUp(false), 1800);
      haptic.success();
    } else haptic.tick();
  };

  const trail = [t('crumb.ground'), ...check.trail, report?.placeName ?? params.label ?? ''].filter(Boolean);
  const bands = report?.strata.map((s) => ({ hatch: s.hatch, significance: s.significance, status: s.status })) ?? [];
  const actions: { key: string; glyph: GlyphName; label: string; onPress: () => void; lockedUntilFull?: boolean }[] = [
    { key: 'tm', glyph: 'clock', label: t('check.timeMachine'), onPress: () => router.push({ pathname: '/timelapse/[id]', params: { id: report?.id ?? 'new', lat: String(lat), lon: String(lon) } }) },
    { key: 'kit', glyph: 'camera', label: t('check.siteKit'), onPress: () => report && router.push({ pathname: '/site-kit/[id]', params: { id: report.id } }) },
    { key: 'pdf', glyph: 'report', label: t('check.report'), lockedUntilFull: true, onPress: () => (full ? report && router.push({ pathname: '/report/[id]', params: { id: report.id } }) : openPaywall()) },
    { key: 'save', glyph: saved ? 'saved' : 'save', label: saved ? t('check.saved') : t('check.save'), onPress: onSave },
  ];

  return (
    <Screen>
      {/* map stage */}
      <View style={{ height: mapH, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: color.ink }}>
        {Number.isFinite(lat) ? (
          <Map
            style={StyleSheet.absoluteFill}
            mapStyle={MAP_STYLE}
            dragPan={false}
            touchZoom={false}
            doubleTapZoom={false}
            doubleTapHoldZoom={false}
            touchRotate={false}
            touchPitch={false}
            compass={false}
            logo={false}
            attribution={false}
            onDidFinishLoadingMap={() => setMapReady(true)}
            onDidFailLoadingMap={() => setMapReady(true)}
          >
            <Camera initialViewState={{ center: [lon, lat], zoom: ZOOM }} />
          </Map>
        ) : null}
        {mask ? <Rising mask={mask} lat={lat} lon={lon} zoom={ZOOM} width={width} height={mapH} rise={rise} drain={drain} live={live} /> : null}

        {/* the pin */}
        <View pointerEvents="none" style={[styles.pin, { left: width / 2 - 9, top: mapH / 2 - 9 }]}>
          <View style={styles.pinDot} />
        </View>

        {/* HUD */}
        <View style={[styles.hud, { top: insets.top + 56 }]} pointerEvents="none">
          <T kind="mono" color={color.ink} numberOfLines={1}>
            {formatHemisphere(lat, lon, 6)}
          </T>
          <T kind="mono" color={color.ink}>
            ELEV {report?.elevationM != null ? formatMetres(report.elevationM) : '—'} · Z {ZOOM}
          </T>
        </View>
        {rising ? (
          <Animated.View entering={FadeIn} style={styles.hudBottom} pointerEvents="box-none">
            <View style={styles.hudBox} pointerEvents="none">
              <T kind="mono" color={color.ink}>
                WATER TABLE
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
                <ReadingCounter value={2024} from={1984} format="int" style={styles.hudNum} />
                <ReadingCounter value={share.pct} format="pad3" suffix="%" style={styles.hudNum} />
                <T kind="mono">{share.gone ? 'GONE' : 'WATER'}</T>
              </View>
            </View>
            <PressableScale onPress={toggleNow} style={styles.nowChip} accessibilityLabel={now ? 'Show all water seen since 1984' : 'Show only water that is there now'}>
              <T kind="mono" color={color.ground}>
                {now ? '1984–2024' : t('check.now').toUpperCase()}
              </T>
            </PressableScale>
          </Animated.View>
        ) : null}
        <T kind="mono" style={styles.mapAttr} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {MAP_ATTRIBUTION}
        </T>

        <View style={styles.header} pointerEvents="box-none">
          <Breadcrumb
            trail={trail}
            index={report ? `#${report.id.slice(0, 4).toUpperCase()}` : undefined}
            right={
              report ? (
                <PressableScale accessibilityLabel={t('check.listen')} onPress={() => sayIt(report, lang === 'hi', tl)} style={{ width: 44, alignItems: 'center' }}>
                  <Glyph name="speaker" />
                </PressableScale>
              ) : null
            }
          />
        </View>
        {pulling && report ? <CorePull bands={bands} pinX={width / 2} pinY={mapH / 2} width={width} height={mapH} onDone={() => setPulled(true)} /> : null}
      </View>

      {/* result */}
      <View style={{ flex: 1 }}>
        {contours && contours.length ? <LiveContours lines={contours} width={width} height={height - mapH} /> : null}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: insets.bottom + 110, gap: space.lg }}
          refreshControl={
            report ? (
              <RefreshControl refreshing={check.phase === 'drilling' && !!report} onRefresh={check.recore} colors={[color.laterite]} progressBackgroundColor={color.ground} />
            ) : undefined
          }
        >
          {check.phase === 'drilling' ? <LoaderHud progress={check.progress} done={check.done} /> : null}

          {check.phase === 'failed' ? (
            <Animated.View entering={FadeIn} style={{ gap: space.md }}>
              <T kind="title">{t('check.bedrock')}</T>
              <T kind="body">{check.error === 'bedrock' ? t('check.bedrockBody') : check.error}</T>
              <Button label={t('check.recore')} glyph="refresh" onPress={check.recore} />
            </Animated.View>
          ) : null}

          {report && pulled ? (
            <>
              <Animated.View entering={FadeInDown.duration(motion.dur.ui)} style={{ gap: space.xs }}>
                <T kind="mono">
                  {new Date(report.createdAt).toISOString().slice(0, 16).replace('T', ' · ')} UTC · CORE {report.id.toUpperCase()}
                </T>
                <T kind="display" accessibilityRole="header">
                  {tl(report.headline)}
                </T>
              </Animated.View>

              {report.flags.relief ? (
                <View style={styles.relief}>
                  <Glyph name="wave" color={color.ground} size={18} />
                  <T kind="small" color={color.ground} style={{ flex: 1 }}>
                    {t('check.reliefBanner')}
                  </T>
                </View>
              ) : null}

              <View>
                <Hairline strong />
                {report.strata
                  .filter((s) => s.key !== 'cantSee')
                  .map((s, i) => (
                    <StratumBand key={s.key} s={s} order={i} animate={!reduced} sealed={!full && i >= FREE_STRATA && s.key !== 'egg'} onUnlock={openPaywall} />
                  ))}
                <CantSeeBand items={report.cantSee} order={report.strata.length - 1} animate={!reduced} />
              </View>

              {!full ? <Button label={t('check.unlock')} sub={report.teaser} glyph="lock" onPress={openPaywall} /> : null}

              <View style={{ gap: space.sm }}>
                <T kind="mono" color={color.ink}>
                  {t('check.questions').toUpperCase()}
                </T>
                <Hairline />
                {report.questions.map((q, i) => (
                  <View key={i} style={styles.question}>
                    <T kind="display" color={color.laterite} style={styles.qNum}>
                      {i + 1}
                    </T>
                    {full || i === 0 ? (
                      <T kind="body" style={{ flex: 1 }}>
                        {tl(q)}
                      </T>
                    ) : (
                      <PressableScale onPress={openPaywall} style={{ flex: 1 }} accessibilityLabel={t('check.sealedBand')}>
                        <T kind="body" color={color.inkMuted}>
                          {t('check.sealedBand')}
                        </T>
                      </PressableScale>
                    )}
                  </View>
                ))}
              </View>

              <View style={{ gap: space.xs }}>
                <T kind="mono" color={color.ink}>
                  {t('check.sources').toUpperCase()}
                </T>
                <Hairline />
                {report.sources.map((s, i) => (
                  <T key={s.name} kind="caption">
                    {`${i + 1}. `}
                    {s.name} · {s.years} · {s.resolution}
                    {s.licence ? ` · ${s.licence}` : ''}
                  </T>
                ))}
                <T kind="caption">{MAP_ATTRIBUTION}</T>
              </View>

              <Button label={t('check.recore')} glyph="refresh" variant="secondary" onPress={check.recore} />
            </>
          ) : null}
        </ScrollView>

        {sealUp ? (
          <Animated.View entering={FadeIn.duration(motion.dur.micro)} pointerEvents="none" style={[styles.seal, { top: 20, left: width / 2 - 90 }]}>
            <SurveySeal size={180} lat={lat} lon={lon} date={report?.createdAt ?? new Date().toISOString()} stamp={stamp} />
          </Animated.View>
        ) : null}

        {/* action bar */}
        {report ? (
          <View style={[styles.actions, { paddingBottom: insets.bottom + space.sm }]}>
            {actions.map((a) => (
              <PressableScale key={a.key} onPress={a.onPress} style={styles.action} accessibilityLabel={a.label}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Glyph name={a.lockedUntilFull && !full ? 'lock' : a.glyph} color={a.key === 'save' && saved ? color.laterite : color.ink} />
                  <T kind="mono" color={color.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.actionLabel}>
                    {a.label.toUpperCase()}
                  </T>
                </View>
              </PressableScale>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function sayIt(report: GroundReport, hindi: boolean, tl: (s: string) => string) {
  Speech.stop();
  const text = hindi
    ? [tl(report.headline), ...report.strata.filter((s) => s.status === 'ok' && s.key !== 'cantSee').map((s) => `${tl(s.title)}: ${tl(s.headline)}`)].join('। ')
    : summarise(report);
  Speech.speak(text, { language: hindi ? 'hi-IN' : 'en-IN', rate: 0.96 });
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(242,237,228,0.9)' },
  pin: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color.ground, backgroundColor: color.laterite, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.ground },
  hud: { position: 'absolute', left: space.gutter, gap: 2, backgroundColor: 'rgba(242,237,228,0.85)', paddingHorizontal: 6, paddingVertical: 4 },
  hudBottom: { position: 'absolute', left: space.gutter, right: space.gutter, bottom: space.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  hudBox: { backgroundColor: 'rgba(242,237,228,0.9)', paddingHorizontal: 8, paddingVertical: 6, gap: 2 },
  hudNum: { fontFamily: 'MartianMono_400Regular', fontSize: 16, letterSpacing: 1, lineHeight: 22 },
  nowChip: { backgroundColor: color.ink, paddingHorizontal: space.md, borderRadius: 999, minHeight: 36 },
  // mono tracking is absolute (sized for 10.5 pt), so small mono text sets its own
  mapAttr: { position: 'absolute', left: space.sm, right: space.sm, bottom: 2, fontSize: 7, lineHeight: 10, letterSpacing: 0.4, textAlign: 'right', opacity: 0.7 },
  relief: { flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: color.lake, padding: space.md, borderRadius: 4 },
  question: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.xs },
  qNum: { width: 28, lineHeight: 36 },
  seal: { position: 'absolute' },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: color.ground,
    borderTopWidth: 1,
    borderTopColor: color.ink,
    paddingTop: space.sm,
  },
  action: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  actionLabel: { fontSize: 9, lineHeight: 14, letterSpacing: 0.9 },
});
