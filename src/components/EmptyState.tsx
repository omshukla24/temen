import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { makeStyles, space, useTheme } from '@/theme';

import { Button } from './Button';
import { Glyph, type GlyphName } from './Glyph';
import { T } from './T';

/** Nothing here yet: a glyph, one line of title, one of help, and at most one action. */
export function EmptyState({
  glyph,
  title,
  body,
  action,
  onAction,
}: {
  glyph: GlyphName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.wrap}>
      <View style={styles.disc}>
        <Glyph name={glyph} size={26} color={c.inkMuted} />
      </View>
      <T kind="title" align="center">
        {title}
      </T>
      {body ? (
        <T kind="small" align="center" style={styles.body}>
          {body}
        </T>
      ) : null}
      {action && onAction ? <Button label={action} variant="secondary" compact onPress={onAction} style={styles.action} /> : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  disc: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  body: { maxWidth: 300 },
  action: { marginTop: space.md, alignSelf: 'center', minWidth: 180 },
}));
