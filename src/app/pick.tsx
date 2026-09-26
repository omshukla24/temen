import { Camera, Map, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHemisphere } from 'ground-memory';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Glyph } from '@/components/Glyph';
import { T } from '@/components/T';
import { useFix } from '@/hooks/useFix';
import { useT } from '@/i18n';
import { INDIA, MAP_ATTRIBUTION, MAP_STYLE } from '@/services/map';
import { openCheck } from '@/services/nav';
import { color, haptic, space } from '@/theme';

/** Drop a pin anywhere: the map moves under a fixed survey crosshair. */
export default function Pick() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const fix = useFix();
  const start = fix.status === 'ok' ? fix.fix : INDIA;
  const [center, setCenter] = useState<{ lat: number; lon: number; zoom: number }>({ ...start, zoom: fix.status === 'ok' ? 16 : 4.2 });

  const onMove = (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const [lon, lat] = e.nativeEvent.center;
    setCenter({ lat, lon, zoom: e.nativeEvent.zoom });
  };

  const close = center.zoom >= 13;
  return (
    <View style={styles.root}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE}
        onRegionIsChanging={onMove}
        onRegionDidChange={(e) => {
          onMove(e);
          if (e.nativeEvent.userInteraction) haptic.tick();
        }}
        compass={false}
        logo={false}
        attributionPosition={{ bottom: 150 + insets.bottom, left: 8 }}
        touchPitch={false}
        touchRotate={false}
      >
        <Camera initialViewState={{ center: [start.lon, start.lat], zoom: fix.status === 'ok' ? 16 : 4.2 }} />
      </Map>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.cross}>
          <Glyph name="crosshair" size={56} color={color.laterite} weight={1.4} />
        </View>
      </View>

      <View style={styles.top} pointerEvents="box-none">
        <Breadcrumb trail={[t('crumb.ground'), t('home.pin')]} index="00" />
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <T kind="mono" color={color.ink} numberOfLines={1}>
          {formatHemisphere(center.lat, center.lon, 6)}
        </T>
        <T kind="caption">{close ? 'Move the map until the crosshair sits on the plot.' : 'Zoom in to street level to place the crosshair on a plot.'}</T>
        <Button label={t('pick.core')} glyph="drill" onPress={() => openCheck(center, true)} disabled={!close} />
        <T kind="mono" style={styles.attr}>
          {MAP_ATTRIBUTION}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ground },
  cross: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: 'rgba(242,237,228,0.92)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.ground,
    paddingHorizontal: space.gutter,
    paddingTop: space.lg,
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.ink,
  },
  attr: { fontSize: 8, marginTop: space.xs },
});
