import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';

import { toast } from '@/components/Toast';
import { useT } from '@/i18n';
import { openCheck } from '@/services/nav';
import { resolveShared } from '@/services/share-in';
import { haptic } from '@/theme';

/** A pin shared from WhatsApp or Maps opens straight into a check. */
export function ShareInHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const { t } = useT();
  const busy = useRef(false);
  useEffect(() => {
    if (!hasShareIntent || busy.current) return;
    const text = [shareIntent.text, shareIntent.webUrl, shareIntent.meta?.title].filter(Boolean).join('\n');
    busy.current = true;
    resolveShared(text)
      .then((r) => {
        if ('error' in r) {
          haptic.fail();
          toast(t('home.shareNone'), 'pin');
        } else openCheck(r);
      })
      .catch(() => {
        haptic.fail();
        toast(t('home.shareNone'), 'pin');
      })
      .finally(() => {
        busy.current = false;
        resetShareIntent();
      });
  }, [hasShareIntent, shareIntent, resetShareIntent, t]);
  return null;
}
