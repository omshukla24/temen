import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { ListRow, Section } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { Toggle } from '@/components/Toggle';
import { useT } from '@/i18n';
import { reports } from '@/state/reports';
import { updateSettings, useSettings, type Appearance, type Lang } from '@/state/settings';
import { haptic, makeStyles, space, useTheme } from '@/theme';

/** Preferences: the light, the language, the voice, touch and motion. */
export default function Preferences() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { phase } = useTheme();
  const styles = useStyles();
  const s = useSettings();
  const [clearing, setClearing] = useState(false);

  const appearances: Appearance[] = ['auto', 'light', 'dark', 'system'];
  const phaseName = t(`prefs.phase.${phase}` as 'prefs.phase.day');

  return (
    <Screen>
      <Header title={t('prefs.title')} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxxl }]}>
        <View style={styles.group}>
          <T kind="mono" accessibilityRole="header">
            {t('prefs.appearance')}
          </T>
          <Segmented
            options={appearances.map((a) => ({ value: a, label: t(`prefs.appearance.${a}` as 'prefs.appearance.auto') }))}
            value={s.appearance}
            onChange={(v) => updateSettings({ appearance: v })}
            accessibilityLabel={t('prefs.appearance')}
          />
          <Animated.View key={`${s.appearance}-${phase}`} entering={FadeIn}>
            <T kind="caption">
              {t('prefs.lightNow', { phase: phaseName })} {s.appearance === 'auto' ? t('prefs.autoHint') : s.appearance === 'system' ? t('prefs.systemHint') : ''}
            </T>
          </Animated.View>
        </View>

        <View style={styles.group}>
          <T kind="mono" accessibilityRole="header">
            {t('settings.language')}
          </T>
          <Segmented<Lang>
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'हिन्दी' },
            ]}
            value={s.lang}
            onChange={(v) => updateSettings({ lang: v })}
            accessibilityLabel={t('settings.language')}
          />
        </View>

        <Section label={t('prefs.feel')}>
          <ListRow
            glyph="speaker"
            title={t('settings.speak')}
            subtitle={t('prefs.voiceHint')}
            right={
              <Toggle
                value={s.speak}
                label={t('settings.speak')}
                onValueChange={(v) => {
                  if (!v) Speech.stop();
                  updateSettings({ speak: v });
                }}
              />
            }
          />
          <ListRow glyph="wave" title={t('prefs.haptics')} right={<Toggle value={s.haptics} label={t('prefs.haptics')} onValueChange={(v) => updateSettings({ haptics: v })} />} />
          <ListRow
            glyph="pause"
            title={t('prefs.reduceMotion')}
            subtitle={t('prefs.reduceMotionHint')}
            right={<Toggle value={s.reduceMotion} label={t('prefs.reduceMotion')} onValueChange={(v) => updateSettings({ reduceMotion: v })} />}
          />
        </Section>

        <Section label={t('prefs.data')}>
          <ListRow glyph="refresh" title={t('prefs.replayIntro')} chevron={false} onPress={() => router.push('/onboarding')} />
          <ListRow glyph="trash" title={t('prefs.clear')} tone="danger" chevron={false} onPress={() => setClearing(true)} />
          {__DEV__ ? <ListRow glyph="info" title="Debug: Timelapse probe" onPress={() => router.push('/debug')} /> : null}
        </Section>
      </ScrollView>

      <Sheet visible={clearing} onClose={() => setClearing(false)}>
        <View style={styles.sheet}>
          <T kind="title">{t('prefs.clearAsk')}</T>
          <T kind="small">{t('prefs.clearBody')}</T>
          <Button
            label={t('prefs.clearYes')}
            variant="danger"
            glyph="trash"
            onPress={() => {
              reports.clear();
              haptic.warn();
              toast(t('prefs.cleared'));
              setClearing(false);
            }}
          />
          <Button label={t('common.cancel')} variant="quiet" onPress={() => setClearing(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  scroll: { paddingHorizontal: space.gutter, paddingTop: space.md, gap: space.xl },
  group: { gap: space.sm },
  sheet: { gap: space.md, paddingTop: space.sm },
}));
