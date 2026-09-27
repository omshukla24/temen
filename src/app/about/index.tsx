import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { DocPage } from '@/components/DocPage';
import { ListRow, Section } from '@/components/ListRow';
import { T } from '@/components/T';
import { SOURCE_URL } from '@/features/legal/content';
import { useT } from '@/i18n';
import { makeStyles, space, useTheme } from '@/theme';

/** The one place the name, the promise and the credits are spelled out. */
export default function About() {
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <DocPage title={t('about.title')}>
      <View style={styles.hero}>
        <T kind="wordmark">TEMEN</T>
        <T kind="monoWide">{t('tagline')}</T>
        <T kind="mono" color={c.inkMuted}>
          v{version}
        </T>
      </View>
      <T kind="body">{t('settings.aboutBody')}</T>
      <T kind="small">{t('about.name')}</T>
      <Section>
        <ListRow glyph="layers" title={t('about.sources')} onPress={() => router.push('/about/sources')} />
        <ListRow glyph="shield" title={t('about.privacy')} onPress={() => router.push('/about/privacy')} />
        <ListRow glyph="report" title={t('about.terms')} onPress={() => router.push('/about/terms')} />
        <ListRow glyph="link" title={t('settings.sourceCode')} subtitle="github.com/omshukla24/temen" onPress={() => WebBrowser.openBrowserAsync(SOURCE_URL)} />
      </Section>
      <T kind="mono" align="center">
        {t('home.honesty')}
      </T>
    </DocPage>
  );
}

const useStyles = makeStyles(() => ({
  hero: { alignItems: 'flex-start', gap: space.xs, paddingVertical: space.lg },
}));
