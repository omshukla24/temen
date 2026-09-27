import { useCallback, useState } from 'react';

import { toast } from '@/components/Toast';
import { useT } from '@/i18n';
import { canSeeFull, FREE_STRATA, placeKey, useIsPro, useUnlocks } from '@/state/entitlements';
import { reports } from '@/state/reports';
import { haptic } from '@/theme';

import { shareCard } from './share';

/**
 * `share(id)` draws a stored core as a card and opens the share sheet, with
 * the strata this phone has paid for open and the rest sealed.
 */
export function useShareCard() {
  const isPro = useIsPro();
  const unlocks = useUnlocks();
  const { t, tl } = useT();
  const [busy, setBusy] = useState(false);

  const share = useCallback(
    async (id: string) => {
      const stored = reports.get(id);
      if (!stored) {
        toast(t('card.missing'));
        return;
      }
      const r = stored.report;
      const full = canSeeFull(placeKey(r.lat, r.lon), r.flags.relief, isPro, unlocks);
      setBusy(true);
      toast(t('card.making'), 'share');
      try {
        await shareCard(r, stored.trail ?? [], { full, freeStrata: FREE_STRATA, translate: tl, dialogTitle: t('card.dialog') });
      } catch {
        toast(t('card.fail'));
        haptic.fail();
      } finally {
        setBusy(false);
      }
    },
    [isPro, unlocks, t, tl],
  );

  return { share, busy };
}
