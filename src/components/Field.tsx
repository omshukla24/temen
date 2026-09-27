import { forwardRef } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { font, makeStyles, radius, size, space, useTheme } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';

export const Field = forwardRef<TextInput, TextInputProps & { glyph?: GlyphName | null; right?: React.ReactNode }>(function Field(
  { glyph = 'search', right, style, ...rest },
  ref,
) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      {glyph ? <Glyph name={glyph} size={18} color={c.inkMuted} /> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={c.inkMuted}
        selectionColor={c.lateriteText}
        cursorColor={c.lateriteText}
        underlineColorAndroid="transparent"
        keyboardAppearance={c.dark ? 'dark' : 'light'}
        style={[styles.input, style]}
        {...rest}
      />
      {right}
    </View>
  );
});

const useStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: c.dark ? c.line : c.ink,
    borderRadius: radius.sm,
    paddingLeft: space.md,
    paddingRight: space.xs,
    minHeight: 52,
    backgroundColor: c.paper,
  },
  input: { flex: 1, fontFamily: font.body, fontSize: size.body, color: c.ink, paddingVertical: space.md },
}));
