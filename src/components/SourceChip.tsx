import { View } from 'react-native';

import type { Confidence, SourceRef } from 'ground-memory';

import { makeStyles, radius, space, useTheme } from '@/theme';

import { T } from './T';

/** "JRC · 1984–2024 · 30 m" */
export function SourceChip({ source, short }: { source: SourceRef; short?: boolean }) {
  const styles = useStyles();
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
  const { c } = useTheme();
  return (
    <T kind="mono" color={c.ink} accessibilityLabel={`Confidence ${WORD[level]}`} style={{ letterSpacing: 2 }}>
      {DOTS[level]}
    </T>
  );
}

const useStyles = makeStyles((c) => ({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: c.line,
    borderLeftWidth: 3,
    borderLeftColor: c.inkMuted,
    borderRadius: radius.none,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  text: { fontSize: 9, lineHeight: 14 },
}));
