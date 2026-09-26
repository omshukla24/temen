import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FORECAST_SOURCE, RAIN_RULES } from 'ground-memory';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Glyph } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { useT } from '@/i18n';
import { openSaved } from '@/services/nav';
import { enableBackgroundWatch, lastReadings, runWatch, setupNotifications, watchedPlaces } from '@/services/watch';
import { useIsPro } from '@/state/entitlements';
import { useCores } from '@/state/reports';
import { color, haptic, space } from '@/theme';

/** Monsoon Watch: next-24 h rain at every saved place, with a local alert past 64.5 mm. */
export default function Watch() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
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
      <Breadcrumb trail={['Ground', t('watch.title')]} index="W" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + space.xxl, gap: space.lg }}>
        <T kind="title">{t('watch.lede')}</T>
        {!isPro ? (
          <View style={{ gap: space.sm }}>
            <T kind="small">{t('watch.pro')}</T>
            <Button label="See Pro" glyph="lock" onPress={() => router.push('/paywall')} />
          </View>
        ) : null}

        <View>
          <Hairline strong />
          {places.length === 0 ? (
            <T kind="small" style={{ paddingVertical: space.lg }}>
              {t('watch.empty')}
            </T>
          ) : (
            places.map((p) => {
              const r = last[p.id];
              const mm = r?.reading?.next24hMm ?? null;
              const heavy = !!r?.reading?.heavy;
              const share = mm === null ? 0 : Math.min(1, mm / (RAIN_RULES.heavyMm * 1.5));
              return (
                <Animated.View key={p.id} entering={FadeIn}>
                  <PressableScale onPress={() => openSaved(p.id)} scaleTo={0.985} style={{ paddingVertical: space.md }} accessibilityLabel={`${p.name}. ${mm === null ? 'Not checked yet' : `${mm} millimetres in the next 24 hours`}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <Glyph name={heavy ? 'wave' : 'pin'} color={heavy ? color.laterite : color.inkMuted} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <T kind="heading" numberOfLines={1}>
                          {p.name}
                        </T>
                        <T kind="small" color={heavy ? color.laterite : color.inkMuted}>
                          {r?.error ? r.error : mm === null ? '—' : heavy ? t('watch.heavy') : t('watch.calm')}
                        </T>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <T kind="title" color={heavy ? color.laterite : color.ink}>
                          {mm === null ? '—' : `${Math.round(mm)} mm`}
                        </T>
                        <T kind="mono">NEXT 24 H</T>
                      </View>
                    </View>
                    {/* rain gauge: fills towards the IMD heavy line */}
                    <View style={{ height: 3, backgroundColor: color.hairline, marginTop: space.sm }}>
                      <View style={{ height: 3, width: `${share * 100}%`, backgroundColor: heavy ? color.laterite : color.lake }} />
                      <View style={{ position: 'absolute', left: `${(1 / 1.5) * 100}%`, top: -3, width: 1, height: 9, backgroundColor: color.ink }} />
                    </View>
                  </PressableScale>
                  <Hairline />
                </Animated.View>
              );
            })
          )}
        </View>

        <Button label={busy ? '…' : t('watch.check')} glyph="refresh" onPress={check} disabled={busy || places.length === 0 || !isPro} />
        {busy ? <ActivityIndicator color={color.laterite} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
          <T kind="body" style={{ flex: 1 }}>
            {t('watch.background')}
          </T>
          <Switch
            value={bg}
            disabled={!isPro}
            onValueChange={async (v) => {
              setBg(v);
              if (v) await setupNotifications();
              await enableBackgroundWatch(v);
            }}
            trackColor={{ true: color.laterite, false: color.line }}
            thumbColor={color.paper}
            accessibilityLabel={t('watch.background')}
          />
        </View>
        <T kind="caption">
          Tick marks the IMD "heavy" line: {RAIN_RULES.heavyMm} mm in a day. Background checks run when Android allows, at most hourly. ¹ {FORECAST_SOURCE.name} · {FORECAST_SOURCE.licence}. A forecast, not a flood prediction.
        </T>
      </ScrollView>
    </Screen>
  );
}
