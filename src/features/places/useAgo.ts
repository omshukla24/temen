import { useCallback } from 'react';

import { useT } from '@/i18n';

import { ago } from './ago';

/** `when(iso)` → "today", "3 days ago", "2026-07-02"; `when(iso, true)` adds "5 min ago". */
export function useAgo(): (iso: string | null | undefined, precise?: boolean) => string {
  const { t } = useT();
  return useCallback(
    (iso, precise = false) => {
      const a = ago(iso, Date.now(), precise);
      switch (a.kind) {
        case 'now':
          return t('places.now');
        case 'minutes':
          return t('places.minutes', { n: a.n });
        case 'hours':
          return t('places.hours', { n: a.n });
        case 'today':
          return t('places.today');
        case 'yesterday':
          return t('places.yesterday');
        case 'days':
          return t('places.days', { n: a.n });
        default:
          return a.date;
      }
    },
    [t],
  );
}
