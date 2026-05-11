import { useWindowDimensions } from 'react-native';

/** Horizontal padding for browse grids (matches screen padding). */
export const GRID_PAD = 16;
/** Gap between columns and rows. */
export const GRID_GAP = 12;
/** 1:1 — tile images are perfect squares (width ÷ height = 1). */
export const GRID_IMAGE_ASPECT = 1;

export function useGridTileWidth(): number {
  const { width } = useWindowDimensions();
  return Math.floor((width - GRID_PAD * 2 - GRID_GAP) / 2);
}
