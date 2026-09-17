/**
 * Copper Atlas — Interactive Map Page
 * 全局铜矿床图谱 — 交互式地图页面
 *
 * Client-side WebGL map. Wrapped in Suspense for useSearchParams compatibility.
 */

'use client';

import { DepositDetailPanel } from '@/components/deposit/DepositDetailPanel';
import { BasemapControl } from '@/components/map/BasemapControl';
import { MapControls } from '@/components/map/MapControls';
import { MapLegend } from '@/components/map/MapLegend';
import { SearchPanel } from '@/components/search/SearchPanel';
import { useUrlSync } from '@/hooks/useUrlSync';
import { useTranslations } from '@/lib/i18n';
import { useMapStore } from '@/stores/mapStore';
import { useUIStore } from '@/stores/uiStore';
import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy-load the MapContainer (heavy WebGL dependency, ~350KB)
const MapContainer = nextDynamic(
  () => import('@/components/map/MapContainer').then((mod) => ({ default: mod.MapContainer })),
  { ssr: false, loading: () => <MapLoadingSkeleton /> },
);

function MapLoadingSkeleton() {
  const t = useTranslations('map');
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="mt-4 text-gray-500">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapLoadingSkeleton />}>
      <MapPageContent />
    </Suspense>
  );
}

function MapPageContent() {
  const t = useTranslations('map');
  const { searchPanelOpen, detailPanelOpen, legendOpen } = useUIStore();
  const { isMapError } = useMapStore();
  useUrlSync();

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <MapContainer />
      </div>

      {isMapError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl text-center">
            <p className="text-red-600 font-semibold">{t('error')}</p>
            <p className="mt-2 text-sm text-gray-500">{t('noWebGL')}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <MapControls />
      <BasemapControl />
      {legendOpen && <MapLegend />}

      {searchPanelOpen && (
        <div className="absolute left-0 top-0 z-30 h-full w-[380px] animate-slide-in-left">
          <SearchPanel />
        </div>
      )}

      {detailPanelOpen && (
        <div className="absolute right-0 top-0 z-35 h-full w-[420px] animate-slide-in-right">
          <DepositDetailPanel />
        </div>
      )}

      <div aria-live="polite" className="sr-only" role="status" />
    </div>
  );
}
