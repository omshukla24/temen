import { Camera, Map, type CameraRef, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHemisphere } from 'ground-memory';

import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Glyph } from '@/components/Glyph';
import { T } from '@/components/T';
import { useFix } from '@/hooks/useFix';
import { useT } from '@/i18n';
import { INDIA, MAP_ATTRIBUTION } from '@/services/map';
import { openCheck } from '@/services/nav';
import { haptic, makeStyles, space, useTheme } from '@/theme';

/** Street level: close enough that the crosshair sits on one plot. */
const STREET = 13;
const LAND = 16.5;

/**
 * Drop a pin anywhere: the map moves under a fixed survey crosshair. From far
 * out the button first flies the map down to street level at the crosshair,
 * so a press always does something.
 */
export default function Pick() {
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const fix = useFix();
  const start = fix.status === 'ok' ? fix.fix : INDIA;
  const [center, setCenter] = useState<{ lat: number; lon: number; zoom: number }>({ ...start, zoom: fix.status === 'ok' ? LAND : 4.2 });
  const camera = useRef<CameraRef>(null);
  const moved = useRef(false);

  // The map opens before the GPS answers: fly to where you are once it does, unless you've moved it.
  useEffect(() => {
    if (fix.status !== 'ok' || moved.current) return;
    moved.current = true;
    camera.current?.flyTo({ center: [fix.fix.lon, fix.fix.lat], zoom: LAND, duration: 900 });
  }, [fix]);

  const onMove = (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const [lon, lat] = e.nativeEvent.center;
    setCenter({ lat, lon, zoom: e.nativeEvent.zoom });
  };

  const close = center.zoom >= STREET;
  const land = () => {
    haptic.tick();
    moved.current = true;
    camera.current?.flyTo({ center: [center.lon, center.lat], zoom: LAND, duration: 1100 });
  };
  return (
    <View style={styles.root}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={c.mapStyle}
        onRegionIsChanging={onMove}
        onRegionDidChange={(e) => {
          onMove(e);
          if (e.nativeEvent.userInteraction) {
            moved.current = true;
            haptic.tick();
          }
        }}
        compass={false}
        logo={false}
        attributionPosition={{ bottom: 150 + insets.bottom, left: 8 }}
        touchPitch={false}
        touchRotate={false}
      >
        <Camera ref={camera} initialViewState={{ center: [start.lon, start.lat], zoom: fix.status === 'ok' ? LAND : 4.2 }} />
      </Map>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.cross}>
          <Glyph name="crosshair" size={56} color={c.laterite} weight={1.4} />
        </View>
      </View>

      <View style={styles.top} pointerEvents="box-none">
        <Header variant="overlay" title={t('home.pin')} />
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <T kind="mono" color={c.ink} numberOfLines={1}>
          {formatHemisphere(center.lat, center.lon, 6)}
        </T>
        <T kind="caption">{close ? t('pick.hintClose') : t('pick.hintFar')}</T>
        {close ? (
          <Button label={t('pick.core')} glyph="drill" onPress={() => openCheck(center, true)} />
        ) : (
          <Button label={t('pick.zoomIn')} sub={t('pick.zoomSub')} glyph="crosshair" variant="ink" onPress={land} />
        )}
        <T kind="mono" style={styles.attr}>
          {MAP_ATTRIBUTION}
        </T>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.ground },
  cross: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.ground,
    paddingHorizontal: space.gutter,
    paddingTop: space.lg,
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: c.dark ? c.line : c.ink,
  },
  attr: { fontSize: 8, marginTop: space.xs },
}));
