import { Text, type TextProps, type TextStyle } from 'react-native';

import { MUTED_ROLES, font, type TypeRole, type as roles, useTheme } from '@/theme';

export interface TProps extends TextProps {
  kind?: TypeRole;
  color?: string;
  align?: TextStyle['textAlign'];
  italic?: boolean;
}

/**
 * Text in a type role from the design lock, in the live palette's ink (muted
 * for small print and mono). Large display text caps font scaling so layouts hold.
 */
export function T({ kind = 'body', color, align, italic, style, maxFontSizeMultiplier, ...rest }: TProps) {
  const { c } = useTheme();
  const isDisplay = kind === 'hero' || kind === 'displayXl' || kind === 'display' || kind === 'title';
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (isDisplay ? 1.25 : 1.6)}
      style={[
        roles[kind],
        { color: color ?? (MUTED_ROLES.has(kind) ? c.inkMuted : c.ink) },
        // the second voice: the same family, lighter (there is no italic in an instrument's labels)
        italic && kind !== 'mono' && kind !== 'monoWide' ? { fontFamily: font.displayAlt } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
