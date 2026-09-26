import type { GroundFlags } from 'ground-memory';

/** What to look at on the plot, from what the ground showed. */
export function checklist(f: GroundFlags | null): string[] {
  const items = [
    'Water marks or salt lines on the compound wall',
    'The drain in front of the plot: open, covered or silted?',
    'Is the plot lower than the road?',
    'Ask two neighbours how deep water got in the worst rain',
    "Match the deed's survey number to the plot on the ground",
  ];
  if (f?.lostWater || f?.seasonal) items.unshift('A lake bund, tank or marsh edge within sight', 'Soft black soil or construction debris underfoot');
  if (f?.bowl) items.unshift('Walk 100 m each way: does the street slope towards this plot?');
  if (f?.buffer) items.push('Pace out the distance to the water’s edge');
  if (f?.clayHeavy) items.push('Cracks in walls, floors and the compound wall');
  if (f?.bigQuake) items.push('Ask for the structural stability certificate');
  return items;
}
