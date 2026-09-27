import { Camera, Map } from '@maplibre/maplibre-react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHemisphere, formatMetres } from 'ground-memory';

import { Button } from '@/components/Button';
import { Glyph, type GlyphName } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { LoaderHud } from '@/components/LoaderHud';
import { PressableScale } from '@/components/PressableScale';
import { ProBadge } from '@/components/ProBadge';
import { ReadingCounter } from '@/components/ReadingCounter';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { CantSeeBand, StratumBand } from '@/components/Stratum';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { spokenText, useSpeech } from '@/features/check/speech';
import { useCheck } from '@/features/check/useCheck';
import { useContours, useWaterMask } from '@/features/check/useGroundLayers';
import { placeLabel } from '@/features/placeLabel';
import { mapsLink, shareMessage } from '@/features/places/share';
import { useT } from '@/i18n';
import { MAP_ATTRIBUTION } from '@/services/map';
import { CorePull } from '@/setpieces/corepull/CorePull';
import { LiveContours } from '@/setpieces/contours/LiveContours';
import { centreShare } from '@/setpieces/rising/mask';
import { Rising } from '@/setpieces/rising/Rising';
import { SurveySeal } from '@/setpieces/seal/SurveySeal';
import { canSeeFull, placeKey, useIsPro, useUnlocks } from '@/state/entitlements';
import { reports, useCores } from '@/state/reports';
import { font, haptic, makeStyles, motion, radius, space, useTheme } from '@/theme';
import { useReducedMotion } from '@/theme/reduced';

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
  const { c } = useTheme();
  const styles = useStyles();
  const check = useCheck(params);
  const { report } = check;
  const lat = report?.lat ?? Number(params.lat);
  const lon = report?.lon ?? Number(params.lon);
  const mask = useWaterMask(lat, lon);
  const contours = useContours(lat, lon);
  const isPro = useIsPro();
  const unlocks = useUnlocks();
  const cores = useCores();
  const saved = !!report && cores.find((x) => x.id === report.id)?.saved;
  const voice = useSpeech(report?.id ?? null);

  const headerH = insets.top + 64;
  const mapH = Math.round(Math.min(400, height * 0.42)) + insets.top;
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
  const [menu, setMenu] = useState(false);
  const [sources, setSources] = useState(false);
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
    const id = setTimeout(() => setRisen(true), 2500);
    return () => clearTimeout(id);
  }, [check.phase, risen]);

  useEffect(() => {
    if (reduced && check.phase === 'done') setPulled(true);
  }, [reduced, check.phase]);

  useEffect(() => {
    if (pulled && report) {
      const id = setTimeout(() => haptic.seat(), report.strata.length * motion.stagger + 450);
      if (report.flags.buffer) setTimeout(() => haptic.warn(), report.strata.length * motion.stagger + 900);
      return () => clearTimeout(id);
    }
  }, [pulled, report]);

  // Leaving the screen (Time machine, Back) quiets the voice.
  useFocusEffect(
    useCallback(
      () => () => {
        voice.stop();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
  );

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
      toast(t('places.savedToast'), 'saved');
    } else {
      haptic.tick();
      toast(t('places.unsavedToast'), 'save');
    }
  };

  const label = placeLabel({ placeName: report?.placeName ?? (params.label || null), trail: check.trail, lat, lon });
  const bands = report?.strata.map((s) => ({ hatch: s.hatch, significance: s.significance, status: s.status })) ?? [];
  const actions: { key: string; glyph: GlyphName; label: string; onPress: () => void; locked?: boolean; on?: boolean }[] = [
    { key: 'tm', glyph: 'clock', label: t('check.timeMachine'), onPress: () => router.push({ pathname: '/timelapse/[id]', params: { id: report?.id ?? 'new', lat: String(lat), lon: String(lon) } }) },
    { key: 'kit', glyph: 'camera', label: t('check.siteKit'), onPress: () => report && router.push({ pathname: '/site-kit/[id]', params: { id: report.id } }) },
    { key: 'pdf', glyph: 'report', label: t('check.report'), locked: !full, onPress: () => (full ? report && router.push({ pathname: '/report/[id]', params: { id: report.id } }) : openPaywall()) },
    { key: 'save', glyph: saved ? 'saved' : 'save', label: saved ? t('check.saved') : t('check.save'), on: !!saved, onPress: onSave },
  ];

  const shareCore = async () => {
    if (!report) return;
    setMenu(false);
    try {
      await Share.share({ message: shareMessage({ ...label, headline: tl(report.headline), lat, lon, footer: t('places.shareBy') }) });
    } catch {
      toast(t('places.shareFail'));
    }
  };

  return (
    <Screen>
      {/* map stage */}
      <View style={[styles.stage, { height: mapH }]}>
        {Number.isFinite(lat) ? (
          <Map
            style={StyleSheet.absoluteFill}
            mapStyle={c.mapStyle}
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

        {/* HUD: where exactly, and how high */}
        <View style={[styles.hud, { top: headerH + space.sm }]} pointerEvents="none">
          <T kind="mono" color={c.ink} numberOfLines={1} style={styles.hudText}>
            {formatHemisphere(lat, lon, 6)}
          </T>
          <T kind="mono" color={c.ink} style={styles.hudText}>
            ELEV {report?.elevationM != null ? formatMetres(report.elevationM) : '—'} · Z {ZOOM}
          </T>
        </View>
        {rising ? (
          <Animated.View entering={FadeIn} style={styles.hudBottom} pointerEvents="box-none">
            <View style={styles.hudBox} pointerEvents="none">
              <T kind="mono" color={c.ink} style={styles.hudText}>
                WATER TABLE
              </T>
              <View style={styles.hudRow}>
                <ReadingCounter value={2024} from={1984} format="int" style={styles.hudNum} />
                <ReadingCounter value={share.pct} format="pad3" suffix="%" style={styles.hudNum} />
                <T kind="mono" style={styles.hudText}>
                  {share.gone ? 'GONE' : 'WATER'}
                </T>
              </View>
            </View>
            <PressableScale onPress={toggleNow} style={styles.nowChip} accessibilityLabel={now ? t('check.showAll') : t('check.showNow')}>
              <T kind="mono" color={c.ground}>
                {now ? '1984–2024' : t('check.now').toUpperCase()}
              </T>
            </PressableScale>
          </Animated.View>
        ) : null}
        <T kind="mono" style={styles.mapAttr} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {MAP_ATTRIBUTION}
        </T>

        <View style={styles.header} pointerEvents="box-none">
          <Header
            variant="overlay"
            title={label.title}
            subtitle={label.subtitle}
            right={
              report ? (
                <>
                  <IconButton
                    glyph={voice.speaking ? 'stop' : 'speaker'}
                    label={voice.speaking ? t('check.stopListening') : t('check.listen')}
                    color={voice.speaking ? c.lateriteText : undefined}
                    onPress={() => voice.toggle(spokenText(report, lang, tl, label.title, t('check.spokenCantSee')), lang)}
                  />
                  <IconButton glyph="more" label={t('common.more')} onPress={() => setMenu(true)} />
                </>
              ) : null
            }
          />
        </View>
        {pulling && report ? <CorePull bands={bands} pinX={width / 2} pinY={mapH / 2} width={width} height={mapH} onDone={() => setPulled(true)} /> : null}
      </View>

      {/* result */}
      <View style={styles.flex}>
        {contours && contours.length ? <LiveContours lines={contours} width={width} height={height - mapH} /> : null}
        <ScrollView
          contentContainerStyle={[styles.result, { paddingBottom: insets.bottom + 110 }]}
          refreshControl={
            report ? (
              <RefreshControl refreshing={check.phase === 'drilling' && !!report} onRefresh={check.recore} colors={[c.laterite]} progressBackgroundColor={c.paper} />
            ) : undefined
          }
        >
          {check.phase === 'drilling' ? <LoaderHud progress={check.progress} done={check.done} /> : null}

          {check.phase === 'failed' ? (
            <Animated.View entering={FadeIn} style={styles.gapMd}>
              <T kind="title">{t('check.bedrock')}</T>
              <T kind="body">{check.error === 'bedrock' ? t('check.bedrockBody') : check.error}</T>
              <Button label={t('check.recore')} glyph="refresh" onPress={check.recore} />
            </Animated.View>
          ) : null}

          {report && pulled ? (
            <>
              <Animated.View entering={FadeInDown.duration(motion.dur.ui)} style={styles.gapXs}>
                <T kind="mono" numberOfLines={1}>
                  {new Date(report.createdAt).toISOString().slice(0, 10)} · CORE {report.id.slice(0, 6).toUpperCase()}
                </T>
                <T kind="display" accessibilityRole="header">
                  {tl(report.headline)}
                </T>
              </Animated.View>

              {report.flags.relief ? (
                <View style={styles.relief}>
                  <Glyph name="wave" color={c.onLaterite} size={18} />
                  <T kind="small" color={c.onLaterite} style={styles.flex}>
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

              <View style={styles.gapSm}>
                <View style={styles.qHead}>
                  <T kind="mono" color={c.ink} style={styles.flex}>
                    {t('check.questions').toUpperCase()}
                  </T>
                  {!full ? <ProBadge variant="outline" /> : null}
                </View>
                <Hairline />
                {report.questions.map((q, i) => (
                  <View key={i} style={styles.question}>
                    <T kind="display" color={c.lateriteText} style={styles.qNum}>
                      {i + 1}
                    </T>
                    {full || i === 0 ? (
                      <T kind="body" style={styles.flex}>
                        {tl(q)}
                      </T>
                    ) : (
                      <PressableScale onPress={openPaywall} style={styles.flex} accessibilityLabel={t('check.sealedBand')}>
                        <T kind="body" color={c.inkMuted}>
                          {t('check.sealedBand')}
                        </T>
                      </PressableScale>
                    )}
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>

        {sealUp ? (
          <Animated.View entering={FadeIn.duration(motion.dur.micro)} pointerEvents="none" style={[styles.seal, { left: width / 2 - 90 }]}>
            <SurveySeal size={180} lat={lat} lon={lon} date={report?.createdAt ?? new Date().toISOString()} stamp={stamp} />
          </Animated.View>
        ) : null}

        {/* action bar */}
        {report ? (
          <View style={[styles.actions, { paddingBottom: insets.bottom + space.sm }]}>
            {actions.map((a) => (
              <PressableScale key={a.key} onPress={a.onPress} style={styles.action} accessibilityLabel={a.locked ? `${a.label}. ${t('common.pro')}` : a.label}>
                <View style={styles.actionInner}>
                  <Glyph name={a.locked ? 'lock' : a.glyph} color={a.on ? c.lateriteText : c.ink} />
                  <T kind="mono" color={c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.actionLabel}>
                    {a.label.toUpperCase()}
                  </T>
                </View>
              </PressableScale>
            ))}
          </View>
        ) : null}
      </View>

      {/* ⋯ : everything that isn't the reading itself */}
      <Sheet visible={menu} onClose={() => setMenu(false)} title={label.title}>
        <View>
          <ListRow glyph="share" title={t('places.share')} chevron={false} onPress={shareCore} />
          <Hairline />
          <ListRow
            glyph="paste"
            title={t('check.copyCoords')}
            subtitle={formatHemisphere(lat, lon, 6)}
            chevron={false}
            onPress={async () => {
              await Clipboard.setStringAsync(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
              setMenu(false);
              toast(t('check.copied'), 'check');
            }}
          />
          <Hairline />
          <ListRow
            glyph="globe"
            title={t('check.openMaps')}
            chevron={false}
            onPress={() => {
              setMenu(false);
              WebBrowser.openBrowserAsync(mapsLink(lat, lon));
            }}
          />
          <Hairline />
          <ListRow
            glyph="refresh"
            title={t('check.recore')}
            chevron={false}
            onPress={() => {
              setMenu(false);
              check.recore();
            }}
          />
          <Hairline />
          <ListRow
            glyph="layers"
            title={t('check.sourcesMethod')}
            onPress={() => {
              setMenu(false);
              setTimeout(() => setSources(true), motion.dur.exit + 40);
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={sources} onClose={() => setSources(false)} title={t('check.sourcesMethod')}>
        {report ? (
          <View style={styles.gapSm}>
            {report.sources.map((s, i) => (
              <View key={s.name} style={styles.sourceRow}>
                <T kind="mono" color={c.lateriteText}>
                  {String(i + 1).padStart(2, '0')}
                </T>
                <View style={styles.flex}>
                  <T kind="bodyMedium">{s.name}</T>
                  <T kind="caption">{[s.years, s.resolution, s.licence].filter(Boolean).join(' · ')}</T>
                </View>
              </View>
            ))}
            <T kind="caption">{MAP_ATTRIBUTION}</T>
            <Button label={t('about.sources')} variant="quiet" glyph="info" onPress={() => { setSources(false); router.push('/about/sources'); }} />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  gapXs: { gap: space.xs },
  gapSm: { gap: space.sm },
  gapMd: { gap: space.md },
  stage: { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: c.dark ? c.line : c.ink },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  pin: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: c.ground, backgroundColor: c.laterite, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.ground },
  hud: { position: 'absolute', left: space.gutter, gap: 2, backgroundColor: c.veil, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 2 },
  // small mono sets its own tracking
  hudText: { fontSize: 9.5, lineHeight: 14, letterSpacing: 1.4 },
  hudBottom: { position: 'absolute', left: space.gutter, right: space.gutter, bottom: space.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  hudBox: { backgroundColor: c.veil, paddingHorizontal: 8, paddingVertical: 6, gap: 2, borderRadius: 2 },
  hudRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  hudNum: { fontFamily: font.mono, fontSize: 16, letterSpacing: 1, lineHeight: 22, color: c.ink },
  nowChip: { backgroundColor: c.ink, paddingHorizontal: space.md, borderRadius: radius.pill, minHeight: 36, justifyContent: 'center' },
  mapAttr: { position: 'absolute', left: space.sm, right: space.sm, bottom: 2, fontSize: 7, lineHeight: 10, letterSpacing: 0.4, textAlign: 'right', opacity: 0.7 },
  result: { paddingHorizontal: space.gutter, paddingTop: space.lg, gap: space.lg },
  relief: { flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: c.lake, padding: space.md, borderRadius: radius.sm },
  qHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  question: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.xs },
  qNum: { width: 28, lineHeight: 36 },
  seal: { position: 'absolute', top: 20 },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: c.ground,
    borderTopWidth: 1,
    borderTopColor: c.dark ? c.line : c.ink,
    paddingTop: space.sm,
  },
  action: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  actionInner: { alignItems: 'center', gap: 4, minHeight: 44, justifyContent: 'center' },
  actionLabel: { fontSize: 9, lineHeight: 14, letterSpacing: 0.9 },
  sourceRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
}));
