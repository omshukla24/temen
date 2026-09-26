import { StyleSheet, View, type ViewStyle } from 'react-native';

import { color, radius, space } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';
import { PressableScale } from './PressableScale';
import { T } from './T';

type Variant = 'primary' | 'secondary' | 'quiet' | 'ink';

export function Button({
  label,
  sub,
  glyph,
  variant = 'primary',
  onPress,
  disabled,
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
  style?: ViewStyle;
  accessibilityHint?: string;
  trailing?: GlyphName;
}) {
  const fg = variant === 'primary' || variant === 'ink' ? color.ground : color.ink;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hapticOnPress={variant === 'primary' ? 'tick' : null}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityHint={accessibilityHint}
      style={[styles.base, styles[variant], style]}
    >
      <View style={styles.row}>
        {glyph ? <Glyph name={glyph} color={fg} size={20} /> : null}
        <View style={styles.text}>
          <T kind="bodyMedium" color={fg}>
            {label}
          </T>
          {sub ? (
            <T kind="mono" color={variant === 'primary' || variant === 'ink' ? 'rgba(242,237,228,0.75)' : color.inkMuted}>
              {sub}
            </T>
          ) : null}
        </View>
        {trailing ? <Glyph name={trailing} color={fg} size={18} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.sm, minHeight: 52 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1, gap: 2 },
  primary: { backgroundColor: color.laterite },
  ink: { backgroundColor: color.ink },
  secondary: { borderWidth: 1, borderColor: color.ink, backgroundColor: 'transparent' },
  quiet: { backgroundColor: 'transparent', paddingHorizontal: 0 },
});
