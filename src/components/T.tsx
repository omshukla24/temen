import { Text, type TextProps, type TextStyle } from 'react-native';

import { type TypeRole, color as palette, type as roles } from '@/theme';

export interface TProps extends TextProps {
  kind?: TypeRole;
  color?: string;
  align?: TextStyle['textAlign'];
  italic?: boolean;
}

/** Text in a type role from the design lock. Large display text caps font scaling so layouts hold. */
export function T({ kind = 'body', color, align, italic, style, maxFontSizeMultiplier, ...rest }: TProps) {
  const base = roles[kind];
  const isDisplay = kind === 'displayXl' || kind === 'display' || kind === 'title';
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (isDisplay ? 1.25 : 1.6)}
      style={[
        base,
        italic && kind !== 'mono' && { fontFamily: 'InstrumentSerif_400Regular_Italic' },
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

export const ink = palette.ink;
