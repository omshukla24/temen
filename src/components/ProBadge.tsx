import { View, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { T } from './T';

/**
 * The PRO mark on anything Pro unlocks (sealed strata, compare, Monsoon Watch).
 * solid = a survey-yellow tag; outline = an ink-framed tag for quieter places.
 */
export function ProBadge({ variant = 'solid', label = 'PRO', style }: { variant?: 'solid' | 'outline'; label?: string; style?: ViewStyle }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.base, variant === 'solid' ? styles.solid : styles.outline, style]} accessibilityLabel="Pro">
      <T kind="mono" color={variant === 'solid' ? c.onAccent : c.accentText} style={styles.text}>
        {label}
      </T>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  base: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 0, alignSelf: 'flex-start' },
  solid: { backgroundColor: c.accent, borderWidth: 1, borderColor: c.dark ? c.accent : c.ink },
  outline: { borderWidth: 1, borderColor: c.accentText },
  // small mono sets its own tracking (the role's tracking is sized for 10.5 pt)
  text: { fontSize: 8.5, lineHeight: 13, letterSpacing: 1.4 },
}));
