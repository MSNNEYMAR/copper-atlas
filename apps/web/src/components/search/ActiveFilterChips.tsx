/**
 * Copper Atlas — Active Filter Chips
 * 全局铜矿床图谱 — 活动筛选器标签
 *
 * Displays removable chips for each active filter.
 * Clicking "x" on a chip removes that specific filter.
 */

'use client';

import { useTranslations } from '@/lib/i18n';
import { type DepositStatus, useFilterStore } from '@/stores/filterStore';

export function ActiveFilterChips() {
  const t = useTranslations('filters');
  const {
    countryIsos,
    depositTypePaths,
    statuses,
    tonnageRange,
    gradeRange,
    searchQuery,
    resetFilters,
  } = useFilterStore();

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  // Country chips
  countryIsos.forEach((iso) => {
    chips.push({
      key: `country-${iso}`,
      label: iso.toUpperCase(),
      onRemove: () =>
        useFilterStore.setState({
          countryIsos: countryIsos.filter((c) => c !== iso),
        }),
    });
  });

  // Deposit type chips
  depositTypePaths.forEach((path) => {
    chips.push({
      key: `type-${path}`,
      label: path,
      onRemove: () =>
        useFilterStore.setState({
          depositTypePaths: depositTypePaths.filter((p) => p !== path),
        }),
    });
  });

  // Status chips
  statuses.forEach((s) => {
    chips.push({
      key: `status-${s}`,
      label: s,
      onRemove: () =>
        useFilterStore.setState({
          statuses: statuses.filter((x) => x !== s),
        }),
    });
  });

  // Tonnage range
  if (tonnageRange[0] > 0 || tonnageRange[1] < 200) {
    chips.push({
      key: 'tonnage',
      label: `${tonnageRange[0]}-${tonnageRange[1]} Mt`,
      onRemove: () => useFilterStore.setState({ tonnageRange: [0, 200] }),
    });
  }

  // Grade range
  if (gradeRange[0] > 0 || gradeRange[1] < 5) {
    chips.push({
      key: 'grade',
      label: `${gradeRange[0]}-${gradeRange[1]}%`,
      onRemove: () => useFilterStore.setState({ gradeRange: [0, 5] }),
    });
  }

  // Search
  if (searchQuery) {
    chips.push({
      key: 'search',
      label: `"${searchQuery}"`,
      onRemove: () => useFilterStore.setState({ searchQuery: '' }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className="text-xs text-gray-500">{t('activeFilters', { count: chips.length })}</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-x-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 border border-brand-200"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="text-brand-400 hover:text-brand-600 font-bold"
            aria-label={`Remove filter: ${chip.label}`}
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={resetFilters}
        className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
      >
        {t('clearAll')}
      </button>
    </div>
  );
}
