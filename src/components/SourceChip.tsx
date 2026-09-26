import { StyleSheet, View } from 'react-native';

import type { Confidence, SourceRef } from 'ground-memory';

import { color, radius, space } from '@/theme';

import { T } from './T';

/** "JRC · 1984–2024 · 30 m" */
export function SourceChip({ source, short }: { source: SourceRef; short?: boolean }) {
  const name = short ? source.name.split(/[ (]/)[0] : source.name;
  return (
    <View style={styles.chip} accessibilityLabel={`Source: ${source.name}, ${source.years}, resolution ${source.resolution}`}>
      <T kind="mono" numberOfLines={1} style={styles.text}>
        {name} · {source.years} · {source.resolution}
      </T>
    </View>
  );
}

const DOTS: Record<Confidence, string> = { low: '●○○', med: '●●○', high: '●●●' };
const WORD: Record<Confidence, string> = { low: 'low', med: 'medium', high: 'high' };

export function ConfidenceTicks({ level }: { level: Confidence }) {
  return (
    <T kind="mono" color={color.ink} accessibilityLabel={`Confidence ${WORD[level]}`} style={{ letterSpacing: 2 }}>
      {DOTS[level]}
    </T>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  text: { fontSize: 9, lineHeight: 14 },
});
