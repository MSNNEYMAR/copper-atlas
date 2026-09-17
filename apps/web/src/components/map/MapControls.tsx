'use client';

import { useUIStore } from '@/stores/uiStore';

export function MapControls() {
  const { toggleLegend, legendOpen, toggleSearchPanel, searchPanelOpen } = useUIStore();

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-y-1">
      {/* Toggle search panel */}
      <button
        onClick={toggleSearchPanel}
        className="rounded-md bg-white/95 backdrop-blur shadow border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        type="button"
        aria-label={searchPanelOpen ? 'Hide search panel' : 'Show search panel'}
      >
        {searchPanelOpen ? '◀ Hide' : '▶ Search'}
      </button>

      {/* Toggle legend */}
      <button
        onClick={toggleLegend}
        className="rounded-md bg-white/95 backdrop-blur shadow border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        type="button"
        aria-label={legendOpen ? 'Hide legend' : 'Show legend'}
      >
        {legendOpen ? '◀ Legend' : '▶ Legend'}
      </button>

      {/* Basemap switcher — Phase 1 Week 3-5 */}
    </div>
  );
}
