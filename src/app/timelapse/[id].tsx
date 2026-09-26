import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { TIMELAPSE_SOURCE, TIMELAPSE_YEARS, formatHemisphere, timelapseEmbedUrl, timelapseViewerUrl } from 'ground-memory';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { HairlineProgress } from '@/components/HairlineProgress';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { frameForYear, PROBE_JS, seekJs, type ProbeResult } from '@/features/timelapse/bridge';
import { useT } from '@/i18n';
import { YearDial } from '@/setpieces/dial/YearDial';
import { reports } from '@/state/reports';
import { color, space } from '@/theme';

/** Time machine: Google Earth Timelapse at the pin, driven by the Year Dial when the player allows it. */
export default function TimeMachine() {
  const { id, lat: latS, lon: lonS } = useLocalSearchParams<{ id: string; lat: string; lon: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useT();
  const stored = id && id !== 'new' ? reports.get(id) : null;
  const lat = stored?.report.lat ?? Number(latS);
  const lon = stored?.report.lon ?? Number(lonS);
  const name = stored?.report.placeName ?? null;

  const web = useRef<WebView>(null);
  const load = useSharedValue(0);
  const [failed, setFailed] = useState(false);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [year, setYear] = useState<number>(TIMELAPSE_YEARS.first);
  const canSeek = !!probe?.seekToFrame;
  const url = timelapseEmbedUrl(lat, lon, 14);

  const settle = (y: number) => {
    setYear(y);
    if (canSeek) web.current?.injectJavaScript(seekJs(frameForYear(y, probe)));
  };

  return (
    <Screen>
      <Breadcrumb trail={['Ground', name ?? formatHemisphere(lat, lon, 3), t('check.timeMachine')]} index="TM" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl, gap: space.lg }}>
        <View style={{ width, height: width, backgroundColor: color.ink }}>
          {failed ? (
            <View style={styles.failed}>
              <T kind="title" color={color.ground}>
                The archive didn't answer
              </T>
              <T kind="small" color={color.ground}>
                The Timelapse player needs a connection. You can open it in the browser instead.
              </T>
              <Button label="Open in browser" glyph="globe" variant="secondary" style={{ borderColor: color.ground }} onPress={() => WebBrowser.openBrowserAsync(timelapseViewerUrl(lat, lon))} />
            </View>
          ) : (
            <WebView
              ref={web}
              source={{ uri: url }}
              style={{ flex: 1, backgroundColor: color.ink }}
              injectedJavaScript={PROBE_JS}
              onMessage={(e) => {
                try {
                  const msg = JSON.parse(e.nativeEvent.data) as ProbeResult;
                  if (msg.type === 'probe') setProbe(msg);
                } catch {
                  // ignore anything that isn't ours
                }
              }}
              onLoadProgress={(e) => {
                load.value = withTiming(e.nativeEvent.progress, { duration: 200 });
              }}
              onError={() => setFailed(true)}
              onHttpError={(e) => e.nativeEvent.statusCode >= 400 && setFailed(true)}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              originWhitelist={['https://*']}
              accessibilityLabel="Satellite time-lapse of this place, 1984 to 2022"
            />
          )}
        </View>
        <HairlineProgress progress={load} tint={color.laterite} />

        <View style={styles.pad}>
          <T kind="mono">TIME MACHINE · {TIMELAPSE_YEARS.first}–{TIMELAPSE_YEARS.last}</T>
          <Animated.View key={year} entering={FadeIn.duration(140)}>
            <T kind="displayXl" accessibilityLiveRegion="polite">
              {year}
            </T>
          </Animated.View>
        </View>
        <YearDial year={year} onChange={setYear} onSettle={settle} from={TIMELAPSE_YEARS.first} to={TIMELAPSE_YEARS.last} />
        <View style={[styles.pad, { gap: space.sm }]}>
          <T kind="small">
            {probe === null
              ? 'Reading the player…'
              : canSeek
                ? 'The dial moves the player. Let go on a year to jump there.'
                : "This player doesn't take a year from outside — scrub with its own controls; the dial marks the year you're reading."}
          </T>
          <T kind="caption">
            ¹ {TIMELAPSE_SOURCE.name} · {TIMELAPSE_SOURCE.years} · {TIMELAPSE_SOURCE.resolution} · {TIMELAPSE_SOURCE.licence}. Imagery is a yearly composite; it shows the land, not official boundaries.
          </T>
          <Button label="Open the full viewer" variant="quiet" glyph="globe" onPress={() => WebBrowser.openBrowserAsync(timelapseViewerUrl(lat, lon))} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.gutter },
  failed: { flex: 1, padding: space.xl, justifyContent: 'center', gap: space.md },
});
