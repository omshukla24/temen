import { StyleSheet, Text, View } from 'react-native';

import { color, space, type } from '@/theme';

export default function Home() {
  return (
    <View style={styles.root}>
      <Text style={type.wordmark}>TEMEN</Text>
      <Text style={type.mono}>what the ground remembers</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: color.ground,
  },
});
