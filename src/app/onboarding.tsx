import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Glyph, type GlyphName } from '@/components/Glyph';
import { Screen } from '@/components/Screen';
import { RegMarks, Staff } from '@/components/Staff';
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

/**
 * First run: three short pages and the location ask. The only place the
 * tagline is shown large. Every page keeps one key at the same spot at the
 * bottom; "Not now" on the last page sits where "Skip" was.
 */
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

  const last = page === PAGES - 1;
  return (
    <Screen seed={3} drift>
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <T kind="wordmark">TEMEN</T>
        {last ? (
          <Button label={t('onboard.locLater')} variant="quiet" compact onPress={finish} style={styles.skip} />
        ) : (
          <Button label={t('onboard.skip')} variant="quiet" compact onPress={() => go(PAGES - 1)} style={styles.skip} />
        )}
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
                <Animated.View entering={FadeIn.duration(motion.dur.corePull)} style={styles.coreWrap}>
                  <CoreCylinder width={96} height={250} bands={SAMPLE} tilt={0.2} />
                  <RegMarks inset={-18} />
                </Animated.View>
              ) : p.glyph ? (
                <View style={styles.window}>
                  <Glyph name={p.glyph} size={48} color={c.ink} weight={1.6} />
                  <View style={styles.windowMark} />
                  <RegMarks inset={-9} />
                </View>
              ) : null}
            </View>
            <T kind="mono" color={i === 0 ? c.accentText : c.inkMuted} style={styles.tagline}>
              {String(i + 1).padStart(2, '0')} / {String(PAGES).padStart(2, '0')}
              {i === 0 ? `  ·  ${t('tagline')}` : ''}
            </T>
            <Animated.View entering={FadeInDown.delay(120).duration(motion.dur.ui)}>
              <T kind="displayXl" accessibilityRole="header">
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
        <Staff ticks={40} />
        {last ? (
          <Button label={t('onboard.locAllow')} glyph="crosshair" onPress={allow} />
        ) : (
          <Button label={t('onboard.next')} trailing="arrow" onPress={() => go(page + 1)} />
        )}
      </View>
    </Screen>
  );
}

function Dot({ i, x }: { i: number; x: SharedValue<number> }) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(x.value - i));
    return { width: withSpring(10 + (1 - d) * 26, motion.spring.press), opacity: 0.4 + (1 - d) * 0.6 };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutter, minHeight: 52 },
  skip: { paddingHorizontal: space.md },
  page: { paddingHorizontal: space.gutter, justifyContent: 'flex-end', paddingBottom: space.xl, gap: space.md },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coreWrap: { padding: space.lg },
  window: { width: 132, height: 132, borderWidth: 1.5, borderColor: c.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper },
  windowMark: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, backgroundColor: c.accent, borderTopWidth: 1.5, borderColor: c.ink },
  tagline: { marginBottom: -space.xs },
  body: { maxWidth: 420 },
  bottom: { paddingHorizontal: space.gutter, gap: space.md },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, backgroundColor: c.accent, borderWidth: 1, borderColor: c.ink },
}));
