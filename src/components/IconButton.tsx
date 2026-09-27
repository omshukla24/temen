import { View, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  glyph: GlyphName;
  /** Screen-reader label; required because the button has no text. */
  label: string;
  onPress?: () => void;
  /** plain = bare glyph; veil = round ground-coloured disc for sitting on the map; solid = ink disc. */
  tone?: 'plain' | 'veil' | 'solid';
  color?: string;
  size?: number;
  /** Laterite dot in the corner (unread, active). */
  dot?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/** A 44 dp glyph button. */
export function IconButton({ glyph, label, onPress, tone = 'plain', color, size = 22, dot, disabled, style }: IconButtonProps) {
  const { c } = useTheme();
  const styles = useStyles();
  const fg = color ?? (tone === 'solid' ? c.ground : c.ink);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      scaleTo={0.9}
      style={[styles.base, tone === 'veil' && styles.veil, tone === 'solid' && styles.solid, style]}
    >
      <View style={styles.center}>
        <Glyph name={glyph} size={size} color={fg} />
        {dot ? <View style={styles.dot} /> : null}
      </View>
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  base: { width: 44, height: 44, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  veil: { backgroundColor: c.veil, borderWidth: 1.5, borderColor: c.ink },
  solid: { backgroundColor: c.ink },
  center: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: 4, backgroundColor: c.laterite, borderWidth: 1, borderColor: c.ground },
}));
