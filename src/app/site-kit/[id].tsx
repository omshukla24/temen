import { CameraView, useCameraPermissions } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatHemisphere } from 'ground-memory';

import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Glyph } from '@/components/Glyph';
import { Hairline } from '@/components/Hairline';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { T } from '@/components/T';
import { checklist } from '@/features/sitekit/checklist';
import { useT } from '@/i18n';
import { currentFix } from '@/services/location';
import { loadKit, saveKit, type SiteKit } from '@/services/sitekit';
import { reports } from '@/state/reports';
import { color, haptic, space } from '@/theme';

export default function SiteKitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t, tl } = useT();
  const stored = reports.get(id);
  const [kit, setKit] = useState<SiteKit>(() => loadKit(id));
  const [camOpen, setCamOpen] = useState(false);
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [shooting, setShooting] = useState(false);
  const items = checklist(stored?.report.flags ?? null);
  const done = items.filter((i) => kit.checks[i]).length;

  const update = (k: SiteKit) => {
    setKit(k);
    saveKit(id, k);
  };

  const openCamera = async () => {
    if (!perm?.granted) {
      const r = await requestPerm();
      if (!r.granted) return;
    }
    setCamOpen(true);
  };

  const shoot = async () => {
    if (!cam.current || shooting) return;
    setShooting(true);
    try {
      const [pic, fix] = await Promise.all([cam.current.takePictureAsync({ quality: 0.55 }), currentFix(6000).catch(() => null)]);
      const dir = new Directory(Paths.document, 'sitekit', id);
      if (!dir.exists) dir.create({ intermediates: true });
      const dest = new File(dir, `${Date.now()}.jpg`);
      await new File(pic.uri).copy(dest);
      haptic.seat();
      update({
        ...kit,
        photos: [{ uri: dest.uri, lat: fix?.lat ?? null, lon: fix?.lon ?? null, accuracyM: fix?.accuracyM ?? null, at: new Date().toISOString(), note: '' }, ...kit.photos],
      });
      setCamOpen(false);
    } catch {
      haptic.fail();
    } finally {
      setShooting(false);
    }
  };

  return (
    <Screen>
      <Breadcrumb trail={[t('crumb.ground'), stored?.report.placeName ?? '', t('kit.title')]} index={`${done}/${items.length}`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: insets.bottom + space.xxl, gap: space.lg }}>
        <T kind="title">{t('kit.lede')}</T>
        <View>
          <Hairline strong />
          {items.map((item, i) => {
            const on = !!kit.checks[item];
            return (
              <View key={item}>
                <PressableScale
                  onPress={() => {
                    haptic.tick();
                    update({ ...kit, checks: { ...kit.checks, [item]: !on } });
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={tl(item)}
                  scaleTo={0.985}
                  style={{ paddingVertical: space.md }}
                >
                  <View style={styles.item}>
                    <T kind="mono" style={{ width: 24 }}>
                      {String(i + 1).padStart(2, '0')}
                    </T>
                    <T kind="body" style={{ flex: 1 }} color={on ? color.inkMuted : color.ink}>
                      {tl(item)}
                    </T>
                    <View style={[styles.box, on && styles.boxOn]}>{on ? <Glyph name="check" size={16} color={color.ground} weight={2} /> : null}</View>
                  </View>
                </PressableScale>
                <Hairline />
              </View>
            );
          })}
        </View>

        <Button label={t('kit.photo')} glyph="camera" onPress={openCamera} />
        {perm && !perm.granted && !perm.canAskAgain ? <T kind="small" color={color.laterite}>{t('kit.camera')}</T> : null}

        <View style={styles.grid}>
          {kit.photos.length === 0 ? <T kind="small">{t('kit.noPhotos')}</T> : null}
          {kit.photos.map((p) => (
            <Animated.View key={p.uri} entering={ZoomIn.springify().damping(18)} style={styles.photo}>
              <Image source={{ uri: p.uri }} style={styles.img} contentFit="cover" accessibilityLabel={t('kit.photoA11y')} />
              <T kind="mono" style={{ fontSize: 8 }} numberOfLines={2}>
                {p.lat != null && p.lon != null ? formatHemisphere(p.lat, p.lon, 5) : 'NO FIX'} · {p.at.slice(11, 16)}
              </T>
              <PressableScale
                accessibilityLabel={t('kit.delete')}
                style={styles.del}
                onPress={() => {
                  try {
                    new File(p.uri).delete();
                  } catch {
                    // already gone
                  }
                  update({ ...kit, photos: kit.photos.filter((x) => x.uri !== p.uri) });
                }}
              >
                <Glyph name="trash" size={16} color={color.ground} />
              </PressableScale>
            </Animated.View>
          ))}
        </View>
        <T kind="caption">{t('kit.stay')}</T>
      </ScrollView>

      <Modal visible={camOpen} animationType="slide" onRequestClose={() => setCamOpen(false)}>
        <View style={{ flex: 1, backgroundColor: color.ink }}>
          <CameraView ref={cam} style={{ flex: 1 }} facing="back" />
          <Animated.View entering={FadeIn} style={[styles.camBar, { paddingBottom: insets.bottom + space.lg }]}>
            <PressableScale accessibilityLabel={t('kit.closeCam')} onPress={() => setCamOpen(false)} style={styles.camBtn}>
              <Glyph name="close" color={color.ground} />
            </PressableScale>
            <PressableScale accessibilityLabel={t('kit.shoot')} onPress={shoot} disabled={shooting} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </PressableScale>
            <View style={styles.camBtn} />
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  box: { width: 24, height: 24, borderWidth: 1.5, borderColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.laterite, borderColor: color.laterite },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  photo: { width: '47%', gap: 4 },
  img: { width: '100%', aspectRatio: 1, borderWidth: 1, borderColor: color.ink },
  del: { position: 'absolute', right: 4, top: 4, width: 36, minHeight: 36, backgroundColor: 'rgba(28,27,25,0.6)', alignItems: 'center' },
  camBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: space.lg },
  camBtn: { width: 56, height: 56, alignItems: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: color.ground, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.laterite },
});
