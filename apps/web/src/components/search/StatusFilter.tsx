/**
 * Copper Atlas — Status Filter
 * 全局铜矿床图谱 — 状态筛选器
 *
 * Labels come from translateCode('status', ...) — auto-localized.
 */

'use client';

import { translateCode } from '@/lib/dictionary';
import { useLocale, useTranslations } from '@/lib/i18n';
import { type DepositStatus, useFilterStore } from '@/stores/filterStore';

const STATUS_COLORS: Record<string, string> = {
  production: 'bg-green-500',
  development: 'bg-blue-500',
  exploration: 'bg-purple-500',
  feasibility: 'bg-yellow-500',
  suspended: 'bg-red-500',
  closed: 'bg-gray-400',
  depleted: 'bg-gray-300',
  unknown: 'bg-gray-300',
};

const ALL_STATUSES: DepositStatus[] = [
  'production',
  'development',
  'exploration',
  'feasibility',
  'suspended',
  'closed',
  'depleted',
  'unknown',
];

export function StatusFilter() {
  const t = useTranslations('filters');
  const locale = useLocale();
  const statuses = useFilterStore((s) => s.statuses);

  const toggle = (s: DepositStatus) => {
    const next = statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s];
    useFilterStore.setState({ statuses: next });
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{t('status')}</label>
      <div className="flex flex-wrap gap-1.5">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={`inline-flex items-center gap-x-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              statuses.includes(s)
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${statuses.includes(s) ? 'bg-white' : STATUS_COLORS[s] || 'bg-gray-300'}`}
            />
            {translateCode('status', s, locale)}
          </button>
        ))}
      </div>
    </div>
  );
}
