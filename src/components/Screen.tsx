import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { PaperGrain } from './PaperGrain';

export function Screen({ children, style, grain = true }: { children: React.ReactNode; style?: ViewStyle; grain?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: c.ground }, style]}>
      {grain ? <PaperGrain /> : null}
      {children}
    </View>
  );
}
