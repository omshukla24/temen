import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Header } from '@/components/Header';
import { ListRow, Section } from '@/components/ListRow';
import { ProBadge } from '@/components/ProBadge';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { T } from '@/components/T';
import { toast } from '@/components/Toast';
import { useAgo } from '@/features/places/useAgo';
import { useT } from '@/i18n';
import { deleteAccount, setDisplayName, signOut, syncNow, useAccount } from '@/services/account';
import { openCustomerCenter, restore, storeMode } from '@/services/purchases';
import { useCredits, useIsPro } from '@/state/entitlements';
import { useSettings } from '@/state/settings';
import { haptic, makeStyles, motion, radius, space, useTheme } from '@/theme';

const enter = (i: number) => FadeInDown.delay(i * motion.stagger).duration(motion.dur.ui);

/** Who you are, what you have, how the app behaves, and the fine print — out of the way of the work screens. */
export default function Account() {
  const { t } = useT();
  const { c } = useTheme();
  const styles = useStyles();
  const when = useAgo();
  const acct = useAccount();
  const isPro = useIsPro();
  const credits = useCredits();
  const s = useSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const user = acct.user;
  const signedIn = acct.status === 'signedIn' && !!user;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const onRestore = async () => {
    setBusy('restore');
    const r = await restore();
    setBusy(null);
    if (!r.ok) {
      toast(r.message ?? t('common.error'));
      haptic.fail();
      return;
    }
    haptic.success();
    toast(r.pro ? t('settings.proRestored') : r.credits ? t('settings.creditsRestored', { n: r.credits }) : t('settings.noneFound'));
  };

  const onManage = async () => {
    if (!(await openCustomerCenter())) toast(t('settings.noStore', { mode: storeMode() }));
  };

  const onDelete = async () => {
    setBusy('delete');
    const r = await deleteAccount();
    setBusy(null);
    setConfirmDelete(false);
    if (r.ok) {
      haptic.warn();
      toast(t('account.deleted'));
    } else {
      haptic.fail();
      toast(r.message);
    }
  };

  const onSaveName = async () => {
    setBusy('name');
    const r = await setDisplayName(name);
    setBusy(null);
    if (r.ok) {
      setEditing(false);
      toast(t('account.nameSaved'), 'check');
    } else toast(r.message);
  };

  const appearance = t(`prefs.appearance.${s.appearance}` as 'prefs.appearance.auto');
  const syncValue = acct.syncing
    ? t('places.syncing')
    : acct.syncFailed
      ? t('places.syncPaused')
      : acct.syncedAt
        ? t('places.synced', { when: when(acct.syncedAt, true) })
        : t('places.notSynced');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Header variant="large" eyebrow={t('tab.account')} title={signedIn ? (user.name ?? t('account.signedInTitle')) : t('account.title')} subtitle={signedIn ? (user.email ?? undefined) : undefined} />

        <View style={styles.body}>
          {/* who */}
          {acct.status === 'signedOut' || acct.status === 'loading' ? (
            <Animated.View entering={enter(0)} style={styles.card}>
              <T kind="heading">{t('account.pitchTitle')}</T>
              <T kind="small">{t('account.pitchBody')}</T>
              <Button label={t('account.signIn')} glyph="user" onPress={() => router.push('/sign-in')} style={styles.cardBtn} />
            </Animated.View>
          ) : null}

          {signedIn ? (
            <Animated.View entering={enter(0)}>
              <Section label={t('account.you')}>
                <ListRow
                  glyph="edit"
                  title={t('account.name')}
                  value={user.name ?? t('account.addName')}
                  onPress={() => {
                    setName(user.name ?? '');
                    setEditing(true);
                  }}
                />
                <ListRow glyph="cloud" title={t('account.sync')} subtitle={syncValue} value={t('account.syncNow')} chevron={false} onPress={syncNow} />
              </Section>
            </Animated.View>
          ) : null}

          {/* membership */}
          <Animated.View entering={enter(1)}>
            <Section label={t('settings.membership')} footer={credits.length ? t('settings.credits', { n: credits.length }) : undefined}>
              <ListRow
                glyph="star"
                title={isPro ? t('account.proTitle') : t('account.freeTitle')}
                subtitle={isPro ? t('settings.proBody') : t('settings.freeBody')}
                right={isPro ? <ProBadge /> : undefined}
                chevron={!isPro}
                onPress={isPro ? undefined : () => router.push('/paywall')}
              />
              {isPro ? <ListRow glyph="sliders" title={t('settings.customerCenter')} onPress={onManage} /> : null}
              <ListRow glyph="refresh" title={t('settings.restore')} value={busy === 'restore' ? '…' : undefined} chevron={false} onPress={onRestore} disabled={busy === 'restore'} />
            </Section>
          </Animated.View>

          {/* how the app behaves */}
          <Animated.View entering={enter(2)}>
            <Section label={t('account.app')}>
              <ListRow glyph={c.dark ? 'moon' : 'sun'} title={t('prefs.title')} value={`${appearance} · ${s.lang === 'hi' ? 'हिन्दी' : 'EN'}`} onPress={() => router.push('/settings')} />
              <ListRow glyph="bell" title={t('watch.title')} right={!isPro ? <ProBadge variant="outline" /> : undefined} onPress={() => router.navigate('/watch')} />
            </Section>
          </Animated.View>

          {/* fine print lives here, not on the work screens */}
          <Animated.View entering={enter(3)}>
            <Section label={t('account.help')}>
              <ListRow glyph="help" title={t('about.help')} onPress={() => router.push('/about/help')} />
              <ListRow glyph="layers" title={t('about.sources')} onPress={() => router.push('/about/sources')} />
              <ListRow glyph="shield" title={t('about.privacy')} onPress={() => router.push('/about/privacy')} />
              <ListRow glyph="report" title={t('about.terms')} onPress={() => router.push('/about/terms')} />
              <ListRow glyph="info" title={t('about.title')} onPress={() => router.push('/about')} />
            </Section>
          </Animated.View>

          {signedIn ? (
            <Animated.View entering={enter(4)}>
              <Section>
                <ListRow
                  glyph="signOut"
                  title={t('account.signOut')}
                  chevron={false}
                  onPress={async () => {
                    await signOut();
                    toast(t('account.signedOut'));
                  }}
                />
                <ListRow glyph="trash" title={t('account.delete')} tone="danger" chevron={false} onPress={() => setConfirmDelete(true)} />
              </Section>
            </Animated.View>
          ) : null}

          <T kind="mono" align="center" style={styles.version}>
            TEMEN {version} · {storeMode() === 'off' ? 'NO STORE' : storeMode().toUpperCase()}
          </T>
        </View>
      </ScrollView>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <View style={styles.sheet}>
          <T kind="title">{t('account.deleteAsk')}</T>
          <T kind="small">{t('account.deleteBody')}</T>
          <Button label={t('account.deleteYes')} variant="danger" glyph="trash" loading={busy === 'delete'} onPress={onDelete} />
          <Button label={t('common.cancel')} variant="quiet" onPress={() => setConfirmDelete(false)} />
        </View>
      </Sheet>

      <Sheet visible={editing} onClose={() => setEditing(false)} title={t('account.name')}>
        <View style={styles.sheet}>
          <Field glyph="user" value={name} onChangeText={setName} placeholder={t('account.namePlaceholder')} autoFocus maxLength={80} returnKeyType="done" onSubmitEditing={onSaveName} />
          <Button label={t('common.done')} loading={busy === 'name'} onPress={onSaveName} />
        </View>
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  scroll: { paddingBottom: space.xxxl },
  body: { paddingHorizontal: space.gutter, gap: space.xl },
  card: { borderWidth: 1, borderColor: c.dark ? c.line : c.ink, borderRadius: radius.sm, padding: space.lg, gap: space.sm, backgroundColor: c.paper },
  cardBtn: { marginTop: space.sm },
  version: { marginTop: space.lg },
  sheet: { gap: space.md, paddingTop: space.sm },
}));
