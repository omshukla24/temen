import { useMemo } from 'react';

import type { CoreColors } from '@/setpieces/CoreDrawing';

import { useTheme } from './ThemeProvider';

/** The Core's ink, paper and band fills in the live light. */
export function useCoreColors(): CoreColors {
  const { c, fills } = useTheme();
  return useMemo(() => ({ ink: c.ink, inkMuted: c.inkMuted, paper: c.paper, laterite: c.laterite, fills }), [c, fills]);
}
