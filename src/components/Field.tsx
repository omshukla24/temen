import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { color, font, radius, size, space } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';

export const Field = forwardRef<TextInput, TextInputProps & { glyph?: GlyphName; right?: React.ReactNode }>(function Field(
  { glyph = 'search', right, style, ...rest },
  ref,
) {
  return (
    <View style={styles.wrap}>
      <Glyph name={glyph} size={18} color={color.inkMuted} />
      <TextInput
        ref={ref}
        placeholderTextColor={color.inkMuted}
        selectionColor={color.laterite}
        cursorColor={color.laterite}
        underlineColorAndroid="transparent"
        style={[styles.input, style]}
        {...rest}
      />
      {right}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.ink,
    borderRadius: radius.sm,
    paddingLeft: space.md,
    paddingRight: space.xs,
    minHeight: 52,
    backgroundColor: color.paper,
  },
  input: { flex: 1, fontFamily: font.body, fontSize: size.body, color: color.ink, paddingVertical: space.md },
});
