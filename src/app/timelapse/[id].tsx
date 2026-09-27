import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { TIMELAPSE_SOURCE, TIMELAPSE_YEARS, timelapseEmbedUrl, timelapseViewerUrl } from 'ground-memory';

import { Button } from '@/components/Button';
import { HairlineProgress } from '@/components/HairlineProgress';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { RollingNumber } from '@/components/RollingNumber';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { placeLabel } from '@/features/placeLabel';
import { frameForYear, parseMessage, playJs, PROBE_JS, seekJs, yearForFrame, type ProbeResult } from '@/features/timelapse/bridge';
import { useT } from '@/i18n';
import { YearDial } from '@/setpieces/dial/YearDial';
import { reports } from '@/state/reports';
import { color, makeStyles, space, useTheme } from '@/theme';

/** After the finger lets go, the player's echoes of the old frame are ignored this long. */
const HANDS_OFF_MS = 1200;

/**
 * Time machine: Google Earth Timelapse at the pin with the Year Dial under it.
 * Both drive each other: the dial seeks the player, and the player's own
 * playback or scrubber moves the dial.
 */
export default function TimeMachine() {
  const { id, lat: latS, lon: lonS } = useLocalSearchParams<{ id: string; lat: string; lon: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const stored = id && id !== 'new' ? reports.get(id) : null;
  const lat = stored?.report.lat ?? Number(latS);
  const lon = stored?.report.lon ?? Number(lonS);
  const label = placeLabel({ placeName: stored?.report.placeName ?? null, trail: stored?.trail, lat, lon });

  const web = useRef<WebView>(null);
  const load = useSharedValue(0);
  const [failed, setFailed] = useState(false);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [year, setYear] = useState<number>(TIMELAPSE_YEARS.first);
  const [paused, setPaused] = useState<boolean | null>(null);
  const handsOn = useRef(0);
  const canSeek = !!probe?.seekToFrame;
  const url = timelapseEmbedUrl(lat, lon, 14);

  const touch = () => {
    handsOn.current = Date.now();
  };

  const onDial = (y: number) => {
    touch();
    setYear(y);
  };

  const settle = (y: number) => {
    touch();
    setYear(y);
    if (canSeek) {
      web.current?.injectJavaScript(seekJs(frameForYear(y, probe)));
      setPaused(true);
    }
  };

  const togglePlay = () => {
    const play = paused !== false;
    web.current?.injectJavaScript(playJs(play));
    setPaused(!play);
  };

  const onMessage = (data: string) => {
    const msg = parseMessage(data);
    if (!msg) return;
    if (msg.type === 'probe') {
      setProbe(msg);
      return;
    }
    if (msg.paused !== null) setPaused(msg.paused);
    // the player moved on its own (playback or its scrubber): the dial follows
    if (Date.now() - handsOn.current < HANDS_OFF_MS) return;
    setYear(yearForFrame(msg.frame, probe, TIMELAPSE_YEARS.first, TIMELAPSE_YEARS.last));
  };

  const openViewer = () => WebBrowser.openBrowserAsync(timelapseViewerUrl(lat, lon));

  return (
    <Screen>
      <Header
        title={label.title}
        subtitle={t('check.timeMachine').toUpperCase()}
        right={<IconButton glyph="globe" label={t('tm.fullViewer')} onPress={openViewer} />}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl, gap: space.lg }}>
        <View style={[styles.player, { width, height: width }]}>
          {failed ? (
            <View style={styles.failed}>
              <T kind="title" color={color.ground}>
                {t('tm.failTitle')}
              </T>
              <T kind="small" color={color.ground}>
                {t('tm.failBody')}
              </T>
              <Button label={t('tm.openBrowser')} glyph="globe" onPress={openViewer} />
            </View>
          ) : (
            <WebView
              ref={web}
              source={{ uri: url }}
              style={styles.web}
              injectedJavaScript={PROBE_JS}
              onMessage={(e) => onMessage(e.nativeEvent.data)}
              onLoadProgress={(e) => {
                load.value = withTiming(e.nativeEvent.progress, { duration: 200 });
              }}
              onError={() => setFailed(true)}
              onHttpError={(e) => e.nativeEvent.statusCode >= 400 && setFailed(true)}
              onTouchStart={touch}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              originWhitelist={['https://*']}
              accessibilityLabel={t('tm.a11y')}
            />
          )}
        </View>
        <HairlineProgress progress={load} tint={c.laterite} />

        <View style={[styles.pad, styles.readout]}>
          <View style={styles.flex}>
            <T kind="mono">
              {TIMELAPSE_YEARS.first}–{TIMELAPSE_YEARS.last}
            </T>
            <RollingNumber value={year} kind="displayXl" still />
          </View>
          {probe?.play ? (
            <IconButton
              glyph={paused === false ? 'pause' : 'play'}
              tone="solid"
              label={paused === false ? t('tm.pause') : t('tm.play')}
              onPress={togglePlay}
              style={styles.play}
            />
          ) : null}
        </View>
        <YearDial year={year} onChange={onDial} onSettle={settle} from={TIMELAPSE_YEARS.first} to={TIMELAPSE_YEARS.last} />
        <View style={[styles.pad, styles.notes]}>
          {probe !== null && !canSeek ? <T kind="small">{t('tm.noSeek')}</T> : null}
          <T kind="caption">
            {TIMELAPSE_SOURCE.name} · {TIMELAPSE_SOURCE.years} · {TIMELAPSE_SOURCE.licence}
          </T>
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  pad: { paddingHorizontal: space.gutter },
  // the satellite player is dark in every light
  player: { backgroundColor: c.dark ? c.groundDeep : color.ink },
  web: { flex: 1, backgroundColor: color.ink },
  failed: { flex: 1, padding: space.xl, justifyContent: 'center', gap: space.md },
  readout: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  play: { width: 52, height: 52, borderRadius: 26, marginBottom: space.sm },
  notes: { gap: space.sm },
}));
