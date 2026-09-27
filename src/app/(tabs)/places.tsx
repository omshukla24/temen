import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Share, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { CoreSliver } from '@/components/CoreSliver';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { Hairline } from '@/components/Hairline';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { ProBadge } from '@/components/ProBadge';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { MAX_COMPARE, MIN_COMPARE, toggleIn } from '@/features/compare/pick';
import { placeLabel } from '@/features/placeLabel';
import { visibleCores, type PlacesTab } from '@/features/places/filter';
import { shareMessage } from '@/features/places/share';
import { useAgo } from '@/features/places/useAgo';
import { useT } from '@/i18n';
import { syncNow, useAccount } from '@/services/account';
import { openSaved } from '@/services/nav';
import { useIsPro } from '@/state/entitlements';
import { reports, useCores, type CoreSummary } from '@/state/reports';
import { haptic, makeStyles, motion, space, useTheme } from '@/theme';

/** Every core this phone has drilled: Recent | Saved, a filter, and choosing cores to compare. */
export default function Places() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const { t, tl } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const when = useAgo();
  const cores = useCores();
  const isPro = useIsPro();
  const acct = useAccount();
  const [tab, setTab] = useState<PlacesTab>(params.tab === 'saved' ? 'saved' : 'recent');
  const [q, setQ] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [menuFor, setMenuFor] = useState<CoreSummary | null>(null);
  const [asking, setAsking] = useState<CoreSummary | null>(null);

  useEffect(() => {
    if (params.tab === 'saved' || params.tab === 'recent') setTab(params.tab);
  }, [params.tab]);

  const rows = useMemo(() => visibleCores(cores, tab, q, tl), [cores, tab, q, tl]);
  const signedIn = acct.status === 'signedIn';

  const onPress = useCallback(
    (id: string) => {
      if (!choosing) return openSaved(id);
      setPicked((p) => {
        const next = toggleIn(p, id);
        if (next === p) {
          toast(t('places.full'));
          haptic.fail();
        } else haptic.tick();
        return next;
      });
    },
    [choosing, t],
  );
  const onMore = useCallback((id: string) => setMenuFor(cores.find((x) => x.id === id) ?? null), [cores]);
  const onLongPress = useCallback(
    (id: string) => {
      if (choosing) return;
      haptic.tick();
      setChoosing(true);
      setPicked([id]);
    },
    [choosing],
  );

  const stopChoosing = () => {
    setChoosing(false);
    setPicked([]);
  };

  const compare = () => {
    router.push({ pathname: '/compare', params: { ids: picked.join(',') } });
    stopChoosing();
  };

  const share = async (core: CoreSummary) => {
    const label = placeLabel(core);
    try {
      await Share.share({ message: shareMessage({ ...label, headline: tl(core.headline), lat: core.lat, lon: core.lon, footer: t('places.shareBy') }) });
    } catch {
      toast(t('places.shareFail'));
    }
  };

  const syncLine = !signedIn
    ? null
    : acct.syncing
      ? t('places.syncing')
      : acct.syncFailed
        ? t('places.syncPaused')
        : acct.syncedAt
          ? t('places.synced', { when: when(acct.syncedAt, true) })
          : t('places.notSynced');

  const count = rows.length === 1 ? t('places.countOne') : t('places.count', { n: rows.length });

  return (
    <Screen>
      <Header
        variant="large"
        title={t('tab.places')}
        eyebrow={choosing ? t('places.chosen', { n: picked.length, max: MAX_COMPARE }) : count}
        right={
          cores.length > 1 ? (
            <IconButton
              glyph={choosing ? 'close' : 'tray'}
              label={choosing ? t('places.stopCompare') : t('places.startCompare')}
              onPress={choosing ? stopChoosing : () => setChoosing(true)}
            />
          ) : null
        }
      />
      <View style={styles.controls}>
        <Segmented
          options={[
            { value: 'recent', label: t('places.recent') },
            { value: 'saved', label: t('places.saved') },
          ]}
          value={tab}
          onChange={setTab}
          accessibilityLabel={t('places.tabs')}
        />
        {cores.length > 3 ? (
          <Field
            value={q}
            onChangeText={setQ}
            placeholder={t('places.filter')}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={t('places.filter')}
            right={q ? <IconButton glyph="close" size={18} color={c.inkMuted} label={t('places.clearFilter')} onPress={() => setQ('')} /> : null}
          />
        ) : null}
        {syncLine ? (
          <T kind="mono" numberOfLines={1}>
            {syncLine}
          </T>
        ) : null}
      </View>
      <Hairline />
      <FlatList
        data={rows}
        keyExtractor={(x) => x.id}
        ItemSeparatorComponent={Hairline}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        refreshControl={
          signedIn ? (
            <RefreshControl refreshing={acct.syncing} onRefresh={syncNow} colors={[c.laterite]} progressBackgroundColor={c.paper} />
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={index < 12 ? FadeInDown.delay(index * motion.stagger).duration(motion.dur.ui) : undefined} layout={LinearTransition}>
            <CoreSliver
              core={item}
              onPress={onPress}
              onLongPress={onLongPress}
              onMore={onMore}
              selecting={choosing}
              selected={picked.includes(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          q ? (
            <EmptyState glyph="search" title={t('places.noMatchTitle')} body={t('places.noMatchBody', { q })} action={t('places.clearFilter')} onAction={() => setQ('')} />
          ) : tab === 'saved' ? (
            <EmptyState glyph="save" title={t('places.noSavedTitle')} body={t('places.noSavedBody')} />
          ) : (
            <EmptyState glyph="drill" title={t('places.emptyTitle')} body={t('places.emptyBody')} action={t('places.goHome')} onAction={() => router.navigate('/')} />
          )
        }
      />

      {choosing ? (
        <Animated.View entering={FadeInDown.duration(motion.dur.ui)} exiting={FadeOutDown.duration(motion.dur.exit)} style={styles.compareBar}>
          <View style={styles.flex}>
            <View style={styles.compareTitle}>
              <T kind="bodyMedium">{t('places.compareN', { n: picked.length })}</T>
              {!isPro ? <ProBadge /> : null}
            </View>
            <T kind="caption">{picked.length < MIN_COMPARE ? t('places.pickMore') : t('places.choosing')}</T>
          </View>
          <Button label={t('places.compare')} compact glyph="tray" disabled={picked.length < MIN_COMPARE} onPress={compare} style={styles.compareBtn} />
        </Animated.View>
      ) : null}

      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? placeLabel(menuFor).title : undefined}>
        {menuFor ? (
          <View>
            <ListRow
              glyph={menuFor.saved ? 'saved' : 'save'}
              title={menuFor.saved ? t('places.unsave') : t('places.save')}
              chevron={false}
              onPress={() => {
                reports.setSaved(menuFor.id, !menuFor.saved);
                toast(menuFor.saved ? t('places.unsavedToast') : t('places.savedToast'), menuFor.saved ? 'save' : 'saved');
                haptic.success();
                setMenuFor(null);
              }}
            />
            <Hairline />
            <ListRow
              glyph="share"
              title={t('places.share')}
              chevron={false}
              onPress={() => {
                const core = menuFor;
                setMenuFor(null);
                share(core);
              }}
            />
            <Hairline />
            <ListRow
              glyph="tray"
              title={t('places.compare')}
              right={!isPro ? <ProBadge variant="outline" /> : undefined}
              chevron={false}
              onPress={() => {
                setChoosing(true);
                setPicked([menuFor.id]);
                setMenuFor(null);
              }}
            />
            <Hairline />
            <ListRow
              glyph="trash"
              title={t('places.delete')}
              tone="danger"
              chevron={false}
              onPress={() => {
                setAsking(menuFor);
                setMenuFor(null);
              }}
            />
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={!!asking} onClose={() => setAsking(null)}>
        {asking ? (
          <Animated.View entering={FadeIn} style={styles.ask}>
            <T kind="title">{t('places.deleteAsk', { place: placeLabel(asking).title })}</T>
            <T kind="small">{t('places.deleteBody')}</T>
            <Button
              label={t('places.deleteYes')}
              variant="danger"
              glyph="trash"
              onPress={() => {
                reports.remove(asking.id);
                toast(t('places.deletedToast'), 'trash');
                haptic.warn();
                setAsking(null);
              }}
            />
            <Button label={t('common.cancel')} variant="quiet" onPress={() => setAsking(null)} />
          </Animated.View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1, minWidth: 0 },
  controls: { paddingHorizontal: space.gutter, paddingBottom: space.md, gap: space.md },
  list: { paddingBottom: 140, flexGrow: 1 },
  compareBar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.dark ? c.line : c.ink,
    borderRadius: 6,
    padding: space.md,
  },
  compareTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  compareBtn: { minWidth: 124 },
  ask: { gap: space.md, paddingTop: space.sm },
}));
