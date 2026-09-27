import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button } from '@/components/Button';
import { Glyph, type GlyphName } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { ProBadge } from '@/components/ProBadge';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { useT } from '@/i18n';
import { buy, initPurchases, loadOffer, openStockPaywall, restore, spendCredit, trackPaywall, type Offer } from '@/services/purchases';
import { CoreCylinder } from '@/setpieces/CoreCylinder';
import { useCredits } from '@/state/entitlements';
import { reports } from '@/state/reports';
import { haptic, makeStyles, motion, radius, space, useTheme } from '@/theme';

type Choice = 'single' | 'annual' | 'monthly';

/** Monthly equivalent of an annual price, when the store gives numbers. */
function perMonth(p: PurchasesPackage | null): string | null {
  if (!p) return null;
  const m = p.product.price / 12;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: p.product.currencyCode, maximumFractionDigits: 0 }).format(m);
  } catch {
    return null;
  }
}

function saving(annual: PurchasesPackage | null, monthly: PurchasesPackage | null): number | null {
  if (!annual || !monthly || !monthly.product.price) return null;
  return Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);
}

export default function Paywall() {
  const { place, teaser, id } = useLocalSearchParams<{ place?: string; teaser?: string; id?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const credits = useCredits();
  const [offer, setOffer] = useState<Offer | null | 'loading' | 'off'>('loading');
  const [choice, setChoice] = useState<Choice>(place ? 'single' : 'annual');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const stored = id ? reports.get(id) : null;
  const bands =
    stored?.report.strata.map((s, i) => ({ hatch: s.hatch, significance: s.significance, status: i >= 2 && s.key !== 'cantSee' ? 'error' : s.status })) ?? [];

  useEffect(() => {
    if (initPurchases() === 'off') {
      setOffer('off');
      return;
    }
    loadOffer()
      .then((o) => {
        setOffer(o);
        if (o) trackPaywall(o.offering);
        if (o && !o.single && choice === 'single') setChoice('annual');
      })
      .catch(() => setOffer(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pkg = typeof offer === 'object' && offer ? offer[choice] : null;
  const done = () => {
    haptic.success();
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 650);
  };

  const purchase = async () => {
    if (!pkg) return;
    setBusy(true);
    setMsg(null);
    const r = await buy(pkg, choice === 'single' ? (place ?? null) : null);
    setBusy(false);
    if (r.ok) done();
    else if (!r.cancelled) {
      setMsg(r.message);
      haptic.fail();
    }
  };

  const onRestore = async () => {
    setBusy(true);
    const r = await restore();
    setBusy(false);
    if (!r.ok) setMsg(r.message ?? t('paywall.nothing'));
    else if (r.pro) done();
    else setMsg(r.credits ? t('paywall.creditsRestored', { n: r.credits }) : t('paywall.noneFound'));
  };

  const o = typeof offer === 'object' ? offer : null;
  const rows: { key: Choice; label: string; sub: string; p: PurchasesPackage | null; unit: string; badge?: string | null }[] = [
    { key: 'single', label: t('paywall.single'), sub: t('paywall.singleSub'), p: o?.single ?? null, unit: t('paywall.once') },
    {
      key: 'annual',
      label: t('paywall.annual'),
      sub: t('paywall.proSub'),
      p: o?.annual ?? null,
      unit: t('paywall.perYear'),
      badge: o
        ? [
            saving(o.annual, o.monthly) ? t('paywall.save', { n: saving(o.annual, o.monthly) ?? 0 }) : null,
            perMonth(o.annual) ? `${perMonth(o.annual)}${t('paywall.mo')}` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : null,
    },
    { key: 'monthly', label: t('paywall.monthly'), sub: t('paywall.proSub'), p: o?.monthly ?? null, unit: t('paywall.perMonth') },
  ];

  return (
    <Screen seed={31}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.top}>
          <IconButton glyph="close" label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          {place ? <T kind="mono">SEAL · {place}</T> : <ProBadge />}
        </View>

        <View style={styles.hero}>
          <View style={styles.heroText}>
            <T kind="displayXl">{place ? t('paywall.title') : t('paywall.proTitle')}</T>
            {teaser ? (
              <Animated.View entering={FadeInDown.duration(motion.dur.ui)} style={styles.teaser}>
                <T kind="title" italic color={c.accentText}>
                  {teaser}
                </T>
              </Animated.View>
            ) : null}
          </View>
          {bands.length ? <CoreCylinder width={44} height={150} bands={bands} tilt={0.2} /> : null}
        </View>

        {!place ? (
          <View style={styles.perks}>
            {PERKS.map((k, i) => (
              <Animated.View key={k.key} entering={FadeInDown.delay(i * motion.stagger).duration(motion.dur.ui)} style={styles.perk}>
                <View style={styles.perkIcon}>
                  <Glyph name={k.glyph} size={18} color={c.onAccent} />
                </View>
                <T kind="body" style={styles.flex}>
                  {t(k.key)}
                </T>
              </Animated.View>
            ))}
          </View>
        ) : null}

        <Hairline strong />

        {offer === 'loading' ? (
          <ActivityIndicator color={c.ink} style={styles.loading} />
        ) : offer === 'off' || offer === null ? (
          <View style={styles.none}>
            <T kind="heading">{t('paywall.noStore')}</T>
            <T kind="small">{offer === 'off' ? t('paywall.noStoreBody') : t('paywall.noProducts')}</T>
            {offer === null ? <Button label={t('paywall.stock')} variant="secondary" onPress={openStockPaywall} /> : null}
          </View>
        ) : (
          <Animated.View entering={FadeIn} accessibilityRole="radiogroup">
            {rows
              .filter((r) => r.key !== 'single' || !!place)
              .map((r) => (
                <View key={r.key}>
                  <PressableScale
                    onPress={() => {
                      haptic.tick();
                      setChoice(r.key);
                    }}
                    disabled={!r.p}
                    scaleTo={0.985}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: choice === r.key, disabled: !r.p }}
                    accessibilityLabel={`${r.label}, ${r.p?.product.priceString ?? t('paywall.unavailable')} ${r.unit.toLowerCase()}. ${r.sub}`}
                    style={[styles.row, choice === r.key && styles.rowOn]}
                  >
                    <View style={styles.rowInner}>
                      <View style={[styles.radio, choice === r.key && styles.radioOn]}>{choice === r.key ? <View style={styles.radioDot} /> : null}</View>
                      <View style={styles.rowText}>
                        <T kind="bodyMedium">{r.label}</T>
                        <T kind="caption">{r.sub}</T>
                        {r.badge ? (
                          <View style={styles.badge}>
                            <T kind="mono" color={c.onAccent} style={styles.badgeText}>
                              {r.badge}
                            </T>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.price}>
                        <T kind="title">{r.p?.product.priceString ?? '—'}</T>
                        <T kind="mono">{r.unit}</T>
                      </View>
                    </View>
                  </PressableScale>
                  <Hairline />
                </View>
              ))}
          </Animated.View>
        )}

        {o ? (
          <Button
            label={`${choice === 'single' ? t('paywall.buySingle') : t('paywall.buyPro')}${pkg ? ` · ${pkg.product.priceString}` : ''}`}
            glyph={choice === 'single' ? 'lock' : 'star'}
            loading={busy}
            onPress={purchase}
            disabled={busy || !pkg}
            style={styles.cta}
          />
        ) : null}
        {credits.length && place ? (
          <Button
            label={t('paywall.useCredit', { n: credits.length })}
            variant="secondary"
            glyph="check"
            style={styles.gapTop}
            onPress={() => spendCredit(place) && done()}
          />
        ) : null}
        {msg ? (
          <T kind="small" color={c.lateriteText} style={styles.gapTop} accessibilityLiveRegion="assertive">
            {msg}
          </T>
        ) : null}
        <Button label={t('paywall.restore')} variant="quiet" onPress={onRestore} disabled={busy} />

        <View style={styles.fine}>
          <T kind="caption">{t('paywall.free')}</T>
          <T kind="caption">{t('paywall.relief')}</T>
          <T kind="caption">
            {t('paywall.renew')}
            {process.env.EXPO_PUBLIC_RC_STORE !== 'galaxy' ? ` ${t('paywall.testBuild')}` : ''}
          </T>
        </View>
      </ScrollView>
    </Screen>
  );
}

const PERKS: { key: 'paywall.perkAll' | 'paywall.perkCompare' | 'paywall.perkWatch' | 'paywall.perkOffline'; glyph: GlyphName }[] = [
  { key: 'paywall.perkAll', glyph: 'report' },
  { key: 'paywall.perkCompare', glyph: 'tray' },
  { key: 'paywall.perkWatch', glyph: 'bell' },
  { key: 'paywall.perkOffline', glyph: 'cloud' },
];

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -space.md },
  hero: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-end', marginTop: space.md },
  heroText: { flex: 1, gap: space.sm },
  teaser: { borderLeftWidth: 3, borderLeftColor: c.accent, paddingLeft: space.md },
  perks: { gap: space.md, paddingVertical: space.sm },
  perk: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  perkIcon: { width: 32, height: 32, backgroundColor: c.accent, borderWidth: 1.5, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  loading: { marginVertical: space.xxl },
  none: { gap: space.md, paddingVertical: space.lg },
  row: { paddingVertical: space.md, paddingHorizontal: space.sm, marginHorizontal: -space.sm },
  rowOn: { backgroundColor: c.paper, borderLeftWidth: 4, borderLeftColor: c.accent },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 2 },
  price: { alignItems: 'flex-end' },
  radio: { width: 22, height: 22, borderRadius: 2, borderWidth: 1.5, borderColor: c.ink, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: c.accent },
  radioDot: { width: 8, height: 8, backgroundColor: c.onAccent },
  badge: { alignSelf: 'flex-start', backgroundColor: c.accent, borderWidth: 1, borderColor: c.ink, borderRadius: radius.none, paddingHorizontal: 8, paddingVertical: 1, marginTop: 4 },
  badgeText: { fontSize: 9, letterSpacing: 1.2 },
  cta: { marginTop: space.lg },
  gapTop: { marginTop: space.sm },
  fine: { gap: space.xs, marginTop: space.md },
}));
