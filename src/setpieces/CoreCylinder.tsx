import { Canvas, type Transforms3d } from '@shopify/react-native-skia';
import { memo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { CoreDrawing, coreGeometry, type Band } from './CoreDrawing';

export type { Band } from './CoreDrawing';

/** On-device core. `extrude` (0..1) grows it out of the ground for the Core Pull. */
export const CoreCylinder = memo(function CoreCylinder({
  width,
  height,
  bands,
  extrude,
  ghost = true,
  tilt = 0.16,
}: {
  width: number;
  height: number;
  bands: Band[];
  extrude?: SharedValue<number>;
  ghost?: boolean;
  tilt?: number;
}) {
  const g = coreGeometry(width, height, tilt, ghost);
  const transform = useDerivedValue<Transforms3d>(() => {
    const e = extrude ? extrude.value : 1;
    return [{ translateY: (1 - e) * (g.bottom - g.top) }, { scaleY: Math.max(0.001, e) }];
  });
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <CoreDrawing width={width} height={height} bands={bands} ghost={ghost} tilt={tilt} transform={transform} />
    </Canvas>
  );
});
