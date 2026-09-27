import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { Button } from '@/components/Button';
import { DocPage, DocSection } from '@/components/DocPage';
import { T } from '@/components/T';
import { HELP, ISSUES_URL, SUPPORT_EMAIL } from '@/features/legal/content';
import { useT } from '@/i18n';

export default function Help() {
  const { t } = useT();
  return (
    <DocPage title={t('about.help')}>
      {HELP.map((h, i) => (
        <DocSection key={h.q} index={i} title={h.q}>
          <T kind="body">{h.a}</T>
        </DocSection>
      ))}
      <Button
        label={t('about.contact')}
        glyph="mail"
        variant="secondary"
        onPress={() => (SUPPORT_EMAIL ? Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Temen`) : WebBrowser.openBrowserAsync(ISSUES_URL))}
      />
    </DocPage>
  );
}
