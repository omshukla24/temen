/**
 * A share from another app can arrive as temen://dataUrl=…; that is not a
 * route, so send it home, where the share-intent handler takes over.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes('dataUrl=')) return '/';
  return path;
}
