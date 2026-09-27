import { ActivityIndicator, View, type ViewStyle } from 'react-native';

import { makeStyles, radius, space, useTheme } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';
import { PressableScale } from './PressableScale';
import { T } from './T';

type Variant = 'primary' | 'secondary' | 'quiet' | 'ink' | 'danger';

export function Button({
  label,
  sub,
  glyph,
  variant = 'primary',
  onPress,
  disabled,
  loading,
  compact,
  style,
  accessibilityHint,
  trailing,
}: {
  label: string;
  sub?: string;
  glyph?: GlyphName;
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
  /** Shows a spinner in place of the trailing glyph and ignores presses. */
  loading?: boolean;
  /** 44 dp instead of 52 dp, for rows and sheets. */
  compact?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  trailing?: GlyphName;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  const filled = variant === 'primary' || variant === 'ink';
  const fg = variant === 'primary' ? c.onLaterite : variant === 'ink' ? c.ground : variant === 'danger' ? c.lateriteText : c.ink;
  return (
    <PressableScale
      onPress={loading ? undefined : onPress}
      disabled={disabled}
      hapticOnPress={variant === 'primary' ? 'tick' : null}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!loading }}
      style={[styles.base, compact && styles.compact, styles[variant], style]}
    >
      <View style={styles.row}>
        {glyph ? <Glyph name={glyph} color={fg} size={20} /> : null}
        <View style={styles.text}>
          <T kind="bodyMedium" color={fg}>
            {label}
          </T>
          {sub ? (
            <T kind="mono" color={filled ? fg : c.inkMuted} style={filled ? { opacity: 0.78 } : null}>
              {sub}
            </T>
          ) : null}
        </View>
        {loading ? <ActivityIndicator color={fg} /> : trailing ? <Glyph name={trailing} color={fg} size={18} /> : null}
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  base: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.sm, minHeight: 52 },
  compact: { minHeight: 44, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2 },
  primary: { backgroundColor: c.laterite },
  ink: { backgroundColor: c.ink },
  secondary: { borderWidth: 1, borderColor: c.ink, backgroundColor: 'transparent' },
  danger: { borderWidth: 1, borderColor: c.lateriteText, backgroundColor: 'transparent' },
  quiet: { backgroundColor: 'transparent', paddingHorizontal: 0 },
}));
