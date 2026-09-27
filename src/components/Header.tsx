import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { makeStyles, space, useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { T } from './T';

export interface HeaderProps {
  /** The big line: a locality ("Beta II") or the screen's name. */
  title?: string;
  /** The small line under it: the town ("Greater Noida") or context. */
  subtitle?: string;
  /** Mono label above the title (large variant only). */
  eyebrow?: string;
  /** Show the back button (default: true for bar/overlay, false for large). */
  back?: boolean;
  onBack?: () => void;
  /** IconButtons on the right. */
  right?: ReactNode;
  /**
   * bar = stack screens; overlay = sits on the map with a veil;
   * large = tab roots (eyebrow + display title, no back).
   */
  variant?: 'bar' | 'large' | 'overlay';
  style?: ViewStyle;
}

export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Screen header. Names are laid out as a place is spoken: the locality large
 * in the serif, the town small in mono beneath, so long names never crowd the
 * bar or run off it.
 */
export function Header({ title, subtitle, eyebrow, back, onBack, right, variant = 'bar', style }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();

  if (variant === 'large') {
    return (
      <View style={[styles.large, { paddingTop: insets.top + space.md }, style]}>
        <View style={styles.largeTop}>
          {back ? <IconButton glyph="back" label={t('common.back')} onPress={onBack ?? goBack} style={styles.backLarge} /> : null}
          <T kind="mono" color={c.ink} style={styles.flex} numberOfLines={1}>
            {eyebrow ?? ''}
          </T>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
        {title ? (
          <Animated.View entering={FadeIn.duration(260)}>
            <T kind="display" accessibilityRole="header" numberOfLines={2}>
              {title}
            </T>
          </Animated.View>
        ) : null}
        {subtitle ? <T kind="small">{subtitle}</T> : null}
      </View>
    );
  }

  const showBack = back ?? true;
  return (
    <View
      style={[styles.bar, variant === 'overlay' && styles.overlay, { paddingTop: insets.top + space.xs }, style]}
      accessibilityRole="header"
    >
      {showBack ? <IconButton glyph="back" label={t('common.back')} onPress={onBack ?? goBack} /> : <View style={styles.spacer} />}
      <View style={styles.titles} accessible accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}>
        {title ? (
          <T kind="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.title}>
            {title}
          </T>
        ) : null}
        {subtitle ? (
          <T kind="mono" numberOfLines={1} ellipsizeMode="tail" style={styles.subtitle}>
            {subtitle}
          </T>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingBottom: space.sm, minHeight: 56 },
  overlay: { backgroundColor: c.veil, borderBottomWidth: 1, borderBottomColor: c.hairline },
  spacer: { width: space.sm },
  titles: { flex: 1, minWidth: 0, paddingHorizontal: space.xs },
  title: { fontSize: 24, lineHeight: 29 },
  // small mono sets its own tracking (the role's is sized for 10.5 pt)
  subtitle: { fontSize: 9.5, lineHeight: 14, letterSpacing: 1.6 },
  right: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  large: { paddingHorizontal: space.gutter, paddingBottom: space.md, gap: space.xs },
  largeTop: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: space.sm },
  backLarge: { marginLeft: -space.md },
  flex: { flex: 1 },
}));
