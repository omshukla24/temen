import { StyleSheet, View } from 'react-native';

import { formatLatLon } from 'ground-memory';

import { useT } from '@/i18n';
import type { CoreSummary } from '@/state/reports';
import { color, space } from '@/theme';

import { CoreCylinder } from '@/setpieces/CoreCylinder';
import { Glyph } from './Glyph';
import { PressableScale } from './PressableScale';
import { T } from './T';

function ago(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return 'TODAY';
  if (days === 1) return 'YESTERDAY';
  if (days < 30) return `${days} DAYS AGO`;
  return d.toISOString().slice(0, 10);
}

/** A recent core on Home: a thin sliver of its strata, the headline and where it was drilled. */
export function CoreSliver({ core, onPress, onLongPress, selected }: { core: CoreSummary; onPress: () => void; onLongPress?: () => void; selected?: boolean }) {
  const { tl } = useT();
  const place = core.placeName ?? formatLatLon(core.lat, core.lon, 4);
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      scaleTo={0.985}
      accessibilityLabel={`${place}. ${tl(core.headline)}. Drilled ${ago(core.createdAt).toLowerCase()}.`}
      accessibilityHint="Opens this core"
      style={[styles.row, selected && styles.selected]}
    >
      <View style={styles.inner}>
        <CoreCylinder width={22} height={64} bands={core.bands} tilt={0.22} />
        <View style={styles.text}>
          <T kind="heading" numberOfLines={1} style={styles.place}>
            {place}
          </T>
          <T kind="small" color={color.ink} numberOfLines={2}>
            {tl(core.headline)}
          </T>
          <T kind="mono" numberOfLines={1}>
            {formatLatLon(core.lat, core.lon, 5)} · {ago(core.createdAt)}
            {core.saved ? ' · SAVED' : ''}
          </T>
        </View>
        <Glyph name={selected ? 'check' : 'forward'} size={18} color={selected ? color.laterite : color.inkMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: space.md },
  selected: { backgroundColor: 'rgba(165,72,42,0.06)' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  text: { flex: 1, gap: 2 },
  place: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, lineHeight: 26 },
});
