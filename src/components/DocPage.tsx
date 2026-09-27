import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, motion, space, useTheme } from '@/theme';

import { Hairline } from './Hairline';
import { Header } from './Header';
import { Screen } from './Screen';
import { T } from './T';

/** A reading page (About, Privacy, Terms, Help): a bar header and numbered sections. */
export function DocPage({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  return (
    <Screen seed={53}>
      <Header title={title} subtitle={eyebrow} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxxl }]}>{children}</ScrollView>
    </Screen>
  );
}

export function DocSection({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * motion.stagger).duration(motion.dur.ui)} style={styles.section}>
      <View style={styles.head}>
        <T kind="mono" color={c.accentText}>
          {String(index + 1).padStart(2, '0')}
        </T>
        <T kind="heading" style={styles.flex} accessibilityRole="header">
          {title}
        </T>
      </View>
      <Hairline />
      {children}
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  scroll: { paddingHorizontal: space.gutter, paddingTop: space.md, gap: space.xl },
  section: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  flex: { flex: 1 },
}));
