import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, space } from '@/theme';

import { Glyph } from './Glyph';
import { PressableScale } from './PressableScale';
import { T } from './T';

/** Header that renames per screen: GROUND / CHENNAI / KUBERAN NAGAR */
export function Breadcrumb({
  trail,
  index,
  right,
  onBack,
  tone = 'ink',
  back = true,
}: {
  trail: string[];
  index?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  tone?: 'ink' | 'paper';
  back?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const fg = tone === 'ink' ? color.ink : color.ground;
  const crumbs = trail.filter(Boolean).map((s) => s.toUpperCase());
  return (
    <View style={[styles.bar, { paddingTop: insets.top + space.sm }]} accessibilityRole="header">
      {back ? (
        <PressableScale
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Glyph name="back" color={fg} />
        </PressableScale>
      ) : null}
      <View style={styles.trail} accessibilityLabel={crumbs.join(', ')}>
        <T kind="mono" color={fg} numberOfLines={1} ellipsizeMode="head">
          {crumbs.join('  /  ')}
        </T>
      </View>
      {index ? (
        <T kind="mono" color={tone === 'ink' ? color.inkMuted : 'rgba(242,237,228,0.7)'}>
          {index}
        </T>
      ) : null}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.gutter - 8, paddingBottom: space.sm },
  back: { width: 44, height: 44, alignItems: 'center' },
  trail: { flex: 1 },
});
