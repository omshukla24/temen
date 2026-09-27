import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Terrain } from './Terrain';

/**
 * Every screen stands on ground: the live paper with a terrain of contour
 * lines under it. `seed` picks the terrain (each area of the app has its own),
 * `drift` lets it wander slowly on the screens that are about arriving.
 */
export function Screen({
  children,
  style,
  terrain = true,
  seed,
  drift,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  terrain?: boolean;
  seed?: number;
  drift?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: c.ground, overflow: 'hidden' }, style]}>
      {terrain ? <Terrain seed={seed} drift={drift} /> : null}
      {children}
    </View>
  );
}
