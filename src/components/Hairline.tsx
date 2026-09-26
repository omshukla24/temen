import { View, type ViewStyle } from 'react-native';

import { color } from '@/theme';

export function Hairline({ vertical, style, strong }: { vertical?: boolean; style?: ViewStyle; strong?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        vertical ? { width: 1, alignSelf: 'stretch' } : { height: 1, alignSelf: 'stretch' },
        { backgroundColor: strong ? color.ink : color.hairline },
        style,
      ]}
    />
  );
}
