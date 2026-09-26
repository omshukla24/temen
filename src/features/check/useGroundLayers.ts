import { useEffect, useState } from 'react';

import { contourPaths, elevationGrid, waterMask, type ContourLine, type WaterMask } from 'ground-memory';

import { fetchTile } from '@/services/http';
import { tiles } from '@/services/ground';

/** The JRC mask around the pin for the Rising (97×97 satellite pixels, ~1.8 km). */
export function useWaterMask(lat: number, lon: number): WaterMask | null {
  const [mask, setMask] = useState<WaterMask | null>(null);
  useEffect(() => {
    let alive = true;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    waterMask(lat, lon, fetchTile, 48, tiles)
      .then((m) => alive && setMask(m))
      .catch(() => alive && setMask(null));
    return () => {
      alive = false;
    };
  }, [lat, lon]);
  return mask;
}

/** Contour lines of the ground around the pin, for Live Contours. */
export function useContours(lat: number, lon: number): ContourLine[] | null {
  const [lines, setLines] = useState<ContourLine[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    elevationGrid(lat, lon, fetchTile, 128, tiles)
      .then((g) => {
        if (!alive) return;
        // flat or empty terrain draws nothing rather than noise
        setLines(g.max - g.min < 0.5 ? [] : contourPaths(g).lines);
      })
      .catch(() => alive && setLines([]));
    return () => {
      alive = false;
    };
  }, [lat, lon]);
  return lines;
}
