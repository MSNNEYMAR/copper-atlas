/**
 * Copper Atlas — Geological Age Filter
 * 全球铜矿床图谱 — 地质时代筛选器
 *
 * Allows filtering by mineralization age range in million years (Ma).
 * Uses dual range sliders with preset geological period buttons.
 */

'use client';

import { useTranslations } from '@/lib/i18n';
import { useFilterStore } from '@/stores/filterStore';

// Common geological age presets
const AGE_PRESETS = [
  { label: 'Cenozoic', labelZh: '新生代', range: [0, 66] as [number, number] },
  { label: 'Mesozoic', labelZh: '中生代', range: [66, 252] as [number, number] },
  { label: 'Paleozoic', labelZh: '古生代', range: [252, 539] as [number, number] },
  { label: 'Proterozoic', labelZh: '元古宙', range: [539, 2500] as [number, number] },
  { label: 'Archean', labelZh: '太古宙', range: [2500, 4031] as [number, number] },
];

export function GeologicalAgeFilter() {
  const t = useTranslations('filters');
  const ageRange = useFilterStore((s) => s.mineralizationAgeRange);

  const setAge = (range: [number, number] | null) => {
    useFilterStore.setState({ mineralizationAgeRange: range });
  };

  const isActive = (preset: [number, number]) =>
    ageRange !== null && ageRange[0] === preset[0] && ageRange[1] === preset[1];

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{t('geologicalAge')}</label>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1 mb-2">
        {AGE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setAge(isActive(preset.range) ? null : preset.range)}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
              isActive(preset.range)
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom range inputs */}
      {ageRange && (
        <div className="flex items-center gap-x-1.5">
          <input
            type="number"
            min={0}
            max={4500}
            value={ageRange[0]}
            onChange={(e) => setAge([Number(e.target.value), ageRange[1]])}
            className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-[11px] focus:border-brand-500 focus:outline-none"
          />
          <span className="text-[10px] text-gray-400">-</span>
          <input
            type="number"
            min={0}
            max={4500}
            value={ageRange[1]}
            onChange={(e) => setAge([ageRange[0], Number(e.target.value)])}
            className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-[11px] focus:border-brand-500 focus:outline-none"
          />
          <span className="text-[10px] text-gray-500">Ma</span>
          <button
            type="button"
            onClick={() => setAge(null)}
            className="text-[11px] text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
