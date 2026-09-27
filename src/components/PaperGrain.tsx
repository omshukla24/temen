import { Canvas, ColorMatrix, Fill, Turbulence } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Paper: ~3% ink noise over the ground colour (dark ink on day paper, pale
 * ink on night paper). Drawn once; it has no animated inputs.
 */
export const PaperGrain = memo(function PaperGrain({ opacity }: { opacity?: number }) {
  const { dark } = useTheme();
  const a = opacity ?? (dark ? 0.035 : 0.03);
  const [r, g, b] = dark ? [0.925, 0.898, 0.847] : [0.11, 0.106, 0.098];
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Turbulence freqX={0.85} freqY={0.85} octaves={2} seed={7} />
        {/* ink-tinted noise; alpha = opacity · 2·luminance, so it averages `opacity` */}
        <ColorMatrix
          matrix={[
            0, 0, 0, 0, r,
            0, 0, 0, 0, g,
            0, 0, 0, 0, b,
            (a * 2) / 3, (a * 2) / 3, (a * 2) / 3, 0, 0,
          ]}
        />
      </Fill>
    </Canvas>
  );
});
