import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, Share, View, type TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionChips } from '@/components/ActionChips';
import { Button } from '@/components/Button';
import { CoreSliver } from '@/components/CoreSliver';
import { Field } from '@/components/Field';
import { Glyph, type GlyphName } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { PressableScale } from '@/components/PressableScale';
import { ProBadge } from '@/components/ProBadge';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { RegMarks, Staff } from '@/components/Staff';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { useShareCard } from '@/features/card/useShareCard';
import { directRow, EGG, EGG_FALLBACK, firstName, fixText, greetingKey, latestCore, savedCores, shouldSearch } from '@/features/home/logic';
import { placeLabel } from '@/features/placeLabel';
import { shareMessage } from '@/features/places/share';
import { useDebounced } from '@/hooks/useDebounced';
import { useFix } from '@/hooks/useFix';
import { useT } from '@/i18n';
import { CoreCylinder } from '@/setpieces/CoreCylinder';
import { useAccount } from '@/services/account';
import { placeName, searchPlaces, type Place } from '@/services/geocode';
import { relief } from '@/services/ground';
import { currentFix, permission } from '@/services/location';
import { openCheck, openSaved } from '@/services/nav';
import { resolveShared } from '@/services/share-in';
import { useIsPro } from '@/state/entitlements';
import { reports, useCores, type CoreSummary } from '@/state/reports';
import { updateSettings, useSettings } from '@/state/settings';
import { haptic, makeStyles, motion, radius, space, useTheme } from '@/theme';

const enter = (i: number) => FadeInDown.delay(i * motion.stagger * 2).duration(motion.dur.ui).easing(motion.ease.out);
/** Re-name where you are only after moving this far (m, roughly). */
const RENAME_M = 250;

export default function Home() {
  const insets = useSafeAreaInsets();
  const { t, tl } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const cores = useCores();
  const isPro = useIsPro();
  const { user } = useAccount();
  const { shareHintSeen } = useSettings();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const fix = useFix(focused);
  const [here, setHere] = useState<{ name: string; town: string | null } | null>(null);
  const named = useRef<{ lat: number; lon: number } | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState('');
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [reliefNear, setReliefNear] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const card = useShareCard();
  const [menuFor, setMenuFor] = useState<CoreSummary | null>(null);
  const [asking, setAsking] = useState<CoreSummary | null>(null);
  const openMenu = useCallback(
    (id: string) => {
      haptic.tick();
      setMenuFor(cores.find((x) => x.id === id) ?? null);
    },
    [cores],
  );
  const dq = useDebounced(q, 400);
  const direct = useMemo(() => directRow(q), [q]);

  // Photon search for anything that isn't already a pin, a link or the egg.
  useEffect(() => {
    const text = dq.trim();
    if (!shouldSearch(text)) {
      setResults([]);
      setSearched('');
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    searchPlaces(text, fix.status === 'ok' ? fix.fix : undefined, ctrl.signal)
      .then((r) => {
        setResults(r);
        setSearched(text);
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  // Name where you stand: the locality large, the town small.
  useEffect(() => {
    if (fix.status !== 'ok') return;
    const { lat, lon } = fix.fix;
    const last = named.current;
    if (last && Math.hypot((lat - last.lat) * 111_000, (lon - last.lon) * 111_000 * Math.cos((lat * Math.PI) / 180)) < RENAME_M) return;
    named.current = { lat, lon };
    placeName(lat, lon).then((n) => n && setHere({ name: n.name, town: n.trail[0] ?? null }));
  }, [fix]);

  // Relief mode: an active flood near where you are.
  const reliefAsked = useRef(false);
  useEffect(() => {
    if (fix.status !== 'ok' || reliefAsked.current) return;
    reliefAsked.current = true;
    relief(fix.fix).then((r) => {
      if (r.ok && r.value.inZone && r.value.event) setReliefNear(r.value.event.name);
    });
  }, [fix]);

  const coreHere = async () => {
    setNote(null);
    setLocating(true);
    try {
      const p = await permission();
      if (!p.granted) {
        setNote(t('home.fixDenied'));
        haptic.fail();
        return;
      }
      const f = fix.status === 'ok' && Date.now() - fix.fix.at < 60_000 ? fix.fix : await currentFix();
      openCheck({ lat: f.lat, lon: f.lon, label: here?.name });
    } catch {
      setNote(t('home.fixSlow'));
      haptic.fail();
    } finally {
      setLocating(false);
    }
  };

  const openDirect = async () => {
    Keyboard.dismiss();
    if (direct?.kind === 'egg') {
      const at = fix.status === 'ok' ? fix.fix : EGG_FALLBACK;
      router.push({ pathname: '/check/[id]', params: { id: 'new', lat: String(at.lat), lon: String(at.lon), label: 'Temen-ni-gru', egg: '1' } });
      return;
    }
    const r = await resolveShared(q, fix.status === 'ok' ? fix.fix : undefined);
    if ('error' in r) {
      setNote(t('home.shareNone'));
      haptic.fail();
    } else openCheck(r);
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      setNote(t('home.clipEmpty'));
      return;
    }
    setQ(text.trim());
    input.current?.focus();
  };

  const timeMachine = () => {
    const at = fix.status === 'ok' ? { id: 'new', lat: fix.fix.lat, lon: fix.fix.lon } : latestCore(cores);
    if (!at) {
      toast(t('home.shortTimeNone'), 'clock');
      return;
    }
    router.push({ pathname: '/timelapse/[id]', params: { id: at.id, lat: String(at.lat), lon: String(at.lon) } });
  };
  const shareText = async (core: CoreSummary) => {
    try {
      await Share.share({ message: shareMessage({ ...placeLabel(core), headline: tl(core.headline), lat: core.lat, lon: core.lon, footer: t('places.shareBy') }) });
    } catch {
      toast(t('places.shareFail'));
    }
  };

  const hour = new Date().getHours();
  const name = firstName(user?.name);
  const greeting = name ? t('home.greetName', { greeting: t(greetingKey(hour)), name }) : t(greetingKey(hour));
  const latest = latestCore(cores);
  const saved = savedCores(cores).filter((s) => s.id !== latest?.id).slice(0, 8);
  const typing = q.trim().length > 0;

  const directTitle = !direct
    ? ''
    : direct.kind === 'egg'
      ? 'TEMEN-NI-GRU'
      : direct.kind === 'link'
        ? t('home.sharedLink')
        : direct.title;

  return (
    <Screen seed={7} drift={focused}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* masthead: the wordmark and membership */}
        <Animated.View entering={enter(0)} style={styles.masthead}>
          <T kind="wordmark" accessibilityRole="header" accessibilityLabel="Temen">
            TEMEN
          </T>
          <View style={styles.flex} />
          {isPro ? (
            <ProBadge />
          ) : (
            <PressableScale onPress={() => router.push('/paywall')} style={styles.goPro} accessibilityLabel={t('home.goPro')}>
              <T kind="mono" color={c.ink} style={styles.goProText}>
                {t('home.goPro').toUpperCase()}
              </T>
            </PressableScale>
          )}
        </Animated.View>

        {/* where you stand: the locality as big as the screen allows */}
        <Animated.View entering={enter(1)} style={styles.where}>
          <View style={styles.eyebrow}>
            <View style={[styles.dot, fix.status === 'ok' && styles.dotOn]} />
            <T kind="mono" color={fix.status === 'ok' ? c.accentText : c.inkMuted} numberOfLines={1} style={styles.flex}>
              {fix.status === 'ok' && here ? t('home.standingOn') : greeting}
            </T>
          </View>
          <T kind="hero" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.55} accessibilityRole="header">
            {here?.name ?? t('home.whereTo')}
          </T>
          <T kind="mono" color={c.ink} numberOfLines={1} accessibilityLiveRegion="polite">
            {fix.status === 'ok'
              ? [here?.town, fixText(fix.fix)].filter(Boolean).join(' · ')
              : fix.status === 'off'
                ? t('home.fixOff')
                : fix.status === 'denied'
                  ? t('home.fixDenied')
                  : here
                    ? t('home.fixWaiting')
                    : t('home.pickPlace')}
          </T>
          {/* one tick a year: the record under your feet, 1984 to 2024 */}
          <Staff ticks={40} labels={['1984', t('home.scaleMid'), '2024']} style={styles.staff} />
        </Animated.View>

        {reliefNear ? (
          <Animated.View entering={FadeIn} style={styles.relief}>
            <Glyph name="wave" color={c.onLaterite} size={18} />
            <View style={styles.flex}>
              <T kind="mono" color={c.onLaterite}>
                {t('home.reliefTitle')}
              </T>
              <T kind="small" color={c.onLaterite}>
                {t('home.relief')} ({reliefNear})
              </T>
            </View>
          </Animated.View>
        ) : null}

        {/* search */}
        <Animated.View entering={enter(2)}>
          <Field
            ref={input}
            value={q}
            onChangeText={(v) => {
              setQ(v);
              setNote(null);
            }}
            placeholder={t('home.search')}
            returnKeyType="go"
            onSubmitEditing={() => (direct ? openDirect() : results[0] && openCheck({ lat: results[0].lat, lon: results[0].lon, label: results[0].name }))}
            autoCorrect={false}
            accessibilityLabel={t('home.search')}
            accessibilityHint={t('home.searchHint')}
            right={
              q ? (
                <IconButton glyph="close" size={18} color={c.inkMuted} label={t('home.clear')} onPress={() => setQ('')} />
              ) : (
                <IconButton glyph="paste" size={18} color={c.inkMuted} label={t('home.paste')} onPress={paste} />
              )
            }
          />
          {direct ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <ResultRow
                title={directTitle}
                sub={direct.kind === 'egg' ? t('home.eggSub') : t('home.pointSub')}
                crimson={direct.kind === 'egg'}
                onPress={openDirect}
              />
            </Animated.View>
          ) : null}
          {searching ? <ActivityIndicator color={c.inkMuted} style={styles.spinner} /> : null}
          {results.map((p) => (
            <Animated.View key={p.id} entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
              <ResultRow title={p.name} sub={p.context} onPress={() => openCheck({ lat: p.lat, lon: p.lon, label: p.name })} />
            </Animated.View>
          ))}
          {!searching && searched && !results.length && !direct ? (
            <T kind="small" style={styles.note}>
              {t('home.noResults')}
            </T>
          ) : null}
          {note ? (
            <T kind="small" color={c.lateriteText} style={styles.note} accessibilityLiveRegion="assertive">
              {note}
            </T>
          ) : null}
        </Animated.View>

        {!typing ? (
          <>
            {/* the two ways in */}
            <Animated.View entering={enter(3)} style={styles.tiles}>
              <Tile
                primary
                index="01"
                glyph="drill"
                title={t('home.core')}
                sub={t('home.coreTileSub')}
                busy={locating}
                onPress={coreHere}
                hint={t('home.coreHint')}
              />
              <Tile index="02" glyph="crosshair" title={t('home.pin')} sub={t('home.pinTileSub')} onPress={() => router.push('/pick')} />
            </Animated.View>

            {/* shortcuts: the other ways in, one tap each */}
            <Animated.View entering={enter(3)}>
              <ActionChips
                bleed={space.gutter}
                items={[
                  { key: 'paste', glyph: 'link', label: t('home.shortPaste'), onPress: paste },
                  { key: 'time', glyph: 'clock', label: t('home.shortTime'), onPress: timeMachine },
                  { key: 'compare', glyph: 'tray', label: t('places.compare'), onPress: () => router.push('/compare') },
                  { key: 'watch', glyph: 'bell', label: t('tab.watch'), onPress: () => router.navigate('/watch') },
                  { key: 'places', glyph: 'layers', label: t('tab.places'), onPress: () => router.navigate('/places') },
                ]}
              />
            </Animated.View>

            {latest ? (
              <Animated.View entering={enter(4)}>
                <SectionHead label={t('home.continue')} />
                <Hairline />
                <View style={styles.bleed}>
                  <CoreSliver core={latest} onPress={openSaved} onLongPress={openMenu} onMore={openMenu} />
                </View>
                <Hairline />
              </Animated.View>
            ) : null}

            {saved.length ? (
              <Animated.View entering={enter(5)}>
                <SectionHead label={t('home.saved')} action={t('home.seeAll')} onAction={() => router.navigate({ pathname: '/places', params: { tab: 'saved' } })} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={styles.bleedStrip}>
                  {saved.map((core) => (
                    <SavedCard key={core.id} core={core} headline={tl(core.headline)} onMenu={openMenu} />
                  ))}
                </ScrollView>
              </Animated.View>
            ) : null}

            {!shareHintSeen ? (
              <Animated.View entering={enter(6)} exiting={FadeOut} style={styles.hint}>
                <RegMarks />
                <Glyph name="share" size={20} color={c.ink} />
                <View style={styles.hintText}>
                  <T kind="bodyMedium">{t('home.shareTitle')}</T>
                  <T kind="small">{t('home.tipBody')}</T>
                </View>
                <IconButton glyph="close" size={18} color={c.inkMuted} label={t('home.dismiss')} onPress={() => updateSettings({ shareHintSeen: true })} />
              </Animated.View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {/* a card's menu: long-press or ⋯ on Continue and Saved */}
      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? placeLabel(menuFor).title : undefined}>
        {menuFor ? (
          <View>
            <ListRow
              glyph="arrow"
              title={t('home.open')}
              chevron={false}
              onPress={() => {
                const id = menuFor.id;
                setMenuFor(null);
                openSaved(id);
              }}
            />
            <Hairline />
            <ListRow
              glyph="card"
              title={t('places.card')}
              chevron={false}
              onPress={() => {
                const id = menuFor.id;
                setMenuFor(null);
                card.share(id);
              }}
            />
            <Hairline />
            <ListRow
              glyph="share"
              title={t('places.shareText')}
              chevron={false}
              onPress={() => {
                const core = menuFor;
                setMenuFor(null);
                shareText(core);
              }}
            />
            <Hairline />
            <ListRow
              glyph={menuFor.saved ? 'saved' : 'save'}
              title={menuFor.saved ? t('places.unsave') : t('places.save')}
              chevron={false}
              onPress={() => {
                reports.setSaved(menuFor.id, !menuFor.saved);
                toast(menuFor.saved ? t('places.unsavedToast') : t('places.savedToast'), menuFor.saved ? 'save' : 'saved');
                haptic.success();
                setMenuFor(null);
              }}
            />
            <Hairline />
            <ListRow
              glyph="tray"
              title={t('check.compareWith')}
              chevron={false}
              onPress={() => {
                const id = menuFor.id;
                setMenuFor(null);
                router.navigate({ pathname: '/places', params: { pick: id } });
              }}
            />
            <Hairline />
            <ListRow
              glyph="trash"
              title={t('places.delete')}
              tone="danger"
              chevron={false}
              onPress={() => {
                const core = menuFor;
                setMenuFor(null);
                setTimeout(() => setAsking(core), motion.dur.exit + 40);
              }}
            />
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={!!asking} onClose={() => setAsking(null)}>
        {asking ? (
          <View style={styles.ask}>
            <T kind="title">{t('places.deleteAsk', { place: placeLabel(asking).title })}</T>
            <T kind="small">{t('places.deleteBody')}</T>
            <Button
              label={t('places.deleteYes')}
              variant="danger"
              glyph="trash"
              onPress={() => {
                reports.remove(asking.id);
                toast(t('places.deletedToast'), 'trash');
                haptic.warn();
                setAsking(null);
              }}
            />
            <Button label={t('common.cancel')} variant="quiet" onPress={() => setAsking(null)} />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Tile({
  glyph,
  title,
  sub,
  index,
  onPress,
  primary,
  busy,
  hint,
}: {
  glyph: GlyphName;
  title: string;
  sub: string;
  index: string;
  onPress: () => void;
  primary?: boolean;
  busy?: boolean;
  hint?: string;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const fg = primary ? c.onAccent : c.ink;
  return (
    <PressableScale
      onPress={busy ? undefined : onPress}
      hapticOnPress={primary ? 'tick' : null}
      accessibilityLabel={`${title}. ${sub}`}
      accessibilityHint={hint}
      accessibilityState={{ busy: !!busy }}
      style={[styles.tile, primary ? styles.tilePrimary : styles.tileQuiet]}
    >
      <View style={styles.tileTop}>
        <T kind="mono" color={fg} numberOfLines={1} style={[styles.flex, styles.tileIndex]}>
          {index} · {sub}
        </T>
        {busy ? <ActivityIndicator color={fg} /> : <Glyph name="arrow" size={18} color={fg} />}
      </View>
      <View style={styles.tileText}>
        <Glyph name={glyph} size={28} color={fg} weight={1.8} />
        <T kind="title" color={fg} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.tileTitle}>
          {title}
        </T>
      </View>
    </PressableScale>
  );
}

function SectionHead({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionLabel}>
        <View style={styles.mark} />
        <T kind="mono" color={c.ink} accessibilityRole="header">
          {label}
        </T>
      </View>
      {action && onAction ? (
        <PressableScale onPress={onAction} accessibilityRole="link" accessibilityLabel={action} style={styles.sectionAction}>
          <T kind="mono" color={c.accentText}>
            {action} →
          </T>
        </PressableScale>
      ) : null}
    </View>
  );
}

function SavedCard({ core, headline, onMenu }: { core: CoreSummary; headline: string; onMenu: (id: string) => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const styles = useStyles();
  const label = placeLabel(core);
  return (
    <PressableScale
      onPress={() => openSaved(core.id)}
      onLongPress={() => onMenu(core.id)}
      scaleTo={0.96}
      style={styles.card}
      accessibilityLabel={`${label.title}. ${headline}`}
    >
      <View style={styles.cardTop}>
        <CoreCylinder width={16} height={44} bands={core.bands} tilt={0.22} />
        <View style={styles.cardMarks}>
          <Glyph name="saved" size={14} color={c.accentText} />
          <IconButton glyph="more" size={18} color={c.inkMuted} label={t('places.more', { place: label.title })} onPress={() => onMenu(core.id)} style={styles.cardMore} />
        </View>
      </View>
      <T kind="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.cardTitle}>
        {label.title}
      </T>
      <T kind="mono" numberOfLines={1} style={styles.cardSub}>
        {label.subtitle}
      </T>
      <T kind="caption" numberOfLines={2}>
        {headline}
      </T>
    </PressableScale>
  );
}

function ResultRow({ title, sub, onPress, crimson }: { title: string; sub: string; onPress: () => void; crimson?: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  const tint = crimson ? c.crimsonEgg : c.ink;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.result} accessibilityLabel={`${title}. ${sub}`}>
      <View style={styles.resultRow}>
        <Glyph name="pin" size={18} color={crimson ? c.crimsonEgg : c.accentText} />
        <View style={styles.flex}>
          <T kind="bodyMedium" numberOfLines={1} color={tint}>
            {title}
          </T>
          {sub ? (
            <T kind="caption" numberOfLines={1}>
              {sub}
            </T>
          ) : null}
        </View>
        <Glyph name="arrow" size={18} color={c.inkMuted} />
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  scroll: { paddingHorizontal: space.gutter, paddingBottom: space.xxxl, gap: space.xl },
  flex: { flex: 1, minWidth: 0 },
  masthead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  goPro: { borderWidth: 1.5, borderColor: c.ink, backgroundColor: c.accent, paddingHorizontal: space.sm, paddingVertical: 4, minHeight: 28 },
  // small mono sets its own tracking
  goProText: { fontSize: 9.5, lineHeight: 14, letterSpacing: 1.4, color: c.onAccent },
  where: { gap: space.sm, marginTop: space.md },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  staff: { marginTop: space.sm },
  dot: { width: 8, height: 8, borderWidth: 1, borderColor: c.inkMuted },
  dotOn: { backgroundColor: c.accent, borderColor: c.ink },
  relief: { flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: c.lake, padding: space.md, borderRadius: radius.none },
  spinner: { marginTop: space.md },
  note: { marginTop: space.sm },
  result: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.hairline },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, minHeight: 168, borderRadius: radius.none, padding: space.lg, justifyContent: 'space-between', borderWidth: 1.5 },
  tilePrimary: { flex: 1.2, backgroundColor: c.accent, borderColor: c.dark ? c.accent : c.ink },
  tileQuiet: { borderColor: c.ink, backgroundColor: c.paper },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  // small mono sets its own tracking
  tileIndex: { fontSize: 9, lineHeight: 13, letterSpacing: 1.3 },
  tileText: { gap: space.sm },
  tileTitle: { fontSize: 22, lineHeight: 27 },
  dim: { opacity: 0.8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32, marginBottom: space.xs },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mark: { width: 8, height: 8, backgroundColor: c.accent, borderWidth: 1, borderColor: c.ink },
  sectionAction: { minHeight: 32, justifyContent: 'center', paddingLeft: space.md },
  bleed: { marginHorizontal: -space.gutter },
  bleedStrip: { marginHorizontal: -space.gutter },
  strip: { paddingHorizontal: space.gutter, gap: space.md, paddingVertical: space.xs },
  card: { width: 176, borderWidth: 1.5, borderColor: c.ink, borderRadius: radius.none, padding: space.md, gap: 4, backgroundColor: c.paper },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.xs },
  cardTitle: { fontSize: 20, lineHeight: 25 },
  cardMarks: { flexDirection: 'row', alignItems: 'center', marginTop: -10, marginRight: -12 },
  cardMore: { width: 40, height: 40 },
  ask: { gap: space.md, paddingTop: space.sm },
  // small mono sets its own tracking
  cardSub: { fontSize: 9, lineHeight: 13, letterSpacing: 1.2 },
  hint: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderColor: c.ink, padding: space.md, borderRadius: radius.none, marginTop: space.xs },
  hintText: { flex: 1, gap: 2 },
}));
