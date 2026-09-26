import { Fill, FilterMode, ImageShader, MipmapMode, Shader, type SkImage, type SkRuntimeEffect, type Uniforms } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

/** Pure drawing: a full-rect fill with the Rising shader and the mask as its child. */
export function RisingDrawing({
  effect,
  image,
  uniforms,
}: {
  effect: SkRuntimeEffect;
  image: SkImage;
  uniforms: Uniforms | SharedValue<Uniforms>;
}) {
  return (
    <Fill>
      <Shader source={effect} uniforms={uniforms}>
        <ImageShader
          image={image}
          fit="none"
          rect={{ x: 0, y: 0, width: image.width(), height: image.height() }}
          tx="decal"
          ty="decal"
          sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
        />
      </Shader>
    </Fill>
  );
}
