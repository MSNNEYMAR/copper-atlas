/**
 * Copper Atlas — Basemap Layer Switcher
 * 全局铜矿床图谱 — 底图切换器
 */

'use client';

import { useTranslations } from '@/lib/i18n';
import { type BasemapLayer, useMapStore } from '@/stores/mapStore';

const BASEMAPS: { id: BasemapLayer; icon: string }[] = [
  { id: 'osm', icon: '🗺' },
  { id: 'satellite', icon: '🛰' },
  { id: 'terrain', icon: '⛰' },
  { id: 'dark', icon: '🌙' },
];

export function BasemapControl() {
  const t = useTranslations('basemap');
  const { basemap, setBasemap } = useMapStore();

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-y-1">
      {BASEMAPS.map(({ id, icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setBasemap(id)}
          className={`rounded-md border px-2 py-1.5 text-center text-xs font-medium transition-colors backdrop-blur ${
            basemap === id
              ? 'border-brand-500 bg-white/95 text-brand-700 shadow'
              : 'border-gray-200 bg-white/80 text-gray-500 hover:bg-white/95 hover:border-gray-300'
          }`}
          title={t(id)}
          aria-label={t(id)}
          aria-pressed={basemap === id}
        >
          <span className="block text-sm">{icon}</span>
        </button>
      ))}
    </div>
  );
}
