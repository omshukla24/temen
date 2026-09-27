import { Children, Fragment, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { makeStyles, space, useTheme } from '@/theme';

import { Glyph, type GlyphName } from './Glyph';
import { Hairline } from './Hairline';
import { PressableScale } from './PressableScale';
import { T } from './T';

export interface ListRowProps {
  glyph?: GlyphName;
  title: string;
  subtitle?: string;
  /** Short value on the right in mono ("AUTO", "ENGLISH"). */
  value?: string;
  /** Anything else on the right (a Toggle, a ProBadge). */
  right?: ReactNode;
  onPress?: () => void;
  /** Chevron when pressable (default true). */
  chevron?: boolean;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  accessibilityHint?: string;
}

/** One settings-style row: glyph, title (+ subtitle), value or control, chevron. */
export function ListRow({ glyph, title, subtitle, value, right, onPress, chevron = true, tone = 'default', disabled, accessibilityHint }: ListRowProps) {
  const { c } = useTheme();
  const styles = useStyles();
  const fg = tone === 'danger' ? c.lateriteText : c.ink;
  const label = [title, subtitle, value].filter(Boolean).join(', ');
  const body = (
    <View style={styles.row}>
      {glyph ? <Glyph name={glyph} size={20} color={tone === 'danger' ? c.lateriteText : c.inkMuted} /> : null}
      <View style={styles.text}>
        <T kind="bodyMedium" color={fg}>
          {title}
        </T>
        {subtitle ? <T kind="caption">{subtitle}</T> : null}
      </View>
      {value ? (
        <T kind="mono" numberOfLines={1} style={styles.value}>
          {value}
        </T>
      ) : null}
      {right}
      {onPress && chevron ? <Glyph name="forward" size={16} color={c.inkMuted} /> : null}
    </View>
  );
  if (!onPress) return right ? body : <View accessible accessibilityLabel={label}>{body}</View>;
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.985} accessibilityLabel={label} accessibilityHint={accessibilityHint}>
      {body}
    </PressableScale>
  );
}

/** A labelled group of rows with hairlines between them. */
export function Section({ label, children, footer, style }: { label?: string; children: ReactNode; footer?: string; style?: ViewStyle }) {
  const { c } = useTheme();
  const styles = useStyles();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {label ? (
        <T kind="mono" color={c.ink} style={styles.label} accessibilityRole="header">
          {label}
        </T>
      ) : null}
      <Hairline />
      {items.map((child, i) => (
        <Fragment key={i}>
          {child}
          {i < items.length - 1 ? <Hairline /> : null}
        </Fragment>
      ))}
      <Hairline />
      {footer ? (
        <T kind="caption" style={styles.footer}>
          {footer}
        </T>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: 150, textAlign: 'right' },
  label: { marginBottom: space.sm },
  footer: { marginTop: space.sm },
}));
