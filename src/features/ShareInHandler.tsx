import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { openCheck } from '@/services/nav';
import { resolveShared } from '@/services/share-in';
import { haptic } from '@/theme';

/** A pin shared from WhatsApp or Maps opens straight into a check. */
export function ShareInHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const busy = useRef(false);
  useEffect(() => {
    if (!hasShareIntent || busy.current) return;
    const text = [shareIntent.text, shareIntent.webUrl, shareIntent.meta?.title].filter(Boolean).join('\n');
    busy.current = true;
    resolveShared(text)
      .then((r) => {
        if ('error' in r) {
          haptic.fail();
          Alert.alert('No location found', r.error);
        } else openCheck(r);
      })
      .finally(() => {
        busy.current = false;
        resetShareIntent();
      });
  }, [hasShareIntent, shareIntent, resetShareIntent]);
  return null;
}
