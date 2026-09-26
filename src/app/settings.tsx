import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FORECAST_SOURCE, QUAKE_SOURCE, RAIN_SOURCE, RELIEF_SOURCE, SOIL_SOURCE, TERRAIN_SOURCE, TIMELAPSE_SOURCE, WATER_SOURCE } from 'ground-memory';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Hairline } from '@/components/Hairline';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { useT } from '@/i18n';
import { MAP_ATTRIBUTION } from '@/services/map';
import { openCustomerCenter, restore, storeMode } from '@/services/purchases';
import { useCredits, useIsPro } from '@/state/entitlements';
import { updateSettings, useSettings, type Lang } from '@/state/settings';
import { color, space } from '@/theme';

const SOURCES = [WATER_SOURCE, TERRAIN_SOURCE, RAIN_SOURCE, QUAKE_SOURCE, SOIL_SOURCE, FORECAST_SOURCE, RELIEF_SOURCE, TIMELAPSE_SOURCE];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const s = useSettings();
  const isPro = useIsPro();
  const credits = useCredits();
  const [note, setNote] = useState<string | null>(null);

  const langs: { k: Lang; label: string }[] = [
    { k: 'en', label: 'English' },
    { k: 'hi', label: 'हिन्दी' },
  ];

  return (
    <Screen>
      <Breadcrumb trail={[t('crumb.ground'), t('settings.title')]} index="S" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + space.xxl, gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <T kind="mono" color={color.ink}>
            01 · {t('settings.membership').toUpperCase()}
          </T>
          <Hairline />
          <T kind="title">{isPro ? 'Pro' : t('settings.free')}</T>
          <T kind="small">
            {isPro ? t('settings.proBody') : t('settings.freeBody')}
            {credits.length ? ` ${t('settings.credits', { n: credits.length })}` : ''}
          </T>
          {!isPro ? <Button label={t('common.seePro')} glyph="lock" onPress={() => router.push('/paywall')} /> : null}
          <Button
            label={t('settings.customerCenter')}
            variant="secondary"
            onPress={async () => {
              if (!(await openCustomerCenter())) setNote(t('settings.noStore', { mode: storeMode() }));
            }}
          />
          <Button
            label={t('settings.restore')}
            variant="quiet"
            onPress={async () => {
              const r = await restore();
              setNote(
                r.ok
                  ? r.pro
                    ? t('settings.proRestored')
                    : r.credits
                      ? t('settings.creditsRestored', { n: r.credits })
                      : t('settings.noneFound')
                  : (r.message ?? null),
              );
            }}
          />
          {note ? <T kind="small" color={color.laterite}>{note}</T> : null}
        </View>

        <View style={{ gap: space.sm }}>
          <T kind="mono" color={color.ink}>
            02 · {t('settings.language').toUpperCase()}
          </T>
          <Hairline />
          <View style={styles.seg} accessibilityRole="radiogroup">
            {langs.map((l) => (
              <PressableScale
                key={l.k}
                onPress={() => updateSettings({ lang: l.k })}
                accessibilityRole="radio"
                accessibilityState={{ checked: s.lang === l.k }}
                style={[styles.segItem, s.lang === l.k && styles.segOn]}
              >
                <T kind="bodyMedium" align="center" color={s.lang === l.k ? color.ground : color.ink}>
                  {l.label}
                </T>
              </PressableScale>
            ))}
          </View>
          <View style={styles.switchRow}>
            <T kind="body" style={{ flex: 1 }}>
              {t('settings.speak')}
            </T>
            <Switch
              value={s.speak}
              onValueChange={(v) => updateSettings({ speak: v })}
              trackColor={{ true: color.laterite, false: color.line }}
              thumbColor={color.paper}
              accessibilityLabel={t('settings.speak')}
            />
          </View>
        </View>

        <View style={{ gap: space.xs }}>
          <T kind="mono" color={color.ink}>
            03 · {t('settings.sources').toUpperCase()}
          </T>
          <Hairline />
          {SOURCES.map((src, i) => (
            <PressableScale key={src.name} onPress={() => WebBrowser.openBrowserAsync(src.url)} accessibilityRole="link" style={{ paddingVertical: 4 }}>
              <T kind="caption" color={color.ink}>
                {i + 1}. {src.name}
              </T>
              <T kind="caption">
                {src.years} · {src.resolution}
                {src.licence ? ` · ${src.licence}` : ''}
              </T>
            </PressableScale>
          ))}
          <T kind="caption">{MAP_ATTRIBUTION}</T>
          <T kind="caption">{t('settings.geocoding')}</T>
        </View>

        <View style={{ gap: space.xs }}>
          <T kind="mono" color={color.ink}>
            04 · {t('settings.about').toUpperCase()}
          </T>
          <Hairline />
          <T kind="small">{t('settings.aboutBody')}</T>
          <Button label={t('settings.sourceCode')} variant="quiet" glyph="link" onPress={() => WebBrowser.openBrowserAsync('https://github.com/omshukla24/temen')} />
          {__DEV__ ? <Button label="Debug: Timelapse spike" variant="quiet" onPress={() => router.push('/debug')} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: color.ink, borderRadius: 4, overflow: 'hidden' },
  segItem: { flex: 1, paddingVertical: space.sm },
  segOn: { backgroundColor: color.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
});
