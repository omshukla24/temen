import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Glyph, type GlyphName } from '@/components/Glyph';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { useT } from '@/i18n';
import { permission } from '@/services/location';
import { CoreCylinder } from '@/setpieces/CoreCylinder';
import { updateSettings } from '@/state/settings';
import { haptic, makeStyles, motion, space, useTheme } from '@/theme';

const SAMPLE = [
  { hatch: 'lostWater', significance: 0.9, status: 'ok' },
  { hatch: 'ground', significance: 0.5, status: 'ok' },
  { hatch: 'rain', significance: 0.7, status: 'ok' },
  { hatch: 'quakes', significance: 0.25, status: 'ok' },
  { hatch: 'soil', significance: 0.4, status: 'ok' },
];

/** First run: three short pages and the location ask. The only place the tagline is shown large. */
export default function Onboarding() {
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const x = useSharedValue(0);
  const PAGES = 4;

  const finish = () => {
    updateSettings({ onboarded: true });
    // first run arrives by redirect (nothing beneath); a replay from Preferences goes back there
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const go = (i: number) => {
    haptic.tick();
    pager.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    x.value = e.nativeEvent.contentOffset.x / width;
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const allow = async () => {
    await permission().catch(() => null);
    finish();
  };

  const pages: { glyph?: GlyphName; title: string; body: string; hero?: 'core' }[] = [
    { hero: 'core', title: t('onboard.p1Title'), body: t('onboard.p1Body') },
    { glyph: 'share', title: t('onboard.p2Title'), body: t('onboard.p2Body') },
    { glyph: 'layers', title: t('onboard.p3Title'), body: t('onboard.p3Body') },
    { glyph: 'crosshair', title: t('onboard.locTitle'), body: t('onboard.locBody') },
  ];

  return (
    <Screen>
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <T kind="wordmark">TEMEN</T>
        {page < PAGES - 1 ? (
          <Button label={t('onboard.skip')} variant="quiet" compact onPress={() => go(PAGES - 1)} style={styles.skip} />
        ) : null}
      </View>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onEnd}
        style={styles.flex}
      >
        {pages.map((p, i) => (
          <View key={i} style={[styles.page, { width }]} accessibilityLabel={t('onboard.page', { n: i + 1, total: PAGES })}>
            <View style={styles.hero}>
              {p.hero === 'core' ? (
                <Animated.View entering={FadeIn.duration(motion.dur.corePull)}>
                  <CoreCylinder width={86} height={230} bands={SAMPLE} tilt={0.2} />
                </Animated.View>
              ) : p.glyph ? (
                <View style={styles.disc}>
                  <Glyph name={p.glyph} size={44} color={c.lateriteText} weight={1.4} />
                </View>
              ) : null}
            </View>
            {i === 0 ? (
              <T kind="monoWide" style={styles.tagline}>
                {t('tagline')}
              </T>
            ) : null}
            <Animated.View entering={FadeInDown.delay(120).duration(motion.dur.ui)}>
              <T kind="display" accessibilityRole="header">
                {p.title}
              </T>
            </Animated.View>
            <T kind="body" color={c.inkMuted} style={styles.body}>
              {p.body}
            </T>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {pages.map((_, i) => (
            <Dot key={i} i={i} x={x} />
          ))}
        </View>
        {page < PAGES - 1 ? (
          <Button label={t('onboard.next')} trailing="arrow" onPress={() => go(page + 1)} />
        ) : (
          <View style={styles.stack}>
            <Button label={t('onboard.locAllow')} glyph="crosshair" onPress={allow} />
            <Button label={t('onboard.locLater')} variant="quiet" onPress={finish} style={styles.later} />
          </View>
        )}
      </View>
    </Screen>
  );
}

function Dot({ i, x }: { i: number; x: SharedValue<number> }) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(x.value - i));
    return { width: withSpring(8 + (1 - d) * 16, motion.spring.press), opacity: 0.35 + (1 - d) * 0.65 };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutter, minHeight: 52 },
  skip: { paddingHorizontal: space.md },
  page: { paddingHorizontal: space.gutter, justifyContent: 'flex-end', paddingBottom: space.xl, gap: space.md },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  disc: { width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper },
  tagline: { color: c.lateriteText },
  body: { maxWidth: 420 },
  bottom: { paddingHorizontal: space.gutter, gap: space.lg },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 4, borderRadius: 2, backgroundColor: c.ink },
  stack: { gap: space.xs },
  later: { alignSelf: 'center', paddingHorizontal: space.lg },
}));
