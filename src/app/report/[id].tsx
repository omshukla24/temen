import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { HairlineProgress } from '@/components/HairlineProgress';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { useT } from '@/i18n';
import { makePdf, reportHtml, sharePdf } from '@/services/report';
import { loadKit } from '@/services/sitekit';
import { canSeeFull, placeKey, useIsPro, useUnlocks } from '@/state/entitlements';
import { reports } from '@/state/reports';
import { color, haptic, space } from '@/theme';

/** See the report before it goes out, then send it as a PDF (WhatsApp, mail, print). */
export default function Report() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const stored = reports.get(id);
  const isPro = useIsPro();
  const unlocks = useUnlocks();
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const allowed = stored ? canSeeFull(placeKey(stored.report.lat, stored.report.lon), stored.report.flags.relief, isPro, unlocks) : false;

  useEffect(() => {
    if (!stored || !allowed) return;
    reportHtml(stored.report, stored.trail, loadKit(id))
      .then(setHtml)
      .catch((e) => setErr(e instanceof Error ? e.message : t('report.buildFail')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, allowed]);

  const send = async () => {
    if (!stored || !html) return;
    setBusy(true);
    setErr(null);
    try {
      const uri = await makePdf(html, stored.report);
      haptic.success();
      await sharePdf(uri);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('report.pdfFail'));
      haptic.fail();
    } finally {
      setBusy(false);
    }
  };

  if (!stored) {
    return (
      <Screen>
        <Breadcrumb trail={[t('crumb.ground'), t('check.report')]} />
        <T kind="body" style={{ padding: space.gutter }}>
          {t('report.gone')}
        </T>
      </Screen>
    );
  }

  return (
    <Screen>
      <Breadcrumb trail={[t('crumb.ground'), stored.report.placeName ?? '', t('check.report')]} index="PDF" />
      <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: color.ink }}>
        {!allowed ? (
          <T kind="body" style={{ padding: space.gutter }}>
            {t('check.sealedBand')}
          </T>
        ) : html ? (
          <Animated.View entering={FadeIn} style={{ flex: 1 }}>
            <WebView source={{ html }} originWhitelist={['*']} style={{ flex: 1, backgroundColor: color.ground }} accessibilityLabel={t('report.preview')} />
          </Animated.View>
        ) : (
          <View style={styles.loading}>
            <T kind="mono" color={color.ink}>
              {t('report.sealing').toUpperCase()}
            </T>
            <HairlineProgress duration={2400} tint={color.laterite} />
          </View>
        )}
      </View>
      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        {err ? (
          <T kind="small" color={color.laterite}>
            {err}
          </T>
        ) : null}
        <Button label={busy ? t('report.sealingShort') : t('report.send')} sub={t('report.sendSub')} glyph="share" onPress={send} disabled={!html || busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { padding: space.gutter, gap: space.md },
  bar: { paddingHorizontal: space.gutter, paddingTop: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: color.ink, backgroundColor: color.ground },
});
