/**
 * Copper Atlas — Range Slider Filters (Tonnage & Grade)
 * 全局铜矿床图谱 — 范围滑块筛选器
 */

'use client';

import { useTranslations } from '@/lib/i18n';

import { useFilterStore } from '@/stores/filterStore';

interface RangeFilterProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
  step?: number;
}

function RangeSlider({ label, unit, min, max, value, onChange, step = 0.1 }: RangeFilterProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-x-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => onChange([Number(e.target.value), value[1]])}
          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <span className="text-xs text-gray-400">-</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={(e) => onChange([value[0], Number(e.target.value)])}
          className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onChange([Number(e.target.value), value[1]])}
        className="mt-1 w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[1]}
        onChange={(e) => onChange([value[0], Number(e.target.value)])}
        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
      />
    </div>
  );
}

export function TonnageRangeFilter() {
  const t = useTranslations('filters');
  const range = useFilterStore((s) => s.tonnageRange);
  return (
    <RangeSlider
      label={`${t('tonnage')} (${t('minTonnage')} - ${t('maxTonnage')})`}
      unit="Mt"
      min={0}
      max={200}
      value={range}
      onChange={(v) => useFilterStore.setState({ tonnageRange: v })}
      step={1}
    />
  );
}

export function GradeRangeFilter() {
  const t = useTranslations('filters');
  const range = useFilterStore((s) => s.gradeRange);
  return (
    <RangeSlider
      label={`${t('grade')} (${t('minGrade')} - ${t('maxGrade')})`}
      unit="%"
      min={0}
      max={5}
      value={range}
      onChange={(v) => useFilterStore.setState({ gradeRange: v })}
      step={0.05}
    />
  );
}
