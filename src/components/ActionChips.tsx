import { ActivityIndicator, ScrollView, View, type ViewStyle } from 'react-native';

import { makeStyles, space, stroke, useTheme } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';
import { PressableScale } from './PressableScale';
import { T } from './T';

export interface ActionChip {
  key: string;
  glyph: GlyphName;
  label: string;
  onPress: () => void;
  /** The yellow key: the one action this row leads with. */
  primary?: boolean;
  /** Laterite frame and label: deletes and other things that can't be undone. */
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
}

/**
 * A row of small square instrument keys, each a glyph and a mono label, that
 * scrolls sideways when it runs out of room. Pass `bleed` (the screen gutter)
 * to let it run to the screen's edges while its first key lines up with the text.
 */
export function ActionChips({ items, bleed = 0, style }: { items: ActionChip[]; bleed?: number; style?: ViewStyle }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ marginHorizontal: -bleed }, style]}
      contentContainerStyle={[styles.row, { paddingHorizontal: bleed }]}
      keyboardShouldPersistTaps="handled"
    >
      {items.map((a) => {
        const fg = a.primary ? c.onAccent : a.danger ? c.lateriteText : c.ink;
        return (
          <PressableScale
            key={a.key}
            onPress={a.onPress}
            disabled={a.disabled || a.busy}
            scaleTo={0.95}
            accessibilityLabel={a.label}
            style={[styles.chip, a.primary && styles.primary, a.danger && styles.danger, (a.disabled || a.busy) && styles.dim]}
          >
            <View style={styles.inner}>
              {a.busy ? <ActivityIndicator size="small" color={fg} /> : <Glyph name={a.glyph} size={17} color={fg} />}
              <T kind="mono" color={fg} numberOfLines={1}>
                {a.label.toUpperCase()}
              </T>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  row: { gap: space.sm, alignItems: 'center' },
  chip: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center', borderWidth: stroke.frame, borderColor: c.ink, backgroundColor: c.paper },
  primary: { backgroundColor: c.accent, borderColor: c.dark ? c.accent : c.ink },
  danger: { borderColor: c.lateriteText, backgroundColor: 'transparent' },
  dim: { opacity: 0.5 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
}));
