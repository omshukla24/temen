import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { FORECAST_SOURCE, QUAKE_SOURCE, RAIN_SOURCE, RELIEF_SOURCE, SOIL_SOURCE, TERRAIN_SOURCE, TIMELAPSE_SOURCE, WATER_SOURCE } from 'ground-memory';

import { DocPage, DocSection } from '@/components/DocPage';
import { ListRow } from '@/components/ListRow';
import { T } from '@/components/T';
import { useT } from '@/i18n';
import { MAP_ATTRIBUTION } from '@/services/map';

const SOURCES = [WATER_SOURCE, TERRAIN_SOURCE, RAIN_SOURCE, QUAKE_SOURCE, SOIL_SOURCE, FORECAST_SOURCE, RELIEF_SOURCE, TIMELAPSE_SOURCE];

/** Where the ground's memory comes from: every dataset with its years, resolution and licence. */
export default function Sources() {
  const { t } = useT();
  return (
    <DocPage title={t('about.sources')}>
      <T kind="small">{t('about.sourcesLede')}</T>
      {SOURCES.map((s, i) => (
        <DocSection key={s.name} index={i} title={s.name}>
          <T kind="mono">
            {[s.years, s.resolution, s.licence].filter(Boolean).join(' · ')}
          </T>
          <ListRow glyph="link" title={t('about.openSource')} subtitle={s.url.replace(/^https?:\/\//, '')} onPress={() => WebBrowser.openBrowserAsync(s.url)} />
        </DocSection>
      ))}
      <View>
        <T kind="caption">{MAP_ATTRIBUTION}</T>
        <T kind="caption">{t('settings.geocoding')}</T>
      </View>
    </DocPage>
  );
}
