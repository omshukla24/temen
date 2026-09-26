/**
 * The Rising. One texel of `mask` = one JRC satellite pixel (~30 m), drawn as a
 * crisp square so the resolution stays honest. Channels: r = water now,
 * g = water that is gone, b = seasonal/brief, a = any water since 1984.
 * Everything below the water-table line `level` fills; `drain` (0..1) empties
 * the memory back to what is water today.
 */
export const RISING_SKSL = `
uniform shader mask;
uniform float2 origin;
uniform float cell;
uniform float2 texSize;
uniform float level;
uniform float time;
uniform float drain;
uniform float4 lake;
uniform float4 memory;
uniform float still;

float caustic(float2 p, float t) {
  float2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + float2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(float2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}

half4 main(float2 pos) {
  float2 m = (pos - origin) / cell;
  if (m.x < 0.0 || m.y < 0.0 || m.x >= texSize.x || m.y >= texSize.y) { return half4(0.0); }
  half4 k = mask.eval(floor(m) + 0.5);
  if (k.a < 0.5 || pos.y < level) { return half4(0.0); }
  float isNow = step(0.5, k.r);
  float isLost = step(0.5, k.g);
  float show = max(isNow, 1.0 - drain);
  if (show <= 0.0) { return half4(0.0); }

  float3 col = mix(lake.rgb, memory.rgb, isLost);
  // classic tileable caustic wants a large offset; scale sets the cell of the light net
  float c = still > 0.5 ? 0.2 : caustic(pos * 0.045 - 250.0, time * 0.5 + 23.0);
  col += float3(c) * mix(0.55, 0.25, isLost);

  // lost water carries the dotted lake-memory hatch
  float2 d = fract(pos / 6.0) - 0.5;
  float dots = 1.0 - smoothstep(0.14, 0.24, length(d));
  col = mix(col, lake.rgb, dots * 0.4 * isLost);

  // a faint seam between satellite pixels
  float2 f = fract(m);
  float seam = max(step(f.x, 0.6 / cell), step(f.y, 0.6 / cell));
  col *= 1.0 - 0.1 * seam;

  float alpha = mix(0.82, 0.72, isLost) * show;
  return half4(half3(col) * alpha, alpha);
}
`;
