import { Canvas, ColorMatrix, Fill, Turbulence } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Limestone paper: 3% ink noise over the ground colour. Drawn once; it has no
 * animated inputs, so it costs a single frame.
 */
export const PaperGrain = memo(function PaperGrain({ opacity = 0.03 }: { opacity?: number }) {
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill>
        <Turbulence freqX={0.85} freqY={0.85} octaves={2} seed={7} />
        {/* ink-tinted noise; alpha = opacity · 2·luminance, so it averages `opacity` */}
        <ColorMatrix
          matrix={[
            0, 0, 0, 0, 0.11,
            0, 0, 0, 0, 0.106,
            0, 0, 0, 0, 0.098,
            (opacity * 2) / 3, (opacity * 2) / 3, (opacity * 2) / 3, 0, 0,
          ]}
        />
      </Fill>
    </Canvas>
  );
});
