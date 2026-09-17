/**
 * Copper Atlas — Map State Store (Zustand)
 * 全局铜矿床图谱 — 地图状态管理
 *
 * Tracks map viewport, selected deposit, and layer visibility.
 * NOT persisted — map state resets on page reload.
 */

import { create } from 'zustand';

export type BasemapLayer = 'osm' | 'satellite' | 'terrain' | 'dark';

export interface Viewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface MapState {
  // Viewport
  viewport: Viewport;
  bbox: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]

  // Map readiness
  isMapLoaded: boolean;
  isMapError: boolean;

  // Active layers
  basemap: BasemapLayer;
  showGeologicalOverlay: boolean;
  showCountryBoundaries: boolean;

  // Selected deposit (for detail panel)
  selectedDepositId: string | null;

  // Actions
  setViewport: (viewport: Partial<Viewport>) => void;
  setBbox: (bbox: [number, number, number, number]) => void;
  setMapLoaded: (loaded: boolean) => void;
  setMapError: (error: boolean) => void;
  setBasemap: (basemap: BasemapLayer) => void;
  toggleGeologicalOverlay: () => void;
  toggleCountryBoundaries: () => void;
  selectDeposit: (id: string | null) => void;
}

export const useMapStore = create<MapState>()((set) => ({
  // Initial state
  viewport: {
    center: [0, 20], // Center between Americas and Africa/Asia copper belts
    zoom: 2.5,
    bearing: 0,
    pitch: 0,
  },
  bbox: null,
  isMapLoaded: false,
  isMapError: false,
  basemap: 'osm',
  showGeologicalOverlay: false,
  showCountryBoundaries: true,
  selectedDepositId: null,

  // Actions
  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),

  setBbox: (bbox) => set({ bbox }),

  setMapLoaded: (loaded) => set({ isMapLoaded: loaded, isMapError: loaded ? false : undefined }),

  setMapError: (error) => set({ isMapError: error }),

  setBasemap: (basemap) => set({ basemap }),

  toggleGeologicalOverlay: () =>
    set((state) => ({ showGeologicalOverlay: !state.showGeologicalOverlay })),

  toggleCountryBoundaries: () =>
    set((state) => ({ showCountryBoundaries: !state.showCountryBoundaries })),

  selectDeposit: (id) => set({ selectedDepositId: id }),
}));
