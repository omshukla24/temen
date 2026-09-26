import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHemisphere, parseLocation } from 'ground-memory';

import { Button } from '@/components/Button';
import { CoreSliver } from '@/components/CoreSliver';
import { Field } from '@/components/Field';
import { Glyph } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { useDebounced } from '@/hooks/useDebounced';
import { useFix } from '@/hooks/useFix';
import { useT } from '@/i18n';
import { searchPlaces, type Place } from '@/services/geocode';
import { relief } from '@/services/ground';
import { currentFix, permission } from '@/services/location';
import { openCheck, openSaved } from '@/services/nav';
import { resolveShared } from '@/services/share-in';
import { useCores } from '@/state/reports';
import { updateSettings, useSettings } from '@/state/settings';
import { color, haptic, space } from '@/theme';

const EGG = /temen[\s-]*ni[\s-]*gru/i;

export default function Home() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const cores = useCores();
  const { shareHintSeen } = useSettings();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const fix = useFix(focused);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [reliefNear, setReliefNear] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const dq = useDebounced(q, 400);

  const direct = useMemo(() => (q.trim() ? parseLocation(q) : { kind: 'none' as const }), [q]);
  const egg = EGG.test(q);

  // Photon search for anything that isn't already a location.
  useEffect(() => {
    const text = dq.trim();
    if (text.length < 3 || parseLocation(text).kind !== 'none' || EGG.test(text)) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    searchPlaces(text, fix.status === 'ok' ? fix.fix : undefined, ctrl.signal)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  // Relief mode: is there an active flood near where the user is?
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
      const f = await currentFix();
      openCheck({ lat: f.lat, lon: f.lon });
    } catch (e) {
      setNote(e instanceof Error ? e.message : t('home.fixOff'));
      haptic.fail();
    } finally {
      setLocating(false);
    }
  };

  const openDirect = async () => {
    Keyboard.dismiss();
    if (egg) {
      const at = fix.status === 'ok' ? fix.fix : { lat: 12.9442, lon: 80.2292 };
      router.push({ pathname: '/check/[id]', params: { id: 'new', lat: String(at.lat), lon: String(at.lon), label: 'Temen-ni-gru', egg: '1' } });
      return;
    }
    const r = await resolveShared(q, fix.status === 'ok' ? fix.fix : undefined);
    if ('error' in r) {
      setNote(r.error);
      haptic.fail();
    } else openCheck(r);
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setQ(text.trim());
    input.current?.focus();
  };

  const fixLine =
    fix.status === 'ok'
      ? `${formatHemisphere(fix.fix.lat, fix.fix.lon, 6)}${fix.fix.accuracyM ? `  ±${Math.round(fix.fix.accuracyM)} M` : ''}`
      : fix.status === 'off'
        ? t('home.fixOff')
        : fix.status === 'denied'
          ? t('home.fixDenied')
          : t('home.fixWaiting');

  const showDirect = direct.kind !== 'none' || egg;

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxxl }]}
      >
        {/* masthead */}
        <View style={styles.masthead}>
          <View style={{ flex: 1 }}>
            <T kind="wordmark" accessibilityRole="header">
              TEMEN
            </T>
            <T kind="monoWide">{t('tagline')}</T>
          </View>
          <PressableScale accessibilityLabel={t('home.compare')} onPress={() => router.push('/compare')} style={styles.iconBtn}>
            <Glyph name="tray" />
          </PressableScale>
          <PressableScale accessibilityLabel={t('home.watch')} onPress={() => router.push('/watch')} style={styles.iconBtn}>
            <Glyph name="bell" />
          </PressableScale>
          <PressableScale accessibilityLabel={t('home.settings')} onPress={() => router.push('/settings')} style={styles.iconBtn}>
            <Glyph name="sliders" />
          </PressableScale>
        </View>

        {reliefNear ? (
          <Animated.View entering={FadeIn} style={styles.relief}>
            <Glyph name="wave" color={color.ground} size={18} />
            <T kind="small" color={color.ground} style={{ flex: 1 }}>
              {t('home.relief')} ({reliefNear})
            </T>
          </Animated.View>
        ) : null}

        {/* lede */}
        <View style={styles.lede}>
          <T kind="displayXl">{t('home.lede')}</T>
          <T kind="displayXl" italic color={color.laterite}>
            {t('home.ledeItalic')}
          </T>
        </View>

        <View style={styles.fix} accessibilityLiveRegion="polite">
          <View style={[styles.dot, fix.status === 'ok' ? styles.dotOn : null]} />
          <T kind="mono" color={color.ink} numberOfLines={1} style={{ flex: 1 }}>
            {fixLine}
          </T>
        </View>

        <Button
          label={t('home.core')}
          sub={t('home.coreSub')}
          glyph="drill"
          trailing={locating ? undefined : 'arrow'}
          onPress={coreHere}
          disabled={locating}
          accessibilityHint="Checks the ground where you are standing"
        />
        {locating ? <ActivityIndicator color={color.laterite} style={{ marginTop: -38, alignSelf: 'flex-end', marginRight: space.lg }} /> : null}

        <View style={styles.searchBlock}>
          <Field
            ref={input}
            value={q}
            onChangeText={(v) => {
              setQ(v);
              setNote(null);
            }}
            placeholder={t('home.search')}
            returnKeyType="go"
            onSubmitEditing={() => (showDirect ? openDirect() : results[0] && openCheck(results[0]))}
            autoCorrect={false}
            accessibilityLabel={t('home.search')}
            right={
              q ? (
                <PressableScale accessibilityLabel="Clear" onPress={() => setQ('')} style={styles.fieldBtn}>
                  <Glyph name="close" size={18} color={color.inkMuted} />
                </PressableScale>
              ) : (
                <PressableScale accessibilityLabel="Paste" onPress={paste} style={styles.fieldBtn}>
                  <Glyph name="paste" size={18} color={color.inkMuted} />
                </PressableScale>
              )
            }
          />

          {showDirect ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <ResultRow
                title={egg ? 'TEMEN-NI-GRU' : direct.kind === 'point' ? formatHemisphere(direct.lat, direct.lon, 5) : direct.kind === 'resolve' ? 'Shared link' : direct.kind === 'shortPlusCode' ? direct.code : direct.kind === 'query' ? direct.text : ''}
                sub={egg ? 'Drill past bedrock' : 'Core this point'}
                crimson={egg}
                onPress={openDirect}
              />
            </Animated.View>
          ) : null}
          {searching ? <ActivityIndicator color={color.inkMuted} style={{ marginTop: space.md }} /> : null}
          {results.map((p) => (
            <Animated.View key={p.id} entering={FadeIn} exiting={FadeOut} layout={LinearTransition}>
              <ResultRow title={p.name} sub={p.context} onPress={() => openCheck({ lat: p.lat, lon: p.lon, label: p.name })} />
            </Animated.View>
          ))}
          {note ? (
            <T kind="small" color={color.laterite} style={{ marginTop: space.sm }} accessibilityLiveRegion="assertive">
              {note}
            </T>
          ) : null}
        </View>

        <Button label={t('home.pin')} glyph="crosshair" variant="secondary" onPress={() => router.push('/pick')} />

        {!shareHintSeen ? (
          <Animated.View exiting={FadeOut} style={styles.hint}>
            <View style={{ flex: 1, gap: 4 }}>
              <T kind="mono" color={color.ink}>
                01 · {t('home.shareTitle')}
              </T>
              <T kind="small">{t('home.shareBody')}</T>
            </View>
            <PressableScale accessibilityLabel="Dismiss" onPress={() => updateSettings({ shareHintSeen: true })} style={styles.iconBtn}>
              <Glyph name="close" size={18} color={color.inkMuted} />
            </PressableScale>
          </Animated.View>
        ) : null}

        {/* recent cores */}
        <View style={styles.sectionHead}>
          <T kind="mono" color={color.ink}>
            {t('home.recent')}
          </T>
          <T kind="mono">{String(cores.length).padStart(2, '0')}</T>
        </View>
        <Hairline />
        {cores.length === 0 ? (
          <T kind="small" style={{ paddingVertical: space.lg }}>
            {t('home.empty')}
          </T>
        ) : (
          cores.map((c, i) => (
            <View key={c.id}>
              <CoreSliver core={c} onPress={() => openSaved(c.id)} />
              {i < cores.length - 1 ? <Hairline /> : null}
            </View>
          ))
        )}
        <Hairline />

        <T kind="caption" style={styles.footer}>
          {t('home.footer')}
        </T>
        <T kind="mono" style={{ marginTop: space.sm }}>
          {t('home.honesty')}
        </T>
      </ScrollView>
    </Screen>
  );
}

function ResultRow({ title, sub, onPress, crimson }: { title: string; sub: string; onPress: () => void; crimson?: boolean }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.result} accessibilityLabel={`${title}. ${sub}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Glyph name="pin" size={18} color={crimson ? color.crimsonEgg : color.laterite} />
        <View style={{ flex: 1 }}>
          <T kind="bodyMedium" numberOfLines={1} color={crimson ? color.crimsonEgg : color.ink}>
            {title}
          </T>
          {sub ? (
            <T kind="caption" numberOfLines={1}>
              {sub}
            </T>
          ) : null}
        </View>
        <Glyph name="arrow" size={18} color={color.inkMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.gutter, gap: space.lg },
  masthead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  iconBtn: { width: 44, height: 44, alignItems: 'center' },
  relief: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    backgroundColor: color.lake,
    padding: space.md,
    borderRadius: 4,
  },
  lede: { marginTop: space.xl },
  fix: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: -space.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.line },
  dotOn: { backgroundColor: color.laterite },
  searchBlock: { gap: 0 },
  fieldBtn: { width: 44, height: 44, alignItems: 'center' },
  result: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.hairline },
  hint: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.inkMuted,
    padding: space.md,
    borderRadius: 4,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xl },
  footer: { marginTop: space.lg },
});
