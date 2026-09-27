import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Share, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { CoreSliver } from '@/components/CoreSliver';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { Hairline } from '@/components/Hairline';
import { Glyph } from '@/components/Glyph';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { PressableScale } from '@/components/PressableScale';
import { ProBadge } from '@/components/ProBadge';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { useShareCard } from '@/features/card/useShareCard';
import { MAX_COMPARE, MIN_COMPARE } from '@/features/compare/pick';
import { placeLabel } from '@/features/placeLabel';
import { SORTS, sortCores, staleUnsaved, visibleCores, type PlacesFilter, type PlacesSort } from '@/features/places/filter';
import { shareMessage } from '@/features/places/share';
import { useAgo } from '@/features/places/useAgo';
import { useFix } from '@/hooks/useFix';
import { useT } from '@/i18n';
import { syncNow, useAccount } from '@/services/account';
import { openSaved } from '@/services/nav';
import { useIsPro } from '@/state/entitlements';
import { reports, useCores, type CoreSummary } from '@/state/reports';
import { haptic, makeStyles, motion, space, useTheme } from '@/theme';

/**
 * Every core this phone has drilled: All | Saved | Flagged, a sort, a filter,
 * buttons on every row, and a select mode that compares 2–5 or deletes any number.
 */
export default function Places() {
  const params = useLocalSearchParams<{ tab?: string; pick?: string }>();
  const { t, tl } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const when = useAgo();
  const cores = useCores();
  const isPro = useIsPro();
  const acct = useAccount();
  const card = useShareCard();
  const [filter, setFilter] = useState<PlacesFilter>(params.tab === 'saved' ? 'saved' : 'all');
  const [sort, setSort] = useState<PlacesSort>('newest');
  const [q, setQ] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [menuFor, setMenuFor] = useState<CoreSummary | null>(null);
  const [asking, setAsking] = useState<CoreSummary | null>(null);
  const [bulk, setBulk] = useState<readonly string[] | null>(null);
  const [sorting, setSorting] = useState(false);
  const [options, setOptions] = useState(false);
  const fix = useFix(sort === 'nearest');
  const here = fix.status === 'ok' ? fix.fix : null;

  useEffect(() => {
    if (params.tab === 'saved') setFilter('saved');
    else if (params.tab === 'recent') setFilter('all');
  }, [params.tab]);

  // "Compare with…" from a check arrives with that core already chosen.
  useEffect(() => {
    if (!params.pick) return;
    setChoosing(true);
    setPicked([params.pick]);
    router.setParams({ pick: undefined });
  }, [params.pick]);

  useEffect(() => {
    if (sort === 'nearest' && (fix.status === 'off' || fix.status === 'denied')) toast(t('places.nearNoFix'), 'crosshair');
  }, [sort, fix.status, t]);

  const rows = useMemo(() => sortCores(visibleCores(cores, filter, q, tl), sort, here), [cores, filter, q, tl, sort, here]);
  const signedIn = acct.status === 'signedIn';
  const counts = useMemo(
    () => ({ all: cores.length, saved: cores.filter((x) => x.saved).length, flagged: visibleCores(cores, 'flagged', '').length }),
    [cores],
  );
  const oldIds = useMemo(() => staleUnsaved(cores, Date.now(), 30), [cores]);
  const unsavedIds = useMemo(() => cores.filter((x) => !x.saved).map((x) => x.id), [cores]);

  const onPress = useCallback(
    (id: string) => {
      if (!choosing) return openSaved(id);
      haptic.tick();
      setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    },
    [choosing],
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

  const canCompare = picked.length >= MIN_COMPARE && picked.length <= MAX_COMPARE;
  const compare = () => {
    router.push({ pathname: '/compare', params: { ids: picked.join(',') } });
    stopChoosing();
  };

  const toggleSaved = useCallback(
    (id: string) => {
      const core = cores.find((x) => x.id === id);
      if (!core) return;
      reports.setSaved(id, !core.saved);
      toast(core.saved ? t('places.unsavedToast') : t('places.savedToast'), core.saved ? 'save' : 'saved');
      haptic.success();
    },
    [cores, t],
  );
  const startCompare = useCallback((id: string) => {
    haptic.tick();
    setChoosing(true);
    setPicked([id]);
  }, []);
  const askDelete = useCallback((id: string) => setAsking(cores.find((x) => x.id === id) ?? null), [cores]);

  const share = async (core: CoreSummary) => {
    const label = placeLabel(core);
    try {
      await Share.share({ message: shareMessage({ ...label, headline: tl(core.headline), lat: core.lat, lon: core.lon, footer: t('places.shareBy') }) });
    } catch {
      toast(t('places.shareFail'));
    }
  };

  const removeMany = (ids: readonly string[]) => {
    for (const id of ids) reports.remove(id);
    toast(ids.length === 1 ? t('places.deletedToast') : t('places.deletedMany', { n: ids.length }), 'trash');
    haptic.warn();
    setBulk(null);
    stopChoosing();
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
  const sortName = (k: PlacesSort) => t(`places.sort.${k}` as 'places.sort.newest');

  return (
    <Screen seed={19}>
      <Header
        variant="large"
        title={t('tab.places')}
        eyebrow={choosing ? t('places.selected', { n: picked.length }) : count}
        right={
          cores.length ? (
            <View style={styles.headRight}>
              {!choosing ? <IconButton glyph="sort" label={t('places.sortBy')} onPress={() => setSorting(true)} /> : null}
              <IconButton
                glyph={choosing ? 'close' : 'check'}
                label={choosing ? t('places.stopSelect') : t('places.select')}
                onPress={choosing ? stopChoosing : () => setChoosing(true)}
              />
              {!choosing ? <IconButton glyph="more" label={t('places.options')} onPress={() => setOptions(true)} /> : null}
            </View>
          ) : null
        }
      />
      <View style={styles.controls}>
        <Segmented
          options={[
            { value: 'all', label: `${t('places.all')} ${counts.all}` },
            { value: 'saved', label: `${t('places.saved')} ${counts.saved}` },
            { value: 'flagged', label: `${t('places.flagged')} ${counts.flagged}` },
          ]}
          value={filter}
          onChange={setFilter}
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
        <View style={styles.metaRow}>
          <PressableScale onPress={() => setSorting(true)} accessibilityLabel={t('places.sortBy')} style={styles.sortLink}>
            <Glyph name="sort" size={14} color={c.inkMuted} />
            <T kind="mono" numberOfLines={1}>
              {t('places.sortedBy', { how: sortName(sort) })}
            </T>
          </PressableScale>
          {syncLine ? (
            <T kind="mono" numberOfLines={1} style={styles.flex} align="right">
              {syncLine}
            </T>
          ) : null}
        </View>
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
            <RefreshControl refreshing={acct.syncing} onRefresh={syncNow} colors={[c.ink]} progressBackgroundColor={c.accent} />
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
              actions={[
                { key: 'save', glyph: item.saved ? 'saved' : 'save', label: item.saved ? t('places.unsave') : t('places.save'), on: item.saved, onPress: toggleSaved },
                { key: 'card', glyph: 'card', label: t('places.card'), onPress: card.share },
                { key: 'compare', glyph: 'tray', label: t('places.compare'), onPress: startCompare },
                { key: 'delete', glyph: 'trash', label: t('places.delete'), danger: true, onPress: askDelete },
              ]}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          q ? (
            <EmptyState glyph="search" title={t('places.noMatchTitle')} body={t('places.noMatchBody', { q })} action={t('places.clearFilter')} onAction={() => setQ('')} />
          ) : filter === 'saved' ? (
            <EmptyState glyph="save" title={t('places.noSavedTitle')} body={t('places.noSavedBody')} />
          ) : filter === 'flagged' ? (
            <EmptyState glyph="check" title={t('places.noFlaggedTitle')} body={t('places.noFlaggedBody')} />
          ) : (
            <EmptyState glyph="drill" title={t('places.emptyTitle')} body={t('places.emptyBody')} action={t('places.goHome')} onAction={() => router.navigate('/')} />
          )
        }
      />

      {choosing ? (
        <Animated.View entering={FadeInDown.duration(motion.dur.ui)} exiting={FadeOutDown.duration(motion.dur.exit)} style={styles.compareBar}>
          <View style={styles.barHead}>
            <View style={styles.flex}>
              <View style={styles.compareTitle}>
                <T kind="bodyMedium">{t('places.selected', { n: picked.length })}</T>
                {!isPro ? <ProBadge variant="outline" /> : null}
              </View>
              <T kind="caption">{t('places.selectHint')}</T>
            </View>
            <Button
              label={picked.length === rows.length && rows.length ? t('places.selectNone') : t('places.selectAll')}
              variant="quiet"
              compact
              onPress={() => setPicked(picked.length === rows.length ? [] : rows.map((x) => x.id))}
            />
          </View>
          <View style={styles.barKeys}>
            <Button label={t('places.compare')} compact glyph="tray" disabled={!canCompare} onPress={compare} style={styles.flex} />
            <Button
              label={t('places.deleteN', { n: picked.length })}
              compact
              variant="danger"
              glyph="trash"
              disabled={!picked.length}
              onPress={() => setBulk(picked)}
              style={styles.flex}
            />
          </View>
        </Animated.View>
      ) : null}

      <Sheet visible={sorting} onClose={() => setSorting(false)} title={t('places.sortBy')}>
        <View>
          {SORTS.map((k, i) => (
            <View key={k}>
              {i ? <Hairline /> : null}
              <ListRow
                glyph={k === 'nearest' ? 'crosshair' : k === 'flags' ? 'layers' : k === 'name' ? 'edit' : 'clock'}
                title={sortName(k)}
                chevron={false}
                right={sort === k ? <Glyph name="check" size={18} color={c.accentText} weight={2.2} /> : undefined}
                onPress={() => {
                  haptic.tick();
                  setSort(k);
                  setSorting(false);
                }}
              />
            </View>
          ))}
        </View>
      </Sheet>

      <Sheet visible={options} onClose={() => setOptions(false)} title={t('places.options')}>
        <View>
          <ListRow
            glyph="check"
            title={t('places.select')}
            chevron={false}
            onPress={() => {
              setOptions(false);
              setChoosing(true);
            }}
          />
          <Hairline />
          <ListRow
            glyph="tray"
            title={t('places.compare')}
            right={!isPro ? <ProBadge variant="outline" /> : undefined}
            onPress={() => {
              setOptions(false);
              router.push('/compare');
            }}
          />
          <Hairline />
          <ListRow
            glyph="clock"
            title={t('places.clearOld')}
            subtitle={oldIds.length ? t('places.clearSub', { n: oldIds.length }) : t('places.clearNone')}
            tone="danger"
            chevron={false}
            disabled={!oldIds.length}
            onPress={() => {
              setOptions(false);
              setTimeout(() => setBulk(oldIds), motion.dur.exit + 40);
            }}
          />
          <Hairline />
          <ListRow
            glyph="trash"
            title={t('places.clearAll')}
            subtitle={unsavedIds.length ? t('places.clearSub', { n: unsavedIds.length }) : t('places.clearNone')}
            tone="danger"
            chevron={false}
            disabled={!unsavedIds.length}
            onPress={() => {
              setOptions(false);
              setTimeout(() => setBulk(unsavedIds), motion.dur.exit + 40);
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor ? placeLabel(menuFor).title : undefined}>
        {menuFor ? (
          <View>
            <ListRow
              glyph={menuFor.saved ? 'saved' : 'save'}
              title={menuFor.saved ? t('places.unsave') : t('places.save')}
              chevron={false}
              onPress={() => {
                toggleSaved(menuFor.id);
                setMenuFor(null);
              }}
            />
            <Hairline />
            <ListRow
              glyph="card"
              title={t('places.card')}
              chevron={false}
              onPress={() => {
                const id = menuFor.id;
                setMenuFor(null);
                card.share(id);
              }}
            />
            <Hairline />
            <ListRow
              glyph="share"
              title={t('places.shareText')}
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
                startCompare(menuFor.id);
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

      <Sheet visible={!!bulk} onClose={() => setBulk(null)}>
        {bulk ? (
          <Animated.View entering={FadeIn} style={styles.ask}>
            <T kind="title">{t('places.deleteManyAsk', { n: bulk.length })}</T>
            <T kind="small">{t('places.deleteBody')}</T>
            <Button label={t('places.deleteN', { n: bulk.length })} variant="danger" glyph="trash" onPress={() => removeMany(bulk)} />
            <Button label={t('common.cancel')} variant="quiet" onPress={() => setBulk(null)} />
          </Animated.View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1, minWidth: 0 },
  controls: { paddingHorizontal: space.gutter, paddingBottom: space.md, gap: space.md },
  headRight: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 28 },
  sortLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  barKeys: { flexDirection: 'row', gap: space.sm },
  list: { paddingBottom: 140, flexGrow: 1 },
  compareBar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.md,
    gap: space.sm,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.dark ? c.line : c.ink,
    borderRadius: 6,
    padding: space.md,
  },
  compareTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ask: { gap: space.md, paddingTop: space.sm },
}));
