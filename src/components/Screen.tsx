import { StyleSheet, View, type ViewStyle } from 'react-native';

import { color } from '@/theme';

import { PaperGrain } from './PaperGrain';

export function Screen({ children, style, grain = true }: { children: React.ReactNode; style?: ViewStyle; grain?: boolean }) {
  return (
    <View style={[styles.root, style]}>
      {grain ? <PaperGrain /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: color.ground } });
