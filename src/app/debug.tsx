import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import WebView from 'react-native-webview';

import { timelapseEmbedUrl } from 'ground-memory';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { PROBE_JS, type ProbeResult } from '@/features/timelapse/bridge';
import { color, space, useTheme } from '@/theme';

/** Dev-only spike: does the Timelapse embed load in a WebView, and what does its player expose? */
export default function Debug() {
  const { c } = useTheme();
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const log = (s: string) => setEvents((e) => [`${new Date().toISOString().slice(11, 19)} ${s}`, ...e].slice(0, 30));
  if (!__DEV__) return null;
  return (
    <Screen>
      <Breadcrumb trail={['Debug', 'Timelapse spike']} />
      <View style={{ height: 360, backgroundColor: color.ink }}>
        <WebView
          source={{ uri: timelapseEmbedUrl(12.9442, 80.2292, 13) }}
          injectedJavaScript={PROBE_JS}
          onLoadStart={() => log('load start')}
          onLoadEnd={() => log('load end')}
          onError={(e) => log(`error ${e.nativeEvent.description}`)}
          onHttpError={(e) => log(`http ${e.nativeEvent.statusCode}`)}
          onMessage={(e) => {
            log(`msg ${e.nativeEvent.data.slice(0, 200)}`);
            try {
              setProbe(JSON.parse(e.nativeEvent.data));
            } catch {
              // not JSON
            }
          }}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.gutter, gap: space.xs }}>
        <T kind="mono" color={c.ink}>
          PROBE
        </T>
        <T kind="caption" selectable>
          {JSON.stringify(probe, null, 1) ?? 'waiting'}
        </T>
        <T kind="mono" color={c.ink}>
          EVENTS
        </T>
        {events.map((e, i) => (
          <T key={i} kind="caption" selectable>
            {e}
          </T>
        ))}
      </ScrollView>
    </Screen>
  );
}
