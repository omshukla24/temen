import { memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { placeLabel } from '@/features/placeLabel';
import { useAgo } from '@/features/places/useAgo';
import { useT } from '@/i18n';
import { CoreCylinder } from '@/setpieces/CoreCylinder';
import type { CoreSummary } from '@/state/reports';
import { makeStyles, motion, space, useTheme } from '@/theme';

import { Glyph } from './Glyph';
import { IconButton } from './IconButton';
import { PressableScale } from './PressableScale';
import { T } from './T';

export interface CoreSliverProps {
  core: CoreSummary;
  /** Opens the core, or toggles it while choosing. Gets the core's id so lists can pass one stable handler. */
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
  /** Shows the ⋯ button (hidden while choosing). */
  onMore?: (id: string) => void;
  /** Choosing cores to compare: the row shows a check circle instead of ⋯. */
  selecting?: boolean;
  selected?: boolean;
}

/**
 * One drilled place in a list: a thin sliver of its strata, the locality in the
 * stencil with the town in mono beneath, the headline, and when it was cored.
 */
export const CoreSliver = memo(function CoreSliver({ core, onPress, onLongPress, onMore, selecting = false, selected = false }: CoreSliverProps) {
  const { c } = useTheme();
  const { t, tl } = useT();
  const when = useAgo();
  const styles = useStyles();
  const label = placeLabel(core);
  const headline = tl(core.headline);
  const date = when(core.createdAt);
  const spoken = [label.title, label.subtitle, headline, date, core.saved ? t('places.savedMark') : null].filter(Boolean).join('. ');

  return (
    <View style={[styles.row, selected && styles.rowOn]}>
      <PressableScale
        onPress={() => onPress(core.id)}
        onLongPress={onLongPress ? () => onLongPress(core.id) : undefined}
        scaleTo={0.985}
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityLabel={spoken}
        accessibilityHint={selecting ? t('places.chooseHint') : t('places.openHint')}
        style={styles.main}
      >
        <View style={styles.inner}>
          <CoreCylinder width={22} height={64} bands={core.bands} tilt={0.22} />
          <View style={styles.text}>
            <View style={styles.top}>
              <T kind="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.title}>
                {label.title}
              </T>
              {core.saved ? <Glyph name="saved" size={14} color={c.accentText} /> : null}
              <T kind="mono" numberOfLines={1} style={styles.small}>
                {date}
              </T>
            </View>
            {label.subtitle ? (
              <T kind="mono" numberOfLines={1} style={styles.small}>
                {label.subtitle}
              </T>
            ) : null}
            <T kind="small" color={c.ink} numberOfLines={2} style={styles.headline}>
              {headline}
            </T>
          </View>
          {selecting ? <CheckMark on={selected} /> : null}
        </View>
      </PressableScale>
      {!selecting && onMore ? (
        <Animated.View entering={FadeIn.duration(motion.dur.fade)}>
          <IconButton glyph="more" label={t('places.more', { place: label.title })} onPress={() => onMore(core.id)} color={c.inkMuted} />
        </Animated.View>
      ) : null}
    </View>
  );
});

function CheckMark({ on }: { on: boolean }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Animated.View entering={FadeIn.duration(motion.dur.fade)} style={[styles.check, on && styles.checkOn]}>
      {on ? (
        <Animated.View entering={ZoomIn.duration(motion.dur.micro)}>
          <Glyph name="check" size={14} color={c.onAccent} weight={2.2} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.gutter, paddingRight: space.sm },
  rowOn: { backgroundColor: c.groundDeep },
  main: { flex: 1, paddingVertical: space.md },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingRight: space.sm },
  text: { flex: 1, minWidth: 0, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, minWidth: 0, fontSize: 27, lineHeight: 30 },
  // small mono sets its own tracking (the role's is sized for 10.5 pt)
  small: { fontSize: 9.5, lineHeight: 14, letterSpacing: 1.4 },
  headline: { marginTop: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: c.accent },
}));
