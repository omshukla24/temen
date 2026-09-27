import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export function Hairline({ vertical, style, strong }: { vertical?: boolean; style?: ViewStyle; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        vertical ? { width: 1, alignSelf: 'stretch' } : { height: 1, alignSelf: 'stretch' },
        { backgroundColor: strong ? c.ink : c.hairline },
        style,
      ]}
    />
  );
}
