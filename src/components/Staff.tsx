import { View, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { T } from './T';

/**
 * A surveyor's scale: a hairline with a tick every unit and a long tick every
 * fifth, with mono readings under it (left, middle, right). It sits under
 * heroes and titles the way a levelling staff sits in a photo — for scale.
 */
export function Staff({
  ticks = 40,
  labels,
  color,
  style,
}: {
  ticks?: number;
  labels?: [string, string?, string?];
  color?: string;
  style?: ViewStyle;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const ink = color ?? c.ink;
  return (
    <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.rule, { borderColor: ink }]}>
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <View key={i} style={[styles.tick, { backgroundColor: ink }, i % 5 === 0 ? styles.major : styles.minor]} />
        ))}
      </View>
      {labels ? (
        <View style={styles.labels}>
          {labels.map((l, i) => (
            <T key={i} kind="mono" numberOfLines={1} style={[styles.label, i === 1 ? styles.mid : i === 2 ? styles.end : null]}>
              {l ?? ''}
            </T>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The levelling staff's face: survey-yellow blocks between ink gaps, a longer
 * gap every fifth block. Used as the mark of the open tab and under the
 * reading that matters.
 */
export function StaffBar({ width, height = 5, style }: { width: number; height?: number; style?: ViewStyle }) {
  const { c } = useTheme();
  const n = Math.max(1, Math.floor(width / 8));
  return (
    <View style={[{ width, height, flexDirection: 'row', backgroundColor: c.ink }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ flex: 1, marginRight: i === n - 1 ? 0 : (i + 1) % 5 === 0 ? 3 : 1.5, backgroundColor: c.accent }} />
      ))}
    </View>
  );
}

/** Registration marks: four small crosshairs at the corners of whatever holds them. */
export function RegMarks({ color, inset = -5 }: { color?: string; inset?: number }) {
  const { c } = useTheme();
  const ink = color ?? c.ink;
  const at: ViewStyle[] = [
    { left: inset, top: inset },
    { right: inset, top: inset },
    { left: inset, bottom: inset },
    { right: inset, bottom: inset },
  ];
  return (
    <>
      {at.map((p, i) => (
        <View key={i} pointerEvents="none" style={[{ position: 'absolute', width: 11, height: 11 }, p]}>
          <View style={{ position: 'absolute', left: 5, top: 0, width: 1, height: 11, backgroundColor: ink }} />
          <View style={{ position: 'absolute', top: 5, left: 0, height: 1, width: 11, backgroundColor: ink }} />
        </View>
      ))}
    </>
  );
}

const useStyles = makeStyles(() => ({
  rule: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 1, height: 12 },
  tick: { width: 1 },
  minor: { height: 5, opacity: 0.55 },
  major: { height: 11 },
  labels: { flexDirection: 'row', marginTop: 3 },
  label: { flex: 1, fontSize: 8, lineHeight: 12, letterSpacing: 1.2 },
  mid: { textAlign: 'center' },
  end: { textAlign: 'right' },
}));
