import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useT } from '@/i18n';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme';

/** Home · Places · Watch · Account. The first launch goes through the introduction first. */
export default function TabsLayout() {
  const { t } = useT();
  const { c } = useTheme();
  const { onboarded } = useSettings();
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: c.ground } }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.home') }} />
      <Tabs.Screen name="places" options={{ title: t('tab.places') }} />
      <Tabs.Screen name="watch" options={{ title: t('tab.watch') }} />
      <Tabs.Screen name="account" options={{ title: t('tab.account') }} />
    </Tabs>
  );
}
